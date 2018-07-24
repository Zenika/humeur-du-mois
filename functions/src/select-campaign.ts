export type CampaignOptions =
  | {
      enabled: boolean;
      startOn: number;
      endOn: number;
    }
  | { enabled: false };
export type YearMonth = [number, number];

export const selectCampaign = (
  voteDate: Date,
  campaignOptions: CampaignOptions
): YearMonth | null => {
  if (!campaignOptions.enabled) {
    return [voteDate.getUTCFullYear(), voteDate.getUTCMonth()];
  }
  const campaignStartsAndEndsOnTheSameMonth =
    campaignOptions.startOn < campaignOptions.endOn;
  if (campaignStartsAndEndsOnTheSameMonth) {
    if (
      voteDate.getUTCDate() < campaignOptions.startOn ||
      voteDate.getUTCDate() > campaignOptions.endOn
    ) {
      return null;
    }
  } else {
    if (
      voteDate.getUTCDate() < campaignOptions.startOn &&
      voteDate.getUTCDate() > campaignOptions.endOn
    ) {
      return null;
    }
  }
  const voteDateIsNextMonth =
    !campaignStartsAndEndsOnTheSameMonth &&
    voteDate.getUTCDate() < campaignOptions.startOn;
  return [
    voteDate.getUTCFullYear(),
    voteDate.getUTCMonth() - (voteDateIsNextMonth ? 1 : 0)
  ];
};
