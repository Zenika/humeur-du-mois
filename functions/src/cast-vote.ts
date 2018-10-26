import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import { Config, isEnabled, asNumber, asBoolean } from "./config";
import { computeCurrentCampaign } from "./compute-current-campaign";
import { Employee } from "./import-employees-from-alibeez";
import { is } from "typescript-is"

const db = firestore();
const config = functions.config() as Config;
const requireUniqueVote = asBoolean(
  config.features.voting_campaigns.require_unique_vote
);

interface RequestPayload {
  vote: "great" | "notSoGreat" | "notGreatAtAll";
}

export interface Vote extends Employee {
  value: string;
  campaign: string;
  recordedAt: firestore.Timestamp;
  voteFromUi?: boolean; //States if votes comes from Ui. If not, sendEmailToManager will abort
}

export const castVote = functions.https.onCall(
  async (payload: unknown, context) => {
    if (!is<RequestPayload>(payload)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "value for 'vote' is not valid"
      );
    }
    const voterEmail: string = context.auth!.token.email;
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
      .doc(voterEmail)
      .get();
    const employee = employeeSnapshot.data() as Employee | undefined;
    if (!employee) {
      throw new functions.https.HttpsError("not-found", `Employee not found`);
    }

    const vote: Vote = {
      campaign: campaign.id,
      recordedAt: firestore.Timestamp.fromDate(voteDate),
      value: payload.vote,
      voteFromUi: true,
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
