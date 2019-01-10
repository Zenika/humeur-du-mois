import * as functions from "firebase-functions";
import { firestore } from "firebase-admin";
import { DocumentSnapshot } from "firebase-functions/lib/providers/firestore";
import * as mailgun from "mailgun-js";
import { Config, onlyWhenEnabled } from "./config";
import { ensureCalledOnce } from "./ensure-called-once";
import {
  DocumentReference,
  CollectionReference
} from "@google-cloud/firestore";

const config = functions.config() as Config;
const mailgunClient = mailgun({
  domain: config.mailgun.domain,
  apiKey: config.mailgun.api_key,
  host: config.mailgun.host
});
const db = firestore();

export const EMAILS_TO_SEND_COLLECTION_NAME = "emails-to-send";
export const EMAILS_SENT_COLLECTION_NAME = "emails-sent";

export type QueuedEmail = {
  message: mailgun.messages.SendData;
  recordedAt: firestore.Timestamp;
};

export const enqueue = async (message: mailgun.messages.SendData) => {
  await db
    .collection(EMAILS_TO_SEND_COLLECTION_NAME)
    .add({ message, recordedAt: firestore.Timestamp.now() });
};

type Producer<T> = () => T;
type AsyncProducer<T> = () => Promise<T>;

const requeueIfFails = async <T>(
  snapshot: DocumentSnapshot,
  requeueRef: DocumentReference,
  fn: Producer<T> | AsyncProducer<T>
): Promise<T> => {
  try {
    return fn();
  } catch (err) {
    console.warn(
      `requeuing ${snapshot.id} as ${requeueRef.id} after error:`,
      err
    );
    await requeueRef.create({
      ...snapshot.data()!,
      retryOf: snapshot.ref,
      retriedAt: firestore.Timestamp.now()
    });
    throw err;
  }
};

type FirestoreTriggerHandler = (snapshot: DocumentSnapshot) => void;

const queueWorker = <T>(
  requeueCollection: CollectionReference,
  logCollection: CollectionReference,
  worker: (snapshot: DocumentSnapshot) => T
) => async (snapshot: DocumentSnapshot) => {
  const taskResponse = await requeueIfFails(
    snapshot,
    requeueCollection.doc(),
    () => worker(snapshot)
  );
  await logCollection.doc(snapshot.id).create({
    ref: snapshot.ref,
    processedAt: firestore.Timestamp.now(),
    taskResponse
  });
};

const processEmail = async (emailSnapshot: DocumentSnapshot) => {
  const { message } = emailSnapshot.data()! as QueuedEmail;
  const sendResponse = await mailgunClient.messages().send({
    ...message,
    to: config.features.emails.recipient_override || message.to
  });

  await emailSnapshot.ref.update({
    message: {
      ...message,
      html: ""
    }
  });
  console.info("email sent: ", JSON.stringify(sendResponse));
  return sendResponse;
};

export const processEmailQueue = functions.firestore
  .document(`${EMAILS_TO_SEND_COLLECTION_NAME}/{id}`)
  .onCreate(
    onlyWhenEnabled(
      config.features.emails,
      ensureCalledOnce(
        db,
        "process-email-queue",
        queueWorker(
          db.collection(EMAILS_TO_SEND_COLLECTION_NAME),
          db.collection(EMAILS_SENT_COLLECTION_NAME),
          processEmail
        )
      )
    )
  );
