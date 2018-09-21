import firebase from "firebase/app";
import { computeCampaign } from "./computeCampaign";
import { StatsData, VoteData } from "./renderTemplate";

export function computeDataFromDataBase(
  stats: firebase.firestore.QuerySnapshot
) {
  let voteData: VoteData = stats.docs.map(snapshot => ({
    campaign: snapshot.id,
    counts: snapshot.data() as StatsData,
    campaign_date: ""
  }));

  if (voteData.length > 0) {
    voteData = voteData.map(row => ({
      ...row,
      counts: {
        ...{ great: 0, notGreatAtAll: 0, notThatGreat: 0 },
        ...row.counts
      }
    }));
    voteData = voteData.map(row => ({
      ...row,
      campaign_date: computeCampaign(row.campaign)
    }));
  }
  return voteData;
}
