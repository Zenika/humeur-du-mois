import * as functions from "firebase-functions";
import { Config, isEnabled, asNumber, asBoolean } from "./config";
import {
  computeCurrentCampaign,
} from "./compute-current-campaign";
import { firestore } from "firebase-admin";
import { generateAndSaveRandomEmailToken } from "./generate-random-email-token";

const db = firestore();
const config = functions.config() as Config;
const requireUniqueVote = asBoolean(
  config.features.voting_campaigns.require_unique_vote
);

export const getCurrentCampaignState = functions.https.onCall(
  async (
    _,
    context
  ): Promise<{
    campaign: string | null;
    alreadyVoted: boolean;
    voteToken: string | null;
  }> => {
    const voteDate = new Date();
    const campaign = computeCurrentCampaign(voteDate, {
      enabled: isEnabled(config.features.voting_campaigns),
      startOn: asNumber(config.features.voting_campaigns.start_on),
      endOn: asNumber(config.features.voting_campaigns.end_on)
    });

    if (!campaign.open || !requireUniqueVote) {
      return {
        campaign: campaign.open ? campaign.id : null,
        alreadyVoted: false,
        voteToken: null
      };
    }

    const voterEmail: string = context.auth!.token.email;

    const vote = await db
      .collection("vote")
      .where("email", "==", voterEmail)
      .where("campaign", "==", campaign.open ? campaign.id : "")
      .get();

    const voteTokenQueryResults = await db
      .collection("token")
      .where("employeeEmail", "==", voterEmail)
      .where("campaign", "==", campaign.open ? campaign.id : "")
      .get();

    let voteToken = voteTokenQueryResults.empty
      ? await generateAndSaveRandomEmailToken(voterEmail, campaign.id, db)
      : voteTokenQueryResults.docs[0].id;

    return {
      campaign: campaign.id,
      alreadyVoted: !vote.empty,
      voteToken
    };
  }
);
