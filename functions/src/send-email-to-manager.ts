import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";
import * as mailgun from "mailgun-js";
import { Config, isEnabled, asBoolean } from "./config";
import { Vote } from "./cast-vote";
import { enqueue } from "./process-email-queue";

const config = functions.config() as Config;
const redirectToVoter = asBoolean(
  config.features.send_vote_to_manager.redirect_to_voter
);
const mailgunClient = mailgun({
  domain: config.mailgun.domain,
  apiKey: config.mailgun.api_key,
  host: config.mailgun.host
});
const db = firebase.firestore();

export const sendEmailToManager = functions.firestore
  .document("vote/{voteId}")
  .onCreate(async voteSnapshot => {
    if (!isEnabled(config.features.send_vote_to_manager)) {
      console.info("feature is disabled; aborting");
      return;
    }

    const vote = voteSnapshot.data()! as Vote;
    if (!vote.voteFromUi) {
      console.info("Vote doesn't come from Ui, aborting...");
      return;
    }

    if (!vote.managerEmail) {
      console.info(`Employee ${vote.fullName}' has no manager; aborting`);
      return;
    }

    const recipient = redirectToVoter ? vote.email : vote.managerEmail;
    const message = {
      from: "Humeur du mois <humeur-du-mois@zenika.com>",
      to: recipient,
      "h:Reply-To": vote.email,
      subject: `${vote.fullName} has shared how they feel: "${vote.value}"`,
      html: `
        <p>Hi ${vote.managerEmail},</p>
        <p>
          ${vote.fullName} has shared how they feel:
          "${vote.value}".
        </p>
        <p>See you soon!</p>
      `
    };

    await enqueue(message);
  });
