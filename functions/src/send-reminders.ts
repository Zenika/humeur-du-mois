import * as functions from "firebase-functions";
import { firestore } from "firebase-admin";
import * as mailgun from "mailgun-js";
import { Tick } from "./save-ticks";
import { selectCampaign } from "./select-campaign";
import { Config, isEnabled, asNumber } from "./config";

const db = firestore();
const config = functions.config() as Config;
const mailgunClient = mailgun({
  domain: config.mailgun.domain,
  apiKey: config.mailgun.api_key
});

export const sendCampaignStartsReminder = functions.firestore
  .document("daily-tick/{tickId}")
  .onCreate(async tickSnapshot => {
    if (!isEnabled(config.features.reminders.voting_campaign_starts)) {
      console.warn("feature is disabled; aborting");
      return;
    }

    const tick = tickSnapshot.data()! as Tick;
    const tickDate = tick.emittedAt.toDate();
    const campaign = selectCampaign(tickDate, {
      enabled: isEnabled(config.features.voting_campaigns),
      startOn: asNumber(config.features.voting_campaigns.start_on),
      endOn: asNumber(config.features.voting_campaigns.end_on)
    });
    if (!campaign) {
      console.warn("no campaign currently open; aborting");
      return;
    }

    const [campaignYear, campaignMonth] = campaign;
    const campaignId = new Date(Date.UTC(campaignYear, campaignMonth))
      .toISOString()
      .substr(0, 7);
    const reminderRef = db
      .collection("voting-campaign-starts-reminder")
      .doc(campaignId);

    const reminderAlreadySent = await db.runTransaction(
      async transaction => {
        const reminderSnapshot = await transaction.get(reminderRef);
        if (reminderSnapshot.exists) {
          return true;
        } else {
          await transaction.create(reminderRef, {
            recordedAt: firestore.Timestamp.now(),
            createdBy: tickSnapshot.ref
          });
          return false;
        }
      }
    );

    if (reminderAlreadySent) {
      console.warn("reminder already sent; aborting");
      return;
    }

    const monthLongName = tickDate.toLocaleString("en-us", {
      month: "long"
    });

    const message = {
      from: "Humeur du mois <humeur-du-mois@zenika.com>",
      to: config.mailgun.recipient_override || "all@zenika.com",
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

    await reminderRef.update({
      message
    });

    await db.runTransaction(async transaction => {
      await mailgunClient.messages().send(message);
      transaction.update(reminderRef, { sentAt: firestore.Timestamp.now() });
    });
  });
