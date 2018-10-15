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

export const updateStats = functions.firestore
  .document("vote/{voteId}")
  .onCreate(async voteSnapshot => {
    if (!isEnabled(config.features.collect_stats)) {
      console.info("stats collecting is disabled; aborting");
      return;
    }
    const vote = voteSnapshot.data()! as Vote;
    const voteId: string = voteSnapshot.id;
    updateStatsFunction(vote, voteId);
  });

export const updateStatsFunction = async (vote: Vote, voteId: string) => {
  const statsCollection = firebase.firestore().collection("stats");
  await firebase.firestore().runTransaction(async transaction => {
    const previousCounters = await transaction
      .get(statsCollection.doc(vote.campaign))
      .then(snapshot => snapshot.data() || {});
    const storedVote = await transaction.get(
      statsCollection
        .doc(vote.campaign)
        .collection("votes")
        .doc(voteId)
    );
    //To prevent double calls to updateStats from occuring
    if (storedVote.exists) {
      console.info(`This vote(${voteId}) has already been counted, aborting;`);
      return;
    }
    const updateCounters = {
      ...previousCounters,
      [vote.value]: (previousCounters[vote.value] || 0) + 1
    };

    return transaction
      .set(statsCollection.doc(vote.campaign), updateCounters)
      .set(
        statsCollection
          .doc(vote.campaign)
          .collection("votes")
          .doc(voteId),
        {}
      );
  });
};