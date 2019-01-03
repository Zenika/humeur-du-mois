import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";

import { Config } from "./config";
import { getStatsRefsToUpdate } from "./update-stats";
import { Vote } from "./cast-vote";

const config = functions.config() as Config;
const computeStatisticsConfigs = config.features.compute_statistics;
const db = firebase.firestore();

export const computeStatistics = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    if (!computeStatisticsConfigs.enabled) {
      return;
    }

    const authorizationHeader = req.get("Authorization") || "";
    const keyIsCorrect =
      authorizationHeader === `Bearer ${computeStatisticsConfigs.key}`;
    if (!keyIsCorrect) {
      res.sendStatus(401);
      return;
    }

    const votes = await db.collection("vote").get();

    const statisticsData = votes.docs
      .map(voteSnapshot => {
        const vote = voteSnapshot.data() as Vote;
        return getStatsRefsToUpdate(vote).map(statsRef => ({
          ...statsRef,
          voteValue: vote.value
        }));
      })
      .reduce(
        (refsForAllVote, refForAVote) => [...refsForAllVote, ...refForAVote],
        []
      )
      .reduce(
        (countersByRef, row) => {
          const counters = countersByRef[row.ref.path] || {};
          countersByRef[row.ref.path] = {
            ...row.additionnalFields,
            ...counters,
            [row.voteValue]: (counters[row.voteValue] || 0) + 1
          };
          return countersByRef;
        },
        {} as { [key: string]: any }
      );

    // we should really batch this because this could
    // represent hundreds of documents
    // eg for 5 years and 10 agencies -> 660 documents
    await Promise.all(
      Object.keys(statisticsData).map(key => {
        console.log(`writing ${key}`);
        const row = statisticsData[key];
        return db
          .doc(key)
          .set(row)
          .catch(err => console.error(err));
      })
    );

    res.sendStatus(200);
  }
);
