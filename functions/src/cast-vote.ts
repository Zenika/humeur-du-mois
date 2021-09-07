import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import { Config, isEnabled, asNumber, asBoolean } from "./config";
import { computeCurrentCampaign } from "./compute-current-campaign";
import { Employee } from "./import-employees-from-alibeez";
import { TokenData } from "./generate-random-email-token";

const db = firestore();
const config = functions.config() as Config;
const requireUniqueVote = asBoolean(
  config.features.voting_campaigns.require_unique_vote
);
const validVotes = ["great", "ok", "notThatGreat", "notGreatAtAll"];

interface RequestPayload {
  vote: string;
  comment: string;
  token: string;
}

export interface Vote extends Employee {
  value: string;
  comment?: string;
  campaign: string;
  recordedAt: firestore.Timestamp;
  voteFromUi?: boolean; //States if votes comes from Ui. If not, sendEmailToManager will abort
  emailToManagerSent?: boolean;
}

// Vote from the UI
export const castVote = functions.https.onCall(
  async (payload: RequestPayload, context: any) => {
    const voterEmail: string = context.auth!.token.email;
    const voteValue = payload.vote;
    const comment = payload.comment;
    await doVote(voteValue, voterEmail, comment, context.auth!.uid);
  }
);

// Vote from email
export const emailVote = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    const email = req.header("AMP-Email-Sender");
    if (!email || config.features.emails.sender.email !== email) {
      res.status(401).send({
        message: "Bad Email"
      });
      return;
    }
    res.set("AMP-Email-Allow-Sender", config.features.emails.sender.email);

    const token = req.body.token;
    const tokenSnapshot = await db.collection("token").doc(token).get();
    if (!tokenSnapshot) {
      res.status(401).send({
        message: "Bad Token"
      });
      return;
    }
    const tokenData = tokenSnapshot.data() as TokenData;
    try {
      console.log(`Vote ${req.body.vote} by ${tokenData.employeeEmail}`);
      await doVote(
        req.body.vote,
        tokenData.employeeEmail,
        req.body.comment,
        token
      );
      res.status(200).send({
        message: `Vote ${req.body.vote} with ${req.body.comment} saved `
      });
    } catch (err) {
      console.log(err);
      console.log(req.body.vote, email, req.body.comment, token);
      res.status(400).send({
        error: err,
        message: `Error`
      });
    }
  }
);
async function doVote(
  voteValue: string,
  voterEmail: string,
  comment: string,
  token: string
) {
  const voteDate = new Date();
  const campaign = computeCurrentCampaign(voteDate, {
    enabled: isEnabled(config.features.voting_campaigns),
    startOn: asNumber(config.features.voting_campaigns.start_on),
    endOn: asNumber(config.features.voting_campaigns.end_on)
  });
  if (!campaign.open) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "No campaign currently opened",
      {
        voteDate
      }
    );
  }
  if (!validVotes.includes(voteValue)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `'${voteValue}' is not a valid value for 'vote'`
    );
  }
  const employeeSnapshot = await db
    .collection("employees")
    .doc(voterEmail)
    .get();
  if (!employeeSnapshot) {
    throw new functions.https.HttpsError(
      "not-found",
      `failed to load latest employees import`
    );
  }
  const employee = employeeSnapshot.data() as Employee | undefined;

  if (!employee) {
    throw new functions.https.HttpsError("not-found", `Employee not found`);
  }

  const vote: Vote = {
    campaign: campaign.id,
    recordedAt: firestore.Timestamp.fromDate(voteDate),
    value: voteValue,
    voteFromUi: true,
    ...employee
  };
  if (comment) {
    vote.comment = comment;
  }
  if (requireUniqueVote) {
    try {
      await db.collection("vote").doc(`${campaign.id}-${token}`).create(vote);
    } catch (err) {
      if (err.code === 6 /* ALREADY_EXISTS */) {
        throw new functions.https.HttpsError(
          "already-exists",
          "Looks like you have already voted.",
          {
            voteDate
          }
        );
      }
      throw err;
    }
  } else {
    await db.collection("vote").add(vote);
  }
}
