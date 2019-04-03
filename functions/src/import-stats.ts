import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";

import { Config } from "./config";

type Statistic = {
  mood: {
    great?: number;
    notThatGreat?: number;
    notGreatAtAll?: number;
  };
  campaign: string;
  agency?: string;
};

const config = functions.config() as Config;
const importStatsConfigs = config.features.import_stats;
const db = firebase.firestore();

const fromJSONtoStats = (supposedlyValidStats: any) => {
  if (!supposedlyValidStats.stats) return [];
  const validStats: Statistic[] = supposedlyValidStats.stats.filter(
    (supposedlyValidStat: any) =>
      supposedlyValidStat.mood &&
      typeof supposedlyValidStat.mood === "object" &&
      supposedlyValidStat.campaign
  );
  console.info(
    `ignored ${supposedlyValidStats.stats.length -
      validStats.length} votes because they did not match the expected schema`
  );
  return validStats;
};

export const importStats = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    if (!importStatsConfigs.enabled) {
      console.info("Feature import stats disabled, aborting");
      return;
    }
    const authorizationHeader = req.get("Authorization") || "";
    const keyIsCorrect =
      authorizationHeader === `Bearer ${importStatsConfigs.key}`;
    if (!keyIsCorrect) {
      console.error("Passed the wrong auth key, aborting");
      res.sendStatus(403);
      return;
    }
    let validStats: Statistic[] = [];
    if (req.body) {
      validStats = fromJSONtoStats(req.body);
    } else {
      console.error("statsData is null, aborting");
      res.sendStatus(422);
      return;
    }
    if (validStats.length < 0) {
      console.error("statsData is empty, aborting");
      res.sendStatus(422);
      return;
    }
    /* Security mesure, to make sure we don't miss any of thoose. But it should really be called with
     * only agencies stats or only global stats
     */
    const validAgencyStats = validStats.filter(validStat => validStat.agency);
    const validGlobalStats = validStats.filter(validStat => !validStat.agency);
    if (validAgencyStats.length > 0) {
      computeAgencyStats(validAgencyStats, res)
        .commit()
        .then(() => res.sendStatus(200))
        .catch(e => {
          console.error(e);
          res.sendStatus(500);
        });
    } else if (validGlobalStats.length > 0) {
      computeGlobalStats(validGlobalStats, res)
        .commit()
        .then(() => res.sendStatus(200))
        .catch(e => {
          console.error(e);
          res.sendStatus(500);
        });
    } else {
      console.error("No data found, nothing was inserted");
      res.sendStatus(500);
    }
  }
);

const computeAgencyStats = (
  validStats: Statistic[],
  res: functions.Response
): FirebaseFirestore.WriteBatch => {
  const statsBatch = db.batch();
  for (const validStat of validStats) {
    const validStatToInsert = assignValidStatsToDbObject(
      { campaign: validStat.campaign, agency: validStat.agency },
      validStat
    );
    statsBatch.create(
      db
        .collection("stats-campaign-agency")
        .doc(`${validStat.campaign}_${validStat.agency}`),
      validStatToInsert
    );
  }
  return statsBatch;
};

const computeGlobalStats = (
  validStats: Statistic[],
  res: functions.Response
): FirebaseFirestore.WriteBatch => {
  const statsBatch = db.batch();
  for (const validStat of validStats) {
    const validStatToInsert = assignValidStatsToDbObject(
      { campaign: validStat.campaign },
      validStat
    );
    statsBatch.create(
      db.collection("stats-campaign").doc(`${validStat.campaign}`),
      validStatToInsert
    );
  }
  return statsBatch;
};

const assignValidStatsToDbObject = (
  validStatToInsert: { campaign: string; agency?: string },
  validStat: Statistic
) => {
  // Surely there's a better way to do this
  if (validStat.mood.great) {
    Object.assign(validStatToInsert, {
      great: validStat.mood.great
    });
  }
  if (validStat.mood.notThatGreat) {
    Object.assign(validStatToInsert, {
      notThatGreat: validStat.mood.notThatGreat
    });
  }
  if (validStat.mood.notGreatAtAll) {
    Object.assign(validStatToInsert, {
      notThatGreat: validStat.mood.notGreatAtAll
    });
  }
  return validStatToInsert;
};
