import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import { Config, isEnabled } from "./config";

const db = firestore();
const config = functions.config() as Config;
const isBackupEnabled = isEnabled(config.features.backup);

export const backup = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    if (!isBackupEnabled) {
      console.info("Feature import votes disabled, aborting");
      return;
    }
    const authorizationHeader = req.get("Authorization") || "";
    const keyIsCorrect =
      authorizationHeader === `Bearer ${config.features.backup.key}`;
    if (!keyIsCorrect) {
      console.error("Passed the wrong auth key, aborting");
      res.sendStatus(403);
      return;
    }
    const votesData = await db.collection("vote").get();
    const votes = votesData.docs.map(doc => doc.data());

    const statsCampaignData = await db.collection("stats-campaign").get();
    const statsCampaign = statsCampaignData.docs.map(doc => doc.data());

    const statsCampaignAgencyData = await db
      .collection("stats-campaign-agency")
      .get();
    const statsCampaignAgency = statsCampaignAgencyData.docs.map(doc =>
      doc.data()
    );

    res.send({
      votes,
      statsCampaign,
      statsCampaignAgency
    });
  }
);
