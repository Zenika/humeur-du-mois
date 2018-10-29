import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";
import * as mailgun from "mailgun-js";
import { Config, isEnabled, asBoolean } from "./config";
import { Vote } from "./cast-vote";

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
      to: config.mailgun.recipient_override || recipient,
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

    /**
     * This following has (or intends to have, at least) the following properties:
     * - failure to the send the email restarts the transaction
     * - failure to update the document restarts the transaction but does not send the email again
     */
    let emailSent = false;
    await firebase.firestore().runTransaction(async transaction => {
      //Make sure we didn't send a mail already
      if (vote.emailToManagerSent) {
        console.info("Email already sent to manager, aborting");
        return;
      }
      if (!emailSent) {
        await mailgunClient.messages().send(message);
        emailSent = true;
      }
      transaction.update(voteSnapshot.ref, {
        emailToManagerSent: true,
        fullName: "*REDACTED*"
      });
    });
  });
