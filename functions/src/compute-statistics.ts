import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";

import { Config, ComputeStatisticsConfigs } from "./config";
import { updateStatsFunction } from "./update-stats";
import { Vote } from "./cast-vote";
import { deleteCollection } from "./firebase-delete-collection";

const config = functions.config() as Config;
const computeStatisticsConfigs: ComputeStatisticsConfigs = {
  enabled: config.features.compute_statistics.enabled,
  key: config.features.compute_statistics.key
};
const db = firebase.firestore();

export const computeStatistics = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    if (!computeStatisticsConfigs.enabled) {
      return;
    }
    const passedData = req.get("Authorization") || "";
    const passedKey =
      passedData.toString() === `Bearer ${computeStatisticsConfigs.key}`;
    if (!passedKey) {
      return;
    }
    await deleteCollection(db, "stats", 100);
    const votes = await db.collection("vote").get();
    for (const vote of votes.docs) {
      await updateStatsFunction(vote.data() as Vote, vote.id);
    }
    res.send("done");
  }
);
