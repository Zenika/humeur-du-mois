import * as functions from "firebase-functions";
import { firestore } from "firebase-admin";
import * as mailgun from "mailgun-js";
import { Config, isEnabled } from "./config";
import { isAlreadyExistsError } from "./already-exists";
import { DocumentSnapshot } from "firebase-functions/lib/providers/firestore";

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
  if (!isEnabled(config.features.emails)) {
    console.info("feature is disabled; aborting");
    return;
  }
  const { id, ref, data } = emailSnapshot;
  const queuedEmail = data()! as QueuedEmail;
  try {
    await db
      .collection("functions-locks")
      .doc("processEmail")
      .collection("locks")
      .doc(id)
      .create({ recordedAt: firestore.Timestamp.now() });
  } catch (err) {
    if (isAlreadyExistsError(err)) {
      console.info("email already sent; aborting");
      return;
    }
    throw err;
  }
  let sendResponse: mailgun.messages.SendResponse;
  try {
    sendResponse = await mailgunClient.messages().send({
      ...queuedEmail.message,
      to: config.features.emails.recipient_override || queuedEmail.message.to
    });
  } catch (err) {
    const retryRef = db.collection(EMAILS_TO_SEND_COLLECTION_NAME).doc();
    console.warn(`requeing ${id} as ${retryRef.id} after error:`, err);
    // no try/catch here, load fail
    await retryRef.create({
      ...queuedEmail,
      retryOf: ref,
      retriedAt: firestore.Timestamp.now()
    });
    return;
  }
  console.info("email sent: ", JSON.stringify(sendResponse));
  // no try/catch here, load fail
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
  .onCreate(processEmail);
