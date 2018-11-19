import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";

import { Config, isEnabled } from "./config";
import { Vote } from "./cast-vote";

const config = functions.config() as Config;

export const updateStats = async (
  vote: Vote,
  voteId: string,
  statsDocument: FirebaseFirestore.DocumentReference
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
      [vote.value]: (previousCounters[vote.value] || 0) + 1
    };

    return transaction
      .set(statsDocument, updateCounters)
      .set(statsDocument.collection("votes").doc(voteId), {});
  });
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
    updateStats(
      vote,
      voteId,
      firebase
        .firestore()
        .collection(`stats-campaign`)
        .doc(vote.campaign)
    ).catch(e => {
      console.error(e);
    });
    updateStats(
      vote,
      voteId,
      firebase
        .firestore()
        .collection(`stats-campaign-agency`)
        .doc(`${vote.campaign}_${vote.agency}`)
    ).catch(e => {
      console.error(e);
    });
  });
