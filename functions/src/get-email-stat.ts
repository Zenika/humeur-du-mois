import * as functions from "firebase-functions";
import { firestore } from "firebase-admin";
import { TokenData } from "./generate-random-email-token";
import { allowCorsEmail } from "./cors";
import { computeCurrentCampaign } from "./compute-current-campaign";
import { asNumber, Config, isEnabled } from "./config";
import { Employee } from "./import-employees-from-alibeez";

const db = firestore();
const config = functions.config() as Config;

export const getEmailStat = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    if (!allowCorsEmail(req, res)) {
      return;
    }
    const token = req.query.token;
    if (!token) {
      res.status(401).send({
        message: "no token provided"
      });
      return;
    }
    const tokenSnapshot = await db.collection("token").doc(token).get();
    if (!tokenSnapshot || !tokenSnapshot.exists) {
      res.status(403).send({
        message: "provided token is unknown"
      });
      return;
    }
    const tokenData = tokenSnapshot.data() as TokenData;
    if (tokenData.type !== "vote") {
      res.status(403).send({
        message: "provided token not authorized to access vote stats"
      });
      return;
    }

    if (!token.employeeEmail) {
      res.status(501).send({
        message: "employeeEmail in token not found"
      });
    }
    const employeeSnapshot = await db
      .collection("employees")
      .doc(token.employeeEmail)
      .get();
    if (!employeeSnapshot || !employeeSnapshot.exists) {
      res.status(403).send({
        message: "employee not found"
      });
    }
    const employee = employeeSnapshot.data() as Employee;

    const voteDate = new Date();
    const campaign = computeCurrentCampaign(voteDate, {
      enabled: isEnabled(config.features.voting_campaigns),
      startOn: asNumber(config.features.voting_campaigns.start_on),
      endOn: asNumber(config.features.voting_campaigns.end_on)
    });

    const vote = await db
      .collection("vote")
      .doc(`${tokenData.campaignId}-${token}`)
      .get();

    const statsAgency = await db
      .collection("stats-campaign-agency")
      .doc(`${tokenData.campaignId}_${employee.agency}`)
      .get();

    const statsGlobal = await db
      .collection("stats-campaign")
      .doc(`${tokenData.campaignId}`)
      .get();

    res.status(200).send({
      campaign: tokenData.campaignId,
      campaignOpen: campaign.open,
      alreadyVoted: vote.exists,
      manager: employee.managerEmail,
      fullname: employee.fullName,
      agency: {
        great: 0,
        notGreatAtAll: 0,
        notThatGreat: 0,
        ok: 0,
        ...(statsAgency.exists ? statsAgency.data() : {})
      },
      global: {
        great: 0,
        notGreatAtAll: 0,
        notThatGreat: 0,
        ok: 0,
        ...(statsGlobal.exists ? statsGlobal.data() : {})
      }
    });
  }
);
