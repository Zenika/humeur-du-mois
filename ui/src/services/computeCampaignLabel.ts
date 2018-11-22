export function computeCampaignLabel(campaignISOYearMonth: string) {
  // stats-campaign-agency matches this pattern ${campaign}_${agency} and we only need the campaign
  const firstDayOfMonthUtc: Date = new Date(campaignISOYearMonth.split("_")[0]);
  return new Date(
    firstDayOfMonthUtc.getUTCFullYear(),
    firstDayOfMonthUtc.getUTCMonth()
  ).toLocaleString("en-GB", { year: "numeric", month: "long" });
}
