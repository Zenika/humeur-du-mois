import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";
import * as mailgun from "mailgun-js";

const db = firebase.firestore();
const config = functions.config();
const mailgunClient = mailgun({
  domain: config.mailgun.domain,
  apiKey: config.mailgun.apikey
});

export const sendEndOfMonthStartsReminder = functions.firestore
  .document("end-of-month-starts-tick/{tickId}")
  .onCreate(async tickSnapshot => {
    if (config.features.reminders.endofmonth.start !== "true") {
      console.warn(`Feature is disabled, aborting (features.reminders.endofmonth.start=${config.features.reminders.endofmonth.start}).`)
      return;
    }

    const tick = tickSnapshot.data();
    if (!tick) {
      throw new Error(
        "sendEndOfMonthStartsReminder was triggered but no tick was found"
      );
    }
    const tickEmissionDate = new Date(tick.emittedAt);
    const monthLongName = tickEmissionDate.toLocaleString("en-us", {
      month: "long"
    });

    const message = {
      from: "Humeur du mois <humeur-du-mois@zenika.com>",
      to: config.mailgun.recipientoverride || "all@zenika.com",
      subject: `Humeur du mois is open for ${monthLongName}!`,
      html: `
        <p>Hi,</p>
        <p>
          Tell us how it's been for you this past month!
          Go to https://humeur-du-mois.zenika.com.
        </p>
        <p>See you soon!</p>
        `
    };

    const reminderRef = await db
      .collection("end-of-month-starts-reminders")
      .add({
        at: new Date().toISOString(),
        tick: tickSnapshot.ref,
        message
      });

    await db.runTransaction(async transaction => {
      await mailgunClient.messages().send(message);
      transaction.update(reminderRef, { sentAt: new Date().toISOString() });
    });
  });
