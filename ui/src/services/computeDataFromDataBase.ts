import { computeCampaignLabel } from "./computeCampaignLabel";
import { VoteData } from "./renderTemplate";

export function computeDataFromDataBase(voteRawData: VoteData) {
  voteRawData = voteRawData.map(row => ({
    ...row,
    counts: {
      great: 0,
      notGreatAtAll: 0,
      notThatGreat: 0,
      ...row.counts
    }
  }));
  voteRawData = voteRawData.map(row => ({
    ...row,
    campaignDate: computeCampaignLabel(row.campaign)
  }));

  return voteRawData;
}
