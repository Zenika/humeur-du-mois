import * as functions from "firebase-functions";
import { firestore } from "firebase-admin";
import { asBoolean, Config } from "./config";
import { enqueue } from "./process-email-queue";
import { Employee } from "./import-employees-from-alibeez";
import { CampaignInfo } from "./compute-current-campaign";
import {
  generateAndSaveRandomEmailToken,
  getOrGenerateRandomEmailToken,
  TokenInfo
} from "./generate-random-email-token";
import { composeEmailSender } from "./compose-email-sender";
import {
  composeEmailVoteAmpHtml,
  composeEmailVoteHtml
} from "./compose-email-vote";

const db = firestore();
const config = functions.config() as Config;

export const sendEmailToEmployees = async (
  campaign: CampaignInfo,
  endOfCampaigns: boolean
) => {
  if (!campaign.open) return;

  const monthLongName = new Date(
    Date.UTC(campaign.year, campaign.month)
  ).toLocaleString("en-us", {
    month: "long"
  });
  const emailsOfEmployeesWhoAlreadyVoted = new Set();
  if (endOfCampaigns) {
    (
      await db.collection("vote").where("campaign", "==", campaign.id).get()
    ).docs
      .map(voteSnapshot => voteSnapshot.data())
      .map(vote => vote.email)
      .forEach(emailsOfEmployeesWhoAlreadyVoted.add);
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
      employeeEmail: employee.email,
      campaignId: campaign.id
    });

    const message = {
      from: composeEmailSender(),
      to: employee.email,
      subject: endOfCampaigns
        ? `Humeur du mois is about to close for ${monthLongName}!`
        : `Humeur du mois is open for ${monthLongName}!`,
      html: composeEmailVoteHtml(employee),
      "amp-html": composeEmailVoteAmpHtml(employee, token)
    };

    await enqueue(message);
  }
};

const allowSendEmailVote = asBoolean(config.features.allow_send_email_vote);

// Test, Send a new vote email always
export const sendEmailVote = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    if (!allowSendEmailVote) {
      res.status(401).send("KO");
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

    const email = req.query.email;
    if (!email) {
      // Envoi un mail de vote à un seul employé en générant un nouveau token de vote
      const token = await generateAndSaveRandomEmailToken({
        employeeEmail: email,
        campaignId: campaign.id
      });

      const employeeRef = await db.collection("employees").doc(email).get();
      const employee = employeeRef.data() as Employee;

      const message = {
        from: composeEmailSender(),
        to: email,
        subject: `Vote to Humeur du mois!`,
        html: composeEmailVoteHtml(employee),
        "amp-html": composeEmailVoteAmpHtml(employee, token)
      };

      await enqueue(message);
    } else {
      // Envoi le mail à tous les employés
      await sendEmailToEmployees(campaign, false);
    }

    res.status(200).send("OK");
  }
);
