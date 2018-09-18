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
  let daysToEnd = campaignOptions.endOn - now.getUTCDate() + 1
  let lastDayOfMonth = new Date(now.getUTCFullYear(), now.getUTCMonth(),0).getUTCDate()
  if(daysToEnd < 0)
    return  daysToEnd + lastDayOfMonth
  else
    return daysToEnd
};
