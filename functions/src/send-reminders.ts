import * as functions from "firebase-functions";
import { firestore } from "firebase-admin";
import { Tick } from "./save-ticks";
import { computeCurrentCampaign } from "./compute-current-campaign";
import { Config, isEnabled, asNumber, asBoolean } from "./config";
import { daysBeforeCampaignEnds } from "./days-before-campaign-ends";
import { enqueue } from "./process-email-queue";
import { Employee } from "./import-employees-from-alibeez";
import { CampaignInfo } from "./compute-current-campaign";
import {
  generateAndSaveRandomEmailToken,
  getOrGenerateRandomEmailToken
} from "./generate-random-email-token";
import {
  composeReminderEmailSender,
  composeReminderEmailAmpHtml,
  composeReminderEmailHtml,
  composeReminderEmailText
} from "./compose-reminder-email";

const db = firestore();
const config = functions.config() as Config;
const campaignConfig = {
  enabled: isEnabled(config.features.voting_campaigns),
  startOn: asNumber(config.features.voting_campaigns.start_on),
  endOn: asNumber(config.features.voting_campaigns.end_on)
};
const timeout = asNumber(config.features.reminders.timeout || "") || 60;

export const sendCampaignStartsReminder = functions
  .runWith({
    timeoutSeconds: timeout
  })
  .firestore.document("daily-tick/{tickId}")
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

    await sendCampaignReminder(campaign, false);
  });

export const sendCampaignEndsReminder = functions
  .runWith({
    timeoutSeconds: timeout
  })
  .firestore.document("daily-tick/{tickId}")
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

    await sendCampaignReminder(campaign, true);
  });

const sendCampaignReminder = async (
  campaign: CampaignInfo,
  endOfCampaign: boolean
) => {
  if (!campaign.open) return;

  const monthLongName = new Date(
    Date.UTC(campaign.year, campaign.month)
  ).toLocaleString("en-us", {
    month: "long"
  });
  const emailsOfEmployeesWhoAlreadyVoted = new Set();
  if (endOfCampaign) {
    (
      await db.collection("vote").where("campaign", "==", campaign.id).get()
    ).docs
      .map(voteSnapshot => voteSnapshot.data())
      .map(vote => vote.email)
      .forEach(email => emailsOfEmployeesWhoAlreadyVoted.add(email));
    console.info(
      `Found ${emailsOfEmployeesWhoAlreadyVoted.size} employees who already voted`
    );
  }

  const employeeDocumentRefs = await db.collection("employees").listDocuments();
  for (const employeeDocumentRef of employeeDocumentRefs) {
    const employeeDocument = await employeeDocumentRef.get();
    const employee = employeeDocument.data() as Employee;
    if (employee.disabled) {
      continue;
    }

    if (emailsOfEmployeesWhoAlreadyVoted.has(employee.email)) {
      continue;
    }

    const token = await getOrGenerateRandomEmailToken({
      type: "vote",
      employeeEmail: employee.email,
      campaignId: campaign.id
    });

    const message = {
      from: composeReminderEmailSender(),
      to: employee.email,
      subject: endOfCampaign
        ? `Humeur du mois is about to close for ${monthLongName}!`
        : `Humeur du mois is open for ${monthLongName}!`,
      html: composeReminderEmailHtml(employee),
      "amp-html": composeReminderEmailAmpHtml(employee, token)
    };

    await enqueue(message);
  }
};

const allowForceSendCampaignReminder = asBoolean(
  config.features.reminders.voting_campaign_starts.force.enabled
);

// this function is only meant to be used for test purposes or retry cases
export const forceSendCampaingReminder = functions
  .runWith({
    timeoutSeconds: timeout
  })
  .https.onRequest(async (req: functions.Request, res: functions.Response) => {
    if (!allowForceSendCampaignReminder) {
      res.status(401).send("KO");
      return;
    }
    const authorizationHeader = req.get("Authorization") || "";
    const keyIsCorrect =
      authorizationHeader ===
      `Bearer ${config.features.reminders.voting_campaign_starts.force.key}`;
    if (!keyIsCorrect) {
      console.error("Passed the wrong auth key, aborting");
      res.sendStatus(403);
      return;
    }
    const voteDate = new Date();
    const campaign = {
      open: true,
      year: voteDate.getUTCFullYear(),
      month: voteDate.getUTCMonth(),
      id: new Date(Date.UTC(voteDate.getUTCFullYear(), voteDate.getUTCMonth()))
        .toISOString()
        .substr(0, 7)
    };

    const { email, all } = req.query;
    if (email) {
      // Envoi un mail de vote à un seul employé en générant un nouveau token de vote
      const token = await generateAndSaveRandomEmailToken({
        type: "vote",
        employeeEmail: email,
        campaignId: campaign.id
      });

      const employeeRef = await db.collection("employees").doc(email).get();
      const employee = employeeRef.data() as Employee;

      const message = {
        from: composeReminderEmailSender(),
        to: email,
        subject: `Humeur du mois is opened!`,
        text: composeReminderEmailText(employee),
        "amp-html": composeReminderEmailAmpHtml(employee, token),
        html: composeReminderEmailHtml(employee)
      };

      await enqueue(message);
      res.status(200).send(`Send vote to ${email}`);
    } else if (all === "true") {
      // Envoi le mail à tous les employés
      await sendCampaignReminder(campaign, false);
      res.status(200).send("OK");
    } else {
      res
        .status(200)
        .send("Nothing to do. Either set 'email' or 'all' query params.");
    }
  });
