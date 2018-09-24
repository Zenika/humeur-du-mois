export function computeCampaignLabel(campaignISOYearMonth: string) {
  const firstDayOfMonthUtc: Date = new Date(campaignISOYearMonth);
  return new Date(
    firstDayOfMonthUtc.getUTCFullYear(),
    firstDayOfMonthUtc.getUTCMonth()
  ).toLocaleString("en-GB", { year: "numeric", month: "long" });
}
