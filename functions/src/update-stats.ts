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
    const voteId: string = voteSnapshot.id
    await firebase.firestore().runTransaction(async transaction => {
      const doc = await transaction.get(
        firebase
          .firestore()
          .collection("stats")
          .doc(vote.campaign)
      );
      if (doc.get(voteId)) {
        console.log("this vote has already been counted");
        throw new functions.https.HttpsError(
          "already-exists",
          `This vote has already been counted`
        );
      }

      let data = doc.data();
      if (!data) {
        data = {};
        data[vote.value] = 1;
      } else {
        if (!data[vote.value]) {
          data[vote.value] = 1;
        } else {
          data[vote.value] += 1;
        }
      }

      return transaction
        .set(
          firebase
            .firestore()
            .collection("stats")
            .doc(vote.campaign),
          data
        )
        .set(
          firebase
            .firestore()
            .collection("stats")
            .doc(vote.campaign)
            .collection("votes")
            .doc(voteId),
          {}
        );
    });
  });
