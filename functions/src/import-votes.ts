import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";

import { Config } from "./config";
import { Vote } from "./cast-vote";

const config = functions.config() as Config;
const importVotesConfigs = config.features.import_votes;
const db = firebase.firestore();

const fromJSONtoVote = (supposedlyValidVotes: any) => {
  if (!supposedlyValidVotes.votes) return [];
  const validVotes: Vote[] = supposedlyValidVotes.votes.filter(
    (supposedlyValidVote: any) =>
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
    const authorizationHeader = req.get("Authorization") || "";
    const keyIsCorrect =
      authorizationHeader === `Bearer ${importVotesConfigs.key}`;
    if (!keyIsCorrect) {
      console.error("Passed the wrong auth key, aborting");
      res.sendStatus(403);
      return;
    }
    let validVotes: Vote[] = [];
    if (req.body) {
      validVotes = fromJSONtoVote(req.body);
    } else {
      console.error("votesData is null, aborting");
      res.sendStatus(422);
      return;
    }
    const voteBatch = db.batch();
    for (const validVote of validVotes) {
      voteBatch.create(db.collection("vote").doc(), validVote);
    }
    voteBatch
      .commit()
      .then(() => res.sendStatus(200))
      .catch(e => {
        console.error(e);
        res.sendStatus(500);
      });
  }
);
