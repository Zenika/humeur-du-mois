import * as functions from "firebase-functions";
import { firestore } from "firebase-admin";
import { DocumentSnapshot } from "firebase-functions/lib/providers/firestore";
import * as mailgun from "mailgun-js";
import { Config, onlyWhenEnabled } from "./config";
import { ensureCalledOnce } from "./ensure-called-once";
import { DocumentReference } from "@google-cloud/firestore";

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
};

export const enqueue = async (message: mailgun.messages.SendData) => {
  await db.collection(EMAILS_TO_SEND_COLLECTION_NAME).add({ message });
};

type AsyncProducer<T> = () => Promise<T>;

const requeueIfFails = async <T>(
  snapshot: DocumentSnapshot,
  requeueRef: DocumentReference,
  fn: AsyncProducer<T>
): Promise<T> => {
  try {
    return fn();
  } catch (err) {
    console.warn(`requeuing ${snapshot.id} as ${requeueRef.id} after error:`, err);
    await requeueRef.create({
      ...snapshot.data()!,
      retryOf: snapshot.ref,
      retriedAt: firestore.Timestamp.now()
    });
    throw err;
  }
};

const processEmail = async (emailSnapshot: DocumentSnapshot) => {
  const { id, ref, data } = emailSnapshot;
  const queuedEmail = data()! as QueuedEmail;
  const sendResponse = await requeueIfFails(
    emailSnapshot,
    db.collection(EMAILS_TO_SEND_COLLECTION_NAME).doc(),
    () =>
      mailgunClient.messages().send({
        ...queuedEmail.message,
        to: config.features.emails.recipient_override || queuedEmail.message.to
      })
  );
  console.info("email sent: ", JSON.stringify(sendResponse));
  await db
    .collection(EMAILS_SENT_COLLECTION_NAME)
    .doc(id)
    .create({
      ref,
      sentAt: firestore.Timestamp.now(),
      sendResponse
    });
};

export const processEmailQueue = functions.firestore
  .document(`${EMAILS_TO_SEND_COLLECTION_NAME}/{id}`)
  .onCreate(
    onlyWhenEnabled(
      config.features.emails,
      ensureCalledOnce(db, "process-email-queue", processEmail)
    )
  );
