import * as functions from "firebase-functions";
import { firestore } from "firebase-admin";
import * as mailgun from "mailgun-js";
import { Tick } from "./save-ticks";
import { computeCurrentCampaign } from "./compute-current-campaign";
import { Config, isEnabled, asNumber } from "./config";
import { daysBeforeCampaignEnds } from "./days-before-campaign-ends";
import { enqueue } from "./process-email-queue";
import { Employee } from "./import-employees-from-alibeez";

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

const computeBccString = async (
  database: firestore.Firestore,
  campaignId: string
) => {
  const emailsOfEmployeesWhoAlreadyVoted = new Set(
    (
      await database
        .collection("vote")
        .where("campaign", "==", campaignId)
        .get()
    ).docs
      .map(voteSnapshot => voteSnapshot.data())
      .map(vote => vote.email)
  );
  console.info(
    `Found ${emailsOfEmployeesWhoAlreadyVoted.size} employees who already voted`
  );

  const employees = (
    await Promise.all(
      (
        await database.collection("employees").listDocuments()
      ).map(employeeDocumentRef => employeeDocumentRef.get())
    )
  ).map(employeeSnapshot => employeeSnapshot.data());
  console.info(`Found ${employees.length} employees`);

  const employeesWhoHaveNotVotedYet = employees.filter(
    employee =>
      employee && !emailsOfEmployeesWhoAlreadyVoted.has(employee.email)
  ) as firestore.DocumentData[]; // type isn't inferred correctly
  console.info(
    `Found ${employeesWhoHaveNotVotedYet.length} employees who haven't voted yet`
  );

  return employeesWhoHaveNotVotedYet.map(employee => employee.email).join(", ");
};

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

    const employeeDocumentRefs = await db
      .collection("employees")
      .listDocuments();
    for (const employeeDocumentRef of employeeDocumentRefs) {
      const employeeDocument = await employeeDocumentRef.get();
      const employee = employeeDocument.data() as Employee;
      const message = {
        from: config.features.reminders.voting_campaign_starts.sender,
        to: employee.email,
        subject: `Humeur du mois is open for ${monthLongName}!`,
        html: `
          <p>Hi ${employee.fullName},</p>
          <p>
            Tell us how it's been for you this past month!
            Go to <a href="${linkToApp}">${linkToApp}</a>.
          </p>
          <p>See you soon!</p>
          `,
        "amp-html": `
          <!doctype html>
          <html ⚡4email data-css-strict>
          <head>
            <meta charset="utf-8">
            <script async src="https://cdn.ampproject.org/v0.js"></script>
            <style amp4email-boilerplate>body{visibility:hidden}</style>
            <style amp-custom>
              h1 {
                margin: 1rem;
              }
            </style>
          </head>
          <body>
            <p>Hi ${employee.fullName},</p>
            <p>
              Tell us how it's been for you this past month!
              Go to <a href="${linkToApp}">${linkToApp}</a>.
            </p>
            <p>See you soon!</p>
            <p>This email uses AMP!</p>
          </body>
          </html>
        `
      };

      await enqueue(message);
    }

    // await reminderRef.update({
    //   message
    // });
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
      to: config.features.reminders.voting_campaign_ends.recipient || [],
      bcc: await computeBccString(db, campaign.id),
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
