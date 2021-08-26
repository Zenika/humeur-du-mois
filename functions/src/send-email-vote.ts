import * as functions from "firebase-functions";
import { firestore } from "firebase-admin";
import { computeCurrentCampaign } from "./compute-current-campaign";
import { Config, isEnabled, asNumber } from "./config";
import { enqueue } from "./process-email-queue";
import { Employee } from "./import-employees-from-alibeez";
import { CampaignInfo } from "./compute-current-campaign";

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

export const sendEmailToEmployees = async (campaign: CampaignInfo) =>
{
    if (!campaign.open) return;

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
}

// Test, Send a new vote email always 
export const sendEmailVote = functions.https.onCall(
    async (payload: unknown, context: unknown) => {
        const voteDate = new Date()
        const campaign = {
            open: true,
            year: voteDate.getUTCFullYear(),
            month: voteDate.getUTCMonth(),
            id: new Date(Date.UTC(voteDate.getUTCFullYear(), voteDate.getUTCMonth()))
              .toISOString()
              .substr(0, 7)
          }
        
        sendEmailToEmployees(campaign);
    }
);