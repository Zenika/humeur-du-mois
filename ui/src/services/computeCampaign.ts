export function computeCampaign(campaign: string) {
  const campaignDate: Date = new Date(campaign);
  return new Date(
    campaignDate.getUTCFullYear(),
    campaignDate.getUTCMonth()
  ).toLocaleString("en-GB", { year: "numeric", month: "long" });
}
