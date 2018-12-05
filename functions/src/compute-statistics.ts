import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";

import { Config } from "./config";
import { getStatsRefsToUpdate } from "./update-stats";
import { Vote } from "./cast-vote";

const config = functions.config() as Config;
const computeStatisticsConfigs = config.features.compute_statistics;
const db = firebase.firestore();

//not the best but otherwise values show as NaN
const defaultCounters = {
  great: 0,
  notThatGreat: 0,
  notGreatAtAll: 0
};

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

    votes.docs
      .map(voteSnapshot => {
        const vote = voteSnapshot.data() as Vote;
        return getStatsRefsToUpdate(vote).map(statsRef => ({
          ...statsRef,
          voteValue: vote.value,
          additionalFields: statsRef.additionnalFields
        }));
      })
      .reduce(
        (refsForAllVote, refForAVote) => [...refsForAllVote, ...refForAVote],
        []
      )
      .reduce((countersByRef, row) => {
        const counters = countersByRef.get(row.ref.path);
        countersByRef.set(row.ref.path, {
          ...row.additionalFields,
          ...defaultCounters,
          ...counters,
          [row.voteValue]: (counters ? counters[row.voteValue] : 0) + 1
        });
        return countersByRef;
      }, new Map())
      .forEach((counters, ref) => {
        db.doc(ref)
          .set(counters)
          .catch(err => console.error(err));
      });

    res.sendStatus(200);
  }
);
