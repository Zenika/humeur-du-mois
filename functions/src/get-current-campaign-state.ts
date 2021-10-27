import * as functions from "firebase-functions";
import { Config, isEnabled, asNumber, asBoolean } from "./config";
import { computeCurrentCampaign } from "./compute-current-campaign";
import { firestore } from "firebase-admin";
import { getOrGenerateRandomEmailToken } from "./generate-random-email-token";

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

    if (!campaign.open) {
      return {
        campaign: null,
        alreadyVoted: false,
        voteToken: null
      };
    }

    const voterEmail: string = context.auth!.token.email;

    let voteToken = await getOrGenerateRandomEmailToken({
      employeeEmail: voterEmail,
      campaignId: campaign.id
    });
    const vote = await db
      .collection("vote")
      .doc(`${campaign.id}-${voteToken}`)
      .get();

    return {
      campaign: campaign.id,
      alreadyVoted: requireUniqueVote ? vote.exists : false,
      voteToken
    };
  }
);
