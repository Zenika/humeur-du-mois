import * as functions from "firebase-functions";
import { Config, isEnabled, asBoolean } from "./config";
import { Vote } from "./cast-vote";
import { enqueue } from "./process-email-queue";
import {
  composeEmailHtml,
  composeEmailAmpHtml
} from "./compose-email-to-manager";
import { generateAndSaveRandomEmailToken } from "./generate-random-email-token";
import { firestore } from "firebase-admin";
import { Employee } from "./import-employees-from-alibeez";

const config = functions.config() as Config;
const redirectToVoter = asBoolean(
  config.features.send_vote_to_manager.redirect_to_voter
);

const db = firestore();

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

    const managerSnapshot = await db
      .collection("employees")
      .doc(vote.managerEmail)
      .get();
    if (!managerSnapshot || !managerSnapshot.exists) {
      console.error(
        `Cannot find manager '${vote.managerEmail}' in employees; aborting`
      );
      return;
    }

    const token = await generateAndSaveRandomEmailToken({
      employeeEmail: vote.managerEmail,
      campaignId: vote.campaign,
      agency: (managerSnapshot.data() as Employee).agency ?? undefined
    });

    const recipient = redirectToVoter ? vote.email : vote.managerEmail;
    const message = {
      from: "Humeur du mois <humeur-du-mois@zenika.com>",
      to: recipient,
      "h:Reply-To": vote.email,
      subject: `${vote.fullName} has shared how they feel`,
      html: composeEmailHtml(vote),
      "amp-html": composeEmailAmpHtml(vote, token)
    };

    await enqueue(message);
  });
