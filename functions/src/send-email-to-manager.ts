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
    if (!("voteFromUi" in vote)) {
      console.info("Vote doesn't come from Ui, aborting...");
      return;
    }

    const employeeSnapshot = await db
      .collection("employees")
      .doc(vote.email)
      .get();
    if (!employeeSnapshot) {
      throw new Error("cannot find employee data import");
    }
    const employee = employeeSnapshot.data();
    if (!employee) {
      throw new Error(`cannot find user '${vote.email}' in employee data`);
    }
    if (!employee.managerEmail) {
      console.info(`Employee ${employee.fullName}' has no manager; aborting`);
      return;
    }

    const recipient = redirectToVoter ? employee.email : employee.managerEmail;
    const message = {
      from: "Humeur du mois <humeur-du-mois@zenika.com>",
      to: config.mailgun.recipient_override || recipient,
      "h:Reply-To": employee.email,
      subject: `${employee.fullName} has shared how they feel: "${vote.value}"`,
      html: `
        <p>Hi ${employee.managerEmail},</p>
        <p>
          ${employee.fullName} has shared how they feel:
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
      if (!emailSent) {
        await mailgunClient.messages().send(message);
        emailSent = true;
      }
      transaction.update(voteSnapshot.ref, {
        emailToManagerSent: true,
        voter: "*REDACTED*"
      });
    });
  });
