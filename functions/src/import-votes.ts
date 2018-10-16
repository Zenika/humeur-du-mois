import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";

import { Config, ImportVotesConfig } from "./config";
import { Vote, castVote } from "./cast-vote";

const config = functions.config() as Config;
const importVotesConfigs: ImportVotesConfig = {
  enabled: config.features.import_votes.enabled,
  key: config.features.import_votes.key
};
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
    const passedJSONString = req.params.votesData;
    const validVotes = fromJSONtoVote(passedJSONString);
    for (const validVote of validVotes) {
      await db.collection("vote").add(validVote);
    }
  }
);

const fromJSONtoVote = (JSONString: string) => {
  const supposedlyValidVotes = JSON.parse(JSONString);
  const validVotes: Vote[] = [];
  for (const supposedlyValidVote of supposedlyValidVotes) {
    if (
      supposedlyValidVote &&
      supposedlyValidVote.value &&
      supposedlyValidVote.campaign &&
      supposedlyValidVote.recordedAt &&
      supposedlyValidVote.fullName &&
      supposedlyValidVote.email &&
      supposedlyValidVote.managerEmail &&
      supposedlyValidVote.agency
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
  return validVotes;
};
