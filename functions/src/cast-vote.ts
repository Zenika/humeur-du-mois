import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import { Config, isEnabled, asNumber, asBoolean } from "./config";
import { computeCurrentCampaign } from "./compute-current-campaign";
import { Employee } from "./import-employees-from-alibeez";

const db = firestore();
const config = functions.config() as Config;
const requireUniqueVote = asBoolean(
  config.features.voting_campaigns.require_unique_vote
);
const validVotes = ["great", "notThatGreat", "notGreatAtAll"];

interface RequestPayload {
  vote: string;
}

export interface Vote extends Employee {
  value: string;
  campaign: string;
  recordedAt: firestore.Timestamp;
}

export const castVote = functions.https.onCall(
  async (payload: RequestPayload, context) => {
    if (!validVotes.includes(payload.vote)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `'${payload.vote}' is not a valid value for 'vote'`
      );
    }
    const userEmail: string = context.auth!.token.email;
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

    const employeeSnapshot = await db
      .collection("employees")
      .doc(userEmail)
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
      value: payload.vote,
      ...employee
    };

    if (requireUniqueVote) {
      try {
        await db
          .collection("vote")
          .doc(`${campaign.id}-${context.auth!.uid}`)
          .create(vote);
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
);
