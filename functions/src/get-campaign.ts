import * as functions from "firebase-functions";
import { Config, isEnabled, asNumber } from "./config";
import { selectCampaign } from "./select-campaign";

const config = functions.config() as Config;

export const getCampaign = functions.https.onCall(
  (data, context): { campaign: string | null } => {
    const voteDate = new Date();
    const campaign = selectCampaign(voteDate, {
      enabled: isEnabled(config.features.voting_campaigns),
      startOn: asNumber(config.features.voting_campaigns.start_on),
      endOn: asNumber(config.features.voting_campaigns.end_on)
    });
    if (!campaign) {
      return { campaign: null };
    }

    const [campaignYear, campaignMonth] = campaign;
    const campaignId = new Date(Date.UTC(campaignYear, campaignMonth))
      .toISOString()
      .substr(0, 7);
    return { campaign: campaignId };
  }
);
