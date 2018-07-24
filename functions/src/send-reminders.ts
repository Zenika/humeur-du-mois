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
      return;
    }

    const [campaignYear, campaignMonth] = campaign;
    const campaignId = new Date(Date.UTC(campaignYear, campaignMonth))
      .toISOString()
      .substr(0, 7);

    const campaignAlreadyExisted = await db.runTransaction(async transaction => {
      const campaignRef = db.collection("voting-campaign").doc(campaignId);
      const campaignSnapshot = await transaction.get(campaignRef);
      if (campaignSnapshot.exists) {
        return true;
      } else {
        await transaction.create(campaignRef, {
          recordedAt: firestore.Timestamp.now(),
          createdBy: tickSnapshot.ref
        });
        return false;
      }
    });

    if (campaignAlreadyExisted) {
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

    const reminderRef = await db
      .collection("voting-campaign-starts-reminders")
      .add({
        recordedAt: firestore.Timestamp.now(),
        votingCampaign: tickSnapshot.ref,
        message
      });

    await db.runTransaction(async transaction => {
      await mailgunClient.messages().send(message);
      transaction.update(reminderRef, { sentAt: firestore.Timestamp.now() });
    });
  });
