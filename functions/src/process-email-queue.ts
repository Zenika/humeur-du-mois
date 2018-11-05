import * as functions from "firebase-functions";
import { firestore } from "firebase-admin";
import { DocumentSnapshot } from "firebase-functions/lib/providers/firestore";
import * as mailgun from "mailgun-js";
import { Config, isEnabled } from "./config";
import { ensureCalledOnce } from "./ensure-called-once";
import { whenEnabled } from "./when-enabled";

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

const processEmail = async (emailSnapshot: DocumentSnapshot) => {
  const { id, ref, data } = emailSnapshot;
  const queuedEmail = data()! as QueuedEmail;
  let sendResponse: mailgun.messages.SendResponse;
  try {
    sendResponse = await mailgunClient.messages().send({
      ...queuedEmail.message,
      to: config.features.emails.recipient_override || queuedEmail.message.to
    });
  } catch (err) {
    const retryRef = db.collection(EMAILS_TO_SEND_COLLECTION_NAME).doc();
    console.warn(`requeing ${id} as ${retryRef.id} after error:`, err);
    // no try/catch here, loud fail
    await retryRef.create({
      ...queuedEmail,
      retryOf: ref,
      retriedAt: firestore.Timestamp.now()
    });
    return;
  }
  console.info("email sent: ", JSON.stringify(sendResponse));
  // no try/catch here, loud fail
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
    whenEnabled(
      config.features.emails,
      ensureCalledOnce(db, "process-email-queue", processEmail)
    )
  );
