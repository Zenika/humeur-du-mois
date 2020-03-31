import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";

import { Config, isEnabled } from "./config";
import { Vote } from "./cast-vote";

const config = functions.config() as Config;

export const updateStats = async (
  voteValue: string,
  voteId: string,
  statsDocument: FirebaseFirestore.DocumentReference,
  additionnalFields: object = {}
) => {
  await firebase.firestore().runTransaction(async transaction => {
    const previousCounters = await transaction
      .get(statsDocument)
      .then(snapshot => snapshot.data() || {});
    const storedVote = await transaction.get(
      statsDocument.collection("votes").doc(voteId)
    );
    //To prevent double calls to updateStats from occuring
    if (storedVote.exists) {
      return;
    }
    const updateCounters = {
      ...previousCounters,
      ...additionnalFields,
      [voteValue]: (previousCounters[voteValue] || 0) + 1
    };
    return transaction
      .set(statsDocument, updateCounters)
      .set(statsDocument.collection("votes").doc(voteId), {});
  });
};

export const getStatsRefsToUpdate = (vote: Vote) => {
  return [
    {
      ref: firebase.firestore().collection(`stats-campaign`).doc(vote.campaign),
      additionnalFields: {
        campaign: vote.campaign
      }
    },
    {
      ref: firebase
        .firestore()
        .collection(`stats-campaign-agency`)
        .doc(`${vote.campaign}_${vote.agency}`),
      additionnalFields: {
        campaign: vote.campaign,
        agency: vote.agency
      }
    }
  ];
};
export const updateStatsOnVote = functions.firestore
  .document("vote/{voteId}")
  .onCreate(async voteSnapshot => {
    if (!isEnabled(config.features.collect_stats)) {
      console.info("feature is disabled; aborting");
      return;
    }
    const vote = voteSnapshot.data()! as Vote;
    const voteId: string = voteSnapshot.id;
    const statsRefs = getStatsRefsToUpdate(vote);
    statsRefs.forEach(statsRef => {
      updateStats(
        vote.value,
        voteId,
        statsRef.ref,
        statsRef.additionnalFields
      ).catch(e => {
        console.error(e);
      });
    });
  });
