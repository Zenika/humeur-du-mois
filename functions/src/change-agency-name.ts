import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";

import { Config } from "./config";
import { Vote } from "./cast-vote";

const config = functions.config() as Config;
const changeAgencyNameConfig = config.features.change_agency_name;
const db = firebase.firestore();

export const changeAgencyName = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    if (!changeAgencyNameConfig.enabled) {
      console.info("Feature disabled, aborting...");
      return;
    }

    const authorizationHeader = req.get("Authorization") || "";
    const keyIsCorrect =
      authorizationHeader === `Bearer ${changeAgencyNameConfig.key}`;
    if (!keyIsCorrect) {
      res.sendStatus(401);
      return;
    }
    if (!req.body.source) {
      console.error("No source agency provided");
      return;
    }
    if (!req.body.target) {
      console.error("No target agency provided");
      return;
    }
    const source = req.body.source;
    const target = req.body.target;
    const votes = await db
      .collection("vote")
      .where("agency", "==", source)
      .get();

    console.info(`Replacing agencies ${source} with ${target}`);

    votes.docs.forEach(voteSnapshot => {
      const vote = voteSnapshot.data() as Vote;
      vote.agency = target;
      const batch = db.batch();
      batch.set(db.collection("vote").doc(voteSnapshot.id), vote);
      batch.commit().catch(err => {
        console.error(err);
        res.sendStatus(500);
        return;
      });
    });
    res.sendStatus(200);
  }
);
