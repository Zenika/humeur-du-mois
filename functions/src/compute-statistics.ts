import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";
import * as firebaseTools from "firebase-tools";

import { Config, ComputeStatisticsConfigs } from "./config";
import { updateStatsFunction } from "./update-stats";
import { Vote } from "./cast-vote";
import { Firestore } from "@google-cloud/firestore";

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

    await firebaseTools.firestore.delete("stats", {
      project: process.env.GCLOUD_PROJECT,
      recursive: true,
      yes: true
    });

    const votes = await db.collection("vote").get();
    for (const vote of votes.docs) {
      await updateStatsFunction(vote.data() as Vote, vote.id);
    }
    res.send("done");
  }
);
