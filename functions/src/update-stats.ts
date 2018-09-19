import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";

import { Config, isEnabled, asBoolean } from "./config";
import { Vote } from "./cast-vote";

const config = functions.config() as Config;

const validVotes = ["great", "notThatGreat", "notGreatAtAll"];

interface StatsData {
  greatCount: number;
  notThatGreatCount: number;
  notGreatAtAllCount: number;
}

//updateStats({value: "great", voter: "example@zenika.com", campaign: "2018-09", recordedAt: "2018-09-19T15:30:00.00Z", agency: "Nantes"})

export const updateStats = functions.firestore
  .document("vote/{voteId}")
  .onCreate(async voteSnapshot => {
    if (!isEnabled(config.features.collect_stats)) {
      console.info("stats collecting is disabled; aborting");
      return;
    }
    const vote = voteSnapshot.data()! as Vote;
    let stats: StatsData;
    await firebase.firestore().runTransaction(async transaction => {
      await transaction
        .get(
          firebase
            .firestore()
            .collection("stats")
            .doc(vote.campaign)
        )
        .then(doc => {
          stats = doc.data()! as StatsData;
          if (!stats) {
            stats = {
              greatCount: 0,
              notThatGreatCount: 0,
              notGreatAtAllCount: 0
            };
          }
          switch (vote.value) {
            case validVotes[0]:
              stats.greatCount += 1;
              break;
            case validVotes[1]:
              stats.notThatGreatCount += 1;
              break;
            case validVotes[2]:
              stats.notGreatAtAllCount += 1;
              break;
          }

          return transaction.set(
            firebase
              .firestore()
              .collection("stats")
              .doc(vote.campaign),
            {
              greatCount: stats.greatCount,
              notThatGreatCount: stats.notThatGreatCount,
              notGreatAtAllCount: stats.notGreatAtAllCount
            }
          );
        });
    });
  });
