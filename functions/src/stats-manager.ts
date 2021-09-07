import * as functions from "firebase-functions";
import { firestore } from "firebase-admin";
import { Config } from "./config";
import { TokenData } from "./generate-random-email-token";
import { Vote } from "./cast-vote";

const db = firestore();
const config = functions.config() as Config;

export const statsManager = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    const email = req.header("AMP-Email-Sender");
    if (!email || config.features.emails.sender.email !== email) {
      res.status(401).send({
        message: "Bad Email"
      });
      return;
    }
    res.set("AMP-Email-Allow-Sender", config.features.emails.sender.email);
    const token = req.query.token;
    if (!token) {
      res.status(401).send({
        message: "Token mandatory"
      });
      return;
    }
    const tokenSnapshot = await db.collection("token").doc(token).get();
    if (!tokenSnapshot || !tokenSnapshot.exists) {
      res.status(401).send({
        message: "Bad Token"
      });
      return;
    }
    const tokenData = tokenSnapshot.data() as TokenData;

    const managersVotes = await db
      .collection("vote")
      .where("managerEmail", "==", tokenData.employeeEmail)
      .where("campaign", "==", tokenData.campaignId)
      .get();
    const statsManager = managersVotes.docs
      .map(doc => doc.data() as Vote)
      .reduce(
        (counters, vote) =>
          Object.assign(counters, { [vote.value]: counters[vote.value] + 1 }),
        { great: 0, notGreatAtAll: 0, notThatGreat: 0, ok: 0 }
      );
    const statsAgency = await db
      .collection("stats-campaign-agency")
      .doc(`${tokenData.campaignId}_${tokenData.agency}`)
      .get();
    res.status(200).send({
      manager: statsManager,
      agency: statsAgency.exists ? statsAgency.data() : {},
      campaign: tokenData.campaignId
    });
  }
);
