import { CampaignOptions } from "./compute-current-campaign";

export const daysBeforeCampaignEnds = (
  now: Date,
  campaignOptions: CampaignOptions
): number => {
  if (!campaignOptions.enabled) {
    return (
      new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)
      ).getUTCDate() -
      now.getUTCDate() +
      1
    );
  }
  let possiblyNegativeDaysBeforeCampaignEnds =
    campaignOptions.endOn - now.getUTCDate() + 1;

  if (possiblyNegativeDaysBeforeCampaignEnds < 0) {
    let lastDayOfMonth = new Date(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      0
    ).getUTCDate();
    return possiblyNegativeDaysBeforeCampaignEnds + lastDayOfMonth;
  } else return possiblyNegativeDaysBeforeCampaignEnds;
};
