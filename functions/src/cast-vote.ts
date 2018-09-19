import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";
import { Config, isEnabled, asNumber, asBoolean } from "./config";
import { computeCurrentCampaign } from "./compute-current-campaign";

const db = firestore();
const config = functions.config() as Config;
const requireUniqueVote = asBoolean(
  config.features.voting_campaigns.require_unique_vote
);
const validVotes = ["great", "notThatGreat", "notGreatAtAll"];

interface RequestPayload {
  vote: string;
  voter: string;
}

export interface Vote {
  value: string;
  voter: string;
  campaign: string;
  recordedAt: firestore.Timestamp;
  agency: string;
}

export const castVote = functions.https.onCall(
  async (payload: RequestPayload, context) => {
    if (!validVotes.includes(payload.vote)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `'${payload.vote}' is not a valid value for 'vote'`
      );
    }
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
    const latestImport = await db
      .collection("employee-imports")
      .orderBy("at", "desc")
      .limit(1)
      .get()
      .then(result => result.docs[0]);
    if (!latestImport) {
      throw new functions.https.HttpsError(
        "not-found",
        `failed to load latest employees import`
      );
    }
    const employeeSnapshot = await latestImport.ref
      .collection("employees")
      .doc(payload.voter)
      .get();
    const employee = employeeSnapshot.data();
    if(!employee){
      throw new functions.https.HttpsError(
        "not-found",
        `Employee not found`
      );
    }


    const vote: Vote = {
      campaign: campaign.id,
      recordedAt: firestore.Timestamp.fromDate(voteDate),
      voter: payload.voter,
      value: payload.vote,
      agency: employee.agency
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
