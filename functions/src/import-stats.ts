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
type StatisticToInsert = {
  great?: number;
  notThatGreat?: number;
  notGreatAtAll?: number;
  campaign: string;
  agency?: string;
};

const config = functions.config() as Config;
const importStatsConfigs = config.features.import_stats;
const db = firebase.firestore();

const buildAgencyStatsBatch = (
  validStats: StatisticToInsert[]
): FirebaseFirestore.WriteBatch => {
  const statsBatch = db.batch();
  validStats.forEach(validStat => {
    statsBatch.set(
      db
        .collection("stats-campaign-agency")
        .doc(`${validStat.campaign}_${validStat.agency}`),
      validStat
    );
  });
  return statsBatch;
};

const buildGlobalStatsBatch = (
  validStats: StatisticToInsert[]
): FirebaseFirestore.WriteBatch => {
  const statsBatch = db.batch();
  validStats.forEach((validStat, _) => {
    statsBatch.set(
      db.collection("stats-campaign").doc(`${validStat.campaign}`),
      validStat
    );
  });
  return statsBatch;
};

const convertValidStatsToDbObject = ({
  mood,
  agency,
  campaign
}: Statistic): StatisticToInsert => {
  return {
    ...mood,
    ...(agency && { agency }),
    campaign: campaign
  };
};

const fromJSONtoStats = (
  supposedlyValidStats: any
): [StatisticToInsert[], boolean] => {
  const validStats = new Map<string, StatisticToInsert>();
  let isAgencyStats = false;
  if (!supposedlyValidStats.stats)
    return [[...validStats.values()], isAgencyStats];
  supposedlyValidStats.stats
    .filter(
      (supposedlyValidStat: any) =>
        supposedlyValidStat.mood &&
        typeof supposedlyValidStat.mood === "object" &&
        supposedlyValidStat.campaign
    )
    .forEach((validStat: Statistic) => {
      if (validStat.agency) {
        isAgencyStats = true;
        validStats.set(
          `${validStat.campaign}_${validStat.agency}`,
          convertValidStatsToDbObject(validStat)
        );
      } else {
        validStats.set(
          `${validStat.campaign}`,
          convertValidStatsToDbObject(validStat)
        );
      }
    });
  console.info(
    `ignored ${supposedlyValidStats.stats.length -
      validStats.size} votes because they did not match the expected schema`
  );
  return [[...validStats.values()], isAgencyStats];
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
    if (!req.body) {
      console.error("statsData is null, aborting");
      res.sendStatus(422);
      return;
    }
    const [validStats, isAgencyStats] = fromJSONtoStats(req.body);

    /* Security mesure, to make sure we don't miss any of thoose. But it should really be called with
     * only agencies stats or only global stats
     */
    if (validStats.length <= 0) {
      console.error("statsData is empty, aborting");
      res.sendStatus(422);
      return;
    }
    const statsBatch = isAgencyStats
      ? buildAgencyStatsBatch(validStats)
      : buildGlobalStatsBatch(validStats);
    statsBatch
      .commit()
      .then(() => res.sendStatus(200))
      .catch(e => {
        console.error(e);
        res.sendStatus(500);
      });
  }
);
