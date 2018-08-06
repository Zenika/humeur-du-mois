export type CampaignOptions =
  | {
      enabled: boolean;
      startOn: number;
      endOn: number;
    }
  | { enabled: false };

export type CampaignInfo =
  | { open: true; id: string; year: number; month: number }
  | { open: false };

export const computeCurrentCampaign = (
  voteDate: Date,
  campaignOptions: CampaignOptions
): CampaignInfo => {
  if (!campaignOptions.enabled) {
    return {
      open: true,
      year: voteDate.getUTCFullYear(),
      month: voteDate.getUTCMonth(),
      id: new Date(Date.UTC(voteDate.getUTCFullYear(), voteDate.getUTCMonth()))
        .toISOString()
        .substr(0, 7)
    };
  }
  const campaignStartsAndEndsOnTheSameMonth =
    campaignOptions.startOn < campaignOptions.endOn;
  if (campaignStartsAndEndsOnTheSameMonth) {
    if (
      voteDate.getUTCDate() < campaignOptions.startOn ||
      voteDate.getUTCDate() > campaignOptions.endOn
    ) {
      return { open: false };
    }
  } else {
    if (
      voteDate.getUTCDate() < campaignOptions.startOn &&
      voteDate.getUTCDate() > campaignOptions.endOn
    ) {
      return { open: false };
    }
  }
  const voteDateIsNextMonth =
    !campaignStartsAndEndsOnTheSameMonth &&
    voteDate.getUTCDate() < campaignOptions.startOn;
  const [year, month] = [
    voteDate.getUTCFullYear(),
    voteDate.getUTCMonth() - (voteDateIsNextMonth ? 1 : 0)
  ];
  return {
    open: true,
    year,
    month,
    id: new Date(Date.UTC(year, month)).toISOString().substr(0, 7)
  };
};
