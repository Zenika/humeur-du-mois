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

const processEmail = async (emailSnapshot: DocumentSnapshot) => {
  if (!isEnabled(config.features.emails)) {
    console.info("feature is disabled; aborting");
    return;
  }
  const { id, ref, data } = emailSnapshot;
  const queuedEmail = data()! as QueuedEmail;
  try {
    await db.runTransaction(async transaction => {
      transaction.create(db.collection(EMAILS_SENT_COLLECTION_NAME).doc(id), {
        ref,
        sentAt: firestore.Timestamp.now()
      });
      // transaction rolls back if this fails
      await mailgunClient
        .messages()
        .send({
          ...queuedEmail.message,
          to:
            config.features.emails.recipient_override || queuedEmail.message.to
        });
    });
  } catch (err) {
    if (isAlreadyExistsError(err)) {
      console.info("email already sent; aborting");
    } else {
      const retryRef = db.collection(EMAILS_TO_SEND_COLLECTION_NAME).doc();
      console.warn(`requeing ${id} as ${retryRef.id} after error:`, err);
      try {
        await retryRef.create({
          ...queuedEmail,
          retryOf: ref,
          retriedAt: firestore.Timestamp.now()
        });
      } catch (err) {
        // last hope
        // this might blow the stack or make the function timeout
        // but at this point we might as well try
        await processEmail(emailSnapshot);
      }
    }
  }
};

export const processEmailQueue = functions.firestore
  .document(`${EMAILS_TO_SEND_COLLECTION_NAME}/{id}`)
  .onCreate(processEmail);
