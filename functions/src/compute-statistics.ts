import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";
import * as firebaseTools from "firebase-tools";

import { Config } from "./config";
import { getStatsPathsToUpdate } from "./update-stats";
import { Vote } from "./cast-vote";

interface Path {
  counters: any;
  path: FirebaseFirestore.DocumentReference;
}

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
    let paths: any;
    paths = {};
    for (const vote of votes.docs) {
      const voteData = vote.data() as Vote;
      const pathsToAdd = getStatsPathsToUpdate(voteData);
      for (const path of pathsToAdd) {
        if (paths[path.path]) {
          paths[path.path] = {
            counters: {
              ...paths[path.path].counters,
              ...{ agency: voteData.agency },
              [voteData.value]:
                (paths[path.path].counters[voteData.value] || 0) + 1
            },
            path: path
          };
        } else {
          paths[path.path] = {
            counters: {
              ...{ agency: voteData.agency },
              [voteData.value]: 1
            },
            path: path
          };
        }
      }
    }
    for (const key of Object.keys(paths)) {
      const path = paths[key];
      db.runTransaction(async transaction => {
        return transaction.set(path.path, path.counters);
      });
    }
    res.sendStatus(200);
  }
);
