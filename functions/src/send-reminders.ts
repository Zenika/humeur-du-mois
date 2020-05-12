import * as functions from "firebase-functions";
import { firestore } from "firebase-admin";
import * as mailgun from "mailgun-js";
import { Tick } from "./save-ticks";
import { computeCurrentCampaign } from "./compute-current-campaign";
import { Config, isEnabled, asNumber } from "./config";
import { daysBeforeCampaignEnds } from "./days-before-campaign-ends";
import { enqueue } from "./process-email-queue";

const db = firestore();
const config = functions.config() as Config;
const linkToApp =
  config.features.reminders.app_link ||
  `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com`;
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

    const employeesWhoHaventVotedYet = retrieveEmployeesWhoHaventVotedYet(
      db,
      campaign.id
    );

    const message = {
      from: config.features.reminders.voting_campaign_starts.sender,
      to: config.features.reminders.voting_campaign_starts.recipient,
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

    await enqueue(message);
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

    const employeesWhoHaventVotedYet = await retrieveEmployeesWhoHaventVotedYet(
      db,
      campaign.id
    );
    const bccString = computeBccString(employeesWhoHaventVotedYet);

    const message = {
      from: config.features.reminders.voting_campaign_ends.sender,
      to: config.features.reminders.voting_campaign_ends.recipient,
      bcc: bccString,
      subject: `Humeur du mois is about to close for ${monthLongName}!`,
      html: `
        <p>Hi,</p>
        <p>
          If you haven't already, tell us how it's been for you this past month!
          Go to <a href="${linkToApp}">${linkToApp}</a>.
        </p>
        <p>See you soon!</p>
        `
    };

    await reminderRef.update({
      message
    });

    await enqueue(message);
  });

const retrieveEmployeesWhoHaventVotedYet = async (
  db: firestore.Firestore,
  campaignId: string
) => {
  const votesRegisteredOnCurrentCampaign = (
    await db.collection("vote").where("campaign", "==", campaignId).get()
  ).docs.map(voteSnapshot => voteSnapshot.data());
  const emailsOfEmployeesWhoAlreadyVoted = votesRegisteredOnCurrentCampaign.map(
    vote => vote.email
  );

  const employeesSnapShots = await Promise.all(
    (
      await db.collection("employees").listDocuments()
    ).map(employeeDocumentRef => employeeDocumentRef.get())
  );
  const employeesWhoHavetVotedYet = employeesSnapShots
    .map(employeeSnapShot => employeeSnapShot.data())
    .filter(
      employee =>
        employee && emailsOfEmployeesWhoAlreadyVoted.includes(employee.email)
    ) as firestore.DocumentData[]; // I can't get rid of the undefined even tho I check that employee isn't undefined so I have to do this
  console.info("employeesWhoHaventVotedYet", employeesWhoHavetVotedYet);
  return employeesWhoHavetVotedYet;
};

const computeBccString = (employeesWhoHaventVotedYet: firestore.DocumentData[]) =>
  employeesWhoHaventVotedYet.map(employee => employee.email).join(", ");
