import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";

import { Config, isEnabled } from "./config";
import { Vote } from "./cast-vote";

const config = functions.config() as Config;

interface StatsData {
  greatCount: number;
  notThatGreatCount: number;
  notGreatAtAllCount: number;
}

export const updateStats = async (vote: Vote, voteId: string, statsDocument: FirebaseFirestore.DocumentReference) => {
  await firebase.firestore().runTransaction(async transaction => {
    const previousCounters = await transaction
      .get(statsDocument)
      .then(snapshot => snapshot.data() || {});
    const storedVote = await transaction.get(
      statsDocument
        .collection("votes")
        .doc(voteId)
    );
    //To prevent double calls to updateStats from occuring
    if (storedVote.exists) {
      return;
    }
    const updateCounters = {
      ...previousCounters,
      [vote.value]: (previousCounters[vote.value] || 0) + 1
    };

    return transaction
      .set(statsDocument, updateCounters)
      .set(
        statsDocument
          .collection("votes")
          .doc(voteId),
        {}
      );
  });
};
export const updateCampaignStatsOnVote = functions.firestore
  .document("vote/{voteId}")
  .onCreate(async voteSnapshot => {
    if (!isEnabled(config.features.collect_stats)) {
      return;
    }
    const vote = voteSnapshot.data()! as Vote;
    const voteId: string = voteSnapshot.id;
    updateStats(vote, voteId, firebase.firestore().collection(`stats-campaign`).doc(vote.campaign)).catch(e => {
      console.error(e);
    });
  });

  export const updateAgencyStatsOnVote = functions.firestore
  .document("vote/{voteId}")
  .onCreate(async voteSnapshot => {
    if (!isEnabled(config.features.collect_stats)) {
      return;
    }
    const vote = voteSnapshot.data()! as Vote;
    const voteId: string = voteSnapshot.id;
    updateStats(vote, voteId, firebase.firestore().collection(`stats-agency`).doc(vote.agency)).catch(e => {
      console.error(e);
    }); 
  });
