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
    const statsCollection = firebase.firestore().collection("stats");

    await firebase.firestore().runTransaction(async transaction => {
      const doc = await transaction.get(statsCollection.doc(vote.campaign));
      const storedVote = await transaction.get(
        statsCollection
          .doc(vote.campaign)
          .collection("votes")
          .doc(voteId)
      );

      if (storedVote.exists) {
        console.info(
          "This vote(" + voteId + ") has already been counted, aborting;"
        );
        return;
      }

      const inputData = doc.data() || {};
      const oldCounters = { [vote.value]: 0, ...inputData };
      const newCounters = {
        ...oldCounters,
        [vote.value]: oldCounters[vote.value] + 1
      };

      return transaction
        .set(statsCollection.doc(vote.campaign), newCounters)
        .set(
          statsCollection
            .doc(vote.campaign)
            .collection("votes")
            .doc(voteId),
          {}
        );
    });
  });
