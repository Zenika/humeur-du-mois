import { computeCampaignLabel } from "./computeCampaignLabel";
import { VoteData } from "./renderTemplate";

export function computeDataFromDataBase(voteRawData: VoteData) {
  if (!voteRawData) return;
  voteRawData = voteRawData.map(row => ({
    ...row,
    counts: {
      ...row.counts
    }
  }));
  voteRawData = voteRawData.map(row => ({
    ...row,
    campaignDate: computeCampaignLabel(row.campaign)
  }));

  return voteRawData;
}
