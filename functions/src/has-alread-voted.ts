import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import { Config, asBoolean, isEnabled, asNumber } from "./config";
import { computeCurrentCampaign } from "./compute-current-campaign";

const db = firestore();
const config = functions.config() as Config;
const requireUniqueVote = asBoolean(
  config.features.voting_campaigns.require_unique_vote
);

export const hasAlreadyVoted = functions.https.onCall(async (_, context) => {
  if (!requireUniqueVote) {
    console.info(
      "Config doesn't require unique vote per campaign; skipping..."
    );
    return false;
  }
  const voterEmail: string = context.auth!.token.email;
  const currentDate = new Date();
  const campaign = computeCurrentCampaign(currentDate, {
    enabled: isEnabled(config.features.voting_campaigns),
    startOn: asNumber(config.features.voting_campaigns.start_on),
    endOn: asNumber(config.features.voting_campaigns.end_on)
  });
  const vote = await db
    .collection("vote")
    .where("email", "==", voterEmail)
    .where("campaign", "==", campaign.open ? campaign.id : "")
    .get();
  if (vote.empty) {
    return false;
  }
  return true;
});
