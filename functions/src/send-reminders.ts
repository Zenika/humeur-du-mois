import * as functions from "firebase-functions";
import { firestore } from "firebase-admin";
import * as mailgun from "mailgun-js";
import { Tick } from "./save-ticks";
import { computeCurrentCampaign } from "./compute-current-campaign";
import { Config, isEnabled, asNumber } from "./config";
import { daysBeforeCampaignEnds } from "./days-before-campaign-ends";

const linkToApp = `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com`;
const db = firestore();
const config = functions.config() as Config;
const campaignConfig = {
  enabled: isEnabled(config.features.voting_campaigns),
  startOn: asNumber(config.features.voting_campaigns.start_on),
  endOn: asNumber(config.features.voting_campaigns.end_on)
};
const mailgunClient = mailgun({
  domain: config.mailgun.domain,
  apiKey: config.mailgun.api_key,
  host: config.mailgun.host
});

export const sendCampaignStartsReminder = functions.firestore
  .document("daily-tick/{tickId}")
  .onCreate(async tickSnapshot => {
    if (!isEnabled(config.features.reminders.voting_campaign_starts)) {
      console.info("feature is disabled; aborting");
      return;
    }

    const tick = tickSnapshot.data()! as Tick;
    const tickDate = tick.emittedAt.toDate();
    const campaign = computeCurrentCampaign(tickDate, campaignConfig);
    if (!campaign.open) {
      console.info("no campaign currently open; aborting");
      return;
    }

    const reminderRef = db
      .collection("voting-campaign-starts-reminder")
      .doc(campaign.id);

    const reminderAlreadySent = await db.runTransaction(async transaction => {
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
    });

    if (reminderAlreadySent) {
      console.info("reminder already sent; aborting");
      return;
    }

    const monthLongName = new Date(
      Date.UTC(campaign.year, campaign.month)
    ).toLocaleString("en-us", {
      month: "long"
    });

    const message = {
      from: config.features.reminders.voting_campaign_starts.sender,
      to:
        config.mailgun.recipient_override ||
        config.features.reminders.voting_campaign_starts.recipient,
      subject: `Humeur du mois is open for ${monthLongName}!`,
      html: `
        <p>Hi,</p>
        <p>
          Tell us how it's been for you this past month!
          Go to ${linkToApp}.
        </p>
        <p>See you soon!</p>
        `
    };

    await reminderRef.update({
      message
    });

    /**
     * This following has (or intends to have, at least) the following properties:
     * - failure to the send the email restarts the transaction
     * - failure to update the document restarts the transaction but does not send the email again
     */
    /**
     * FIXME: failure to send the email actually fails the transaction (and the function crashes)
     * See potential solution at https://github.com/Zenika/humeur-du-mois-2018/issues/4
     */
    let emailSent = false;
    await db.runTransaction(async transaction => {
      if (!emailSent) {
        await mailgunClient.messages().send(message);
        emailSent = true;
      }
      transaction.update(reminderRef, { sentAt: firestore.Timestamp.now() });
    });
  });

export const sendCampaignEndsReminder = functions.firestore
  .document("daily-tick/{tickId}")
  .onCreate(async tickSnapshot => {
    if (!isEnabled(config.features.reminders.voting_campaign_ends)) {
      console.info("feature is disabled; aborting");
      return;
    }

    const tick = tickSnapshot.data()! as Tick;
    const tickDate = tick.emittedAt.toDate();
    const campaign = computeCurrentCampaign(tickDate, campaignConfig);
    if (!campaign.open) {
      console.info("no campaign currently open; aborting");
      return;
    }

    const reminderRef = db
      .collection("voting-campaign-ends-reminder")
      .doc(campaign.id);

    const reminderDaysBefore = asNumber(
      config.features.reminders.voting_campaign_ends.days_before
    );
    if (daysBeforeCampaignEnds(tickDate, campaignConfig) > reminderDaysBefore) {
      console.info("it's not time to send this reminder yet; aborting");
      return;
    }

    const reminderAlreadySent = await db.runTransaction(async transaction => {
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
    });

    if (reminderAlreadySent) {
      console.info("reminder already sent; aborting");
      return;
    }

    const monthLongName = new Date(
      Date.UTC(campaign.year, campaign.month)
    ).toLocaleString("en-us", {
      month: "long"
    });

    const message = {
      from: config.features.reminders.voting_campaign_ends.sender,
      to:
        config.mailgun.recipient_override ||
        config.features.reminders.voting_campaign_ends.recipient,
      subject: `Humeur du mois is about to close for ${monthLongName}!`,
      html: `
        <p>Hi,</p>
        <p>
          If you haven't already, tell us how it's been for you this past month!
          Go to ${linkToApp}.
        </p>
        <p>See you soon!</p>
        `
    };

    await reminderRef.update({
      message
    });

    /**
     * This following has (or intends to have, at least) the following properties:
     * - failure to the send the email restarts the transaction
     * - failure to update the document restarts the transaction but does not send the email again
     */
    let emailSent = false;
    await db.runTransaction(async transaction => {
      if (!emailSent) {
        await mailgunClient.messages().send(message);
        emailSent = true;
      }
      transaction.update(reminderRef, { sentAt: firestore.Timestamp.now() });
    });
  });
