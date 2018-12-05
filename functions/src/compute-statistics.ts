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
      .map(vote => {
        const voteData = vote.data() as Vote;
        return getStatsRefsToUpdate(voteData).map(row => {
          return {
            ref: row.ref,
            voteValue: voteData.value,
            additionalFields: row.additionnalFields
          };
        });
      })
      .reduce((accumulator, row) => [...accumulator, ...row], [])
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

//computeStatistics.post({headers:{ 'Authorization': 'Bearer 31110062-dffd-4a64-938d-75dd14371830'}})
