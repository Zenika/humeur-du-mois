import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";
import * as firebaseTools from "firebase-tools";

import { Config } from "./config";
import { getStatsRefsToUpdate } from "./update-stats";
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
    let paths: {
      [key: string]: {
        counters: { [key: string]: any };
        path: FirebaseFirestore.DocumentReference;
      };
    };
    paths = {};
    for (const vote of votes.docs) {
      const voteData = vote.data() as Vote;
      const refsToAdd = getStatsRefsToUpdate(voteData);
      for (const refToAdd of refsToAdd) {
        if (paths[refToAdd.path]) {
          paths[refToAdd.path] = {
            counters: {
              ...paths[refToAdd.path].counters,
              ...{ agency: voteData.agency },
              [voteData.value]:
                (paths[refToAdd.path].counters[voteData.value] || 0) + 1
            },
            path: refToAdd
          };
        } else {
          paths[refToAdd.path] = {
            counters: {
              ...{ agency: voteData.agency },
              [voteData.value]: 1
            },
            path: refToAdd
          };
        }
      }
    }
    await Promise.all(
      Object.keys(paths).map(refPath =>
        paths[refPath].path.set(paths[refPath].counters)
      )
    );
    res.sendStatus(200);
  }
);
