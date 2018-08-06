import * as functions from "firebase-functions";
import { Config, isEnabled, asNumber } from "./config";
import { computeCurrentCampaign } from "./compute-current-campaign";

const config = functions.config() as Config;

export const getCampaign = functions.https.onCall(
  (data, context): { campaign: string | null } => {
    const voteDate = new Date();
    const campaign = computeCurrentCampaign(voteDate, {
      enabled: isEnabled(config.features.voting_campaigns),
      startOn: asNumber(config.features.voting_campaigns.start_on),
      endOn: asNumber(config.features.voting_campaigns.end_on)
    });
    if (!campaign.open) {
      return { campaign: null };
    }
    return { campaign: campaign.id };
  }
);
