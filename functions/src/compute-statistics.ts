import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";

import { Config, isEnabled } from "./config";
import { updateStats } from "./update-stats";
import { Vote } from "./cast-vote";

const config = functions.config() as Config;
const adminKey: string = config.features.compute_statistics.key;
const db = firebase.firestore();

interface keyPayload {
  key: string;
}

export const computeStatistics = functions.https.onCall(
  async (payload: keyPayload) => {
    if (!config.features.compute_statistics.enabled) {
      console.info("Compute statistics feature is disabled; aborting");
      return;
    }
    if (payload.key !== adminKey) {
      console.info("function's payload passed the wrong admin key; aborting");
      return;
    }
    db.collection("votes")
      .get()
      .then(votes => {
        votes.forEach(vote => {
          updateStats(vote.data() as Vote, vote.id);
        });
      });
  }
);
