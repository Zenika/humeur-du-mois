import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";
import { firestore } from "firebase-admin";

import { Config, ImportVotesConfig } from "./config";
import { Vote, castVote } from "./cast-vote";
import { Timestamp } from "@google-cloud/firestore";

const config = functions.config() as Config;
const importVotesConfigs = config.features.import_votes;
const db = firebase.firestore();

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
    const date: firestore.Timestamp = firestore.Timestamp.fromDate(new Date());
    let validVotes: Vote[] = [
      {
        value: "",
        campaign: "",
        recordedAt: date,
        fullName: "",
        email: "",
        managerEmail: "",
        agency: ""
      }
    ];
    try {
      validVotes = fromJSONtoVote(passedJSONString);
    } catch (e) {
      console.error(e);
    }

    for (const validVote of validVotes) {
      await db.collection("vote").add(validVote);
    }
  }
);

const fromJSONtoVote = (JSONString: string) => {
  const supposedlyValidVotes = JSON.parse(JSONString);
  console.info(supposedlyValidVotes);
  const validVotes: Vote[] = [];
  for (const supposedlyValidVote of supposedlyValidVotes.votes) {
    if (
      //supposedlyValidVote &&
      "value" in supposedlyValidVote &&
      "campaign" in supposedlyValidVote &&
      "recordedAt" in supposedlyValidVote &&
      "fullName" in supposedlyValidVote &&
      "email" in supposedlyValidVote &&
      "managerEmail" in supposedlyValidVote &&
      "agency" in supposedlyValidVote
    ) {
      validVotes.push({
        value: supposedlyValidVote.value,
        campaign: supposedlyValidVote.campaign,
        recordedAt: supposedlyValidVote.recordedAt,
        fullName: supposedlyValidVote.fullName,
        email: supposedlyValidVote.email,
        managerEmail: supposedlyValidVote.managerEmail,
        agency: supposedlyValidVote.agency
      });
    }
  }
  console.info(validVotes);
  return validVotes;
};
