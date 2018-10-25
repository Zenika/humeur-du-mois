import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";

import { Config } from "./config";
import { Vote } from "./cast-vote";

const config = functions.config() as Config;
const importVotesConfigs = config.features.import_votes;
const db = firebase.firestore();

const fromJSONtoVote = (JSONString: string) => {
  const supposedlyValidVotes = JSON.parse(JSONString);
  const validVotes: Vote[] = supposedlyValidVotes.votes.filter(
    supposedlyValidVote =>
      supposedlyValidVote.value &&
      supposedlyValidVote.campaign &&
      supposedlyValidVote.agency
  );
  return validVotes;
};

export const importVotes = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    if (!importVotesConfigs.enabled) {
      console.info("Feature import votes disabled, aborting");
      return;
    }
    const passedAuthData = req.get("Authorization") || "";
    const passedAuthKey = passedAuthData === `Bearer ${importVotesConfigs.key}`;
    if (!passedAuthKey) {
      console.info("Passed the wrong auth key, aborting");
      return;
    }
    const passedJSONString = req.body.votesData;
    let validVotes: Vote[] = [];
    try {
      validVotes = fromJSONtoVote(passedJSONString);
    } catch (e) {
      console.error(e);
      res.sendStatus(500);
    }
    const voteBatch = db.batch();
    for (const validVote of validVotes) {
      voteBatch.create(db.collection("vote").doc(), validVote);
    }
    voteBatch
      .commit()
      .then(() => res.sendStatus(200), () => res.sendStatus(500));
  }
);
