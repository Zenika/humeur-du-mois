import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";

import { Config } from "./config";
import { Vote } from "./cast-vote";

const config = functions.config() as Config;
const importVotesConfigs = config.features.import_votes;
const db = firebase.firestore();

const fromJSONtoVote = (JSONString: string) => {
  const supposedlyValidVotes = JSON.parse(JSONString);
  const validVotes: Vote[] = [];
  for (const supposedlyValidVote of supposedlyValidVotes.votes) {
    if (
      "value" in supposedlyValidVote &&
      "campaign" in supposedlyValidVote &&
      "agency" in supposedlyValidVote
    ) {
      validVotes.push(supposedlyValidVote);
    }
  }
  return validVotes;
};

export const importVotes = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    if (!importVotesConfigs.enabled) {
      console.info("Feature import votes disabled, aborting");
      return;
    }
    const passedData = req.get("Authorization") || "";
    const passedKey =
      passedData.toString() === `Bearer ${importVotesConfigs.key}`;
    if (!passedKey) {
      console.info("Passed the wrong auth key, aborting");
      return;
    }
    const passedJSONString = req.body.votesData;
    const date: firebase.firestore.Timestamp = firebase.firestore.Timestamp.fromDate(
      new Date()
    );
    let validVotes: Vote[] = [];
    try {
      validVotes = fromJSONtoVote(passedJSONString);
    } catch (e) {
      console.error(e);
      res.sendStatus(500);
    }

    for (const validVote of validVotes) {
      await db.collection("vote").add(validVote);
    }
    res.sendStatus(200);
  }
);
