import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import { Config, isEnabled, asNumber, asBoolean } from "./config";
import { computeCurrentCampaign } from "./compute-current-campaign";
import { Employee } from "./import-employees-from-alibeez";

import { allowCorsEmail } from "./cors";
import { fetchTokenData, TokenDataWithId } from "./generate-random-email-token";

const db = firestore();
const config = functions.config() as Config;
const requireUniqueVote = asBoolean(
  config.features.voting_campaigns.require_unique_vote
);
const validVotes = ["great", "ok", "notThatGreat", "notGreatAtAll"] as const;
type VoteValue = typeof validVotes[number];

interface RequestPayload {
  vote: VoteValue;
  comment?: string;
  voteToken: string;
}

export type VoteType = "ui" | "amp";

export interface Vote extends Employee {
  value: VoteValue;
  comment?: string;
  campaign: string;
  recordedAt: firestore.Timestamp;
  voteFromUi?: boolean; //States if votes comes from Ui. If not, sendEmailToManager will abort
  voteType?: VoteType;
  emailToManagerSent?: boolean;
}

// Vote from the UI
export const castVote = functions.https.onCall(
  async (payload: RequestPayload, context: any) => {
    const voterEmail: string = context.auth!.token.email;
    const voteValue = payload.vote;
    const comment = payload.comment;
    const voteToken = payload.voteToken;
    const tokenData = await fetchTokenData(voteToken);
    if (tokenData.employeeEmail !== voterEmail) {
      throw new functions.https.HttpsError(
        "permission-denied",
        `token is not yours`
      );
    }
    await doVote(voteValue, comment || "", tokenData, "ui");
  }
);

// Vote from email
export const castVoteFromEmail = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    if (!allowCorsEmail(req, res)) {
      return;
    }

    const tokenId = req.body.token;
    const tokenData = await fetchTokenData(tokenId);
    try {
      await doVote(req.body.vote, req.body.comment, tokenData, "amp");
      res.status(200).send({
        message: `Thanks!`
      });
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) {
        res.status(error.httpErrorCode.status).send({
          error: error.toJSON()
        });
      } else {
        res.status(500).send({
          error: {
            message: error.message
          }
        });
      }
    }
  }
);

async function doVote(
  voteValue: VoteValue,
  comment: string,
  token: TokenDataWithId,
  voteType: VoteType
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

  if (token.type !== "vote") {
    throw new functions.https.HttpsError(
      "permission-denied",
      `token is not a vote token`
    );
  }

  if (campaign.id !== token.campaignId) {
    throw new functions.https.HttpsError(
      "permission-denied",
      `token is not a valid token for this campaign`
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
    .doc(token.employeeEmail)
    .get();
  if (!employeeSnapshot || !employeeSnapshot.exists) {
    throw new functions.https.HttpsError("not-found", `employee not found`);
  }
  const employee = employeeSnapshot.data() as Employee;

  const vote: Vote = {
    campaign: campaign.id,
    recordedAt: firestore.Timestamp.fromDate(voteDate),
    value: voteValue,
    voteFromUi: true,
    voteType,
    ...employee
  };
  if (comment) {
    vote.comment = comment;
  }
  if (requireUniqueVote) {
    try {
      await db
        .collection("vote")
        .doc(`${campaign.id}-${token.id}`)
        .create(vote);
    } catch (err: any) {
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
