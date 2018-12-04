import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";
import * as firebaseTools from "firebase-tools";

import { Config } from "./config";
import { updateStats } from "./update-stats";
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

    await firebaseTools.firestore.delete("stats", {
      project: config.service_account.project_id,
      recursive: true,
      yes: true
    });

    const votes = await db.collection("vote").get();
    for (const vote of votes.docs) {
      const voteData = vote.data() as Vote;
      await updateStats(
        voteData.value,
        vote.id,
        firebase
          .firestore()
          .collection(`stats-campaign`)
          .doc(vote.id),
        { agency: voteData.agency }
      );
    }
    res.send("done");
  }
);
