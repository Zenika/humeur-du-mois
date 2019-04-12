import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";

import { Config, isEnabled, asNumber } from "./config";

/**
 * TODO: Adapt the function to work with any collection and any condition
 */

const config = functions.config() as Config;
const deleteVotesBeforeConfigs = config.features.delete_votes_before;
const db = firebase.firestore();

const deleteCollection = (
  db: FirebaseFirestore.Firestore,
  query: FirebaseFirestore.Query
) => {
  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve, reject);
  });
};

const deleteQueryBatch = (
  db: FirebaseFirestore.Firestore,
  query: FirebaseFirestore.Query,
  resolve: (value?: {} | PromiseLike<{}> | undefined) => void,
  reject: (reason?: any) => void
) => {
  query
    .get()
    .then(snapshot => {
      // When there are no documents left, we are done
      if (snapshot.size == 0) {
        return 0;
      }

      // Delete documents in a batch
      var batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      return batch.commit().then(() => {
        return snapshot.size;
      });
    })
    .then(numDeleted => {
      if (numDeleted === 0) {
        resolve();
        return;
      }
      console.info(`Deleted ${numDeleted} rows`);
      // Recurse on the next process tick, to avoid
      // exploding the stack.
      process.nextTick(() => {
        deleteQueryBatch(db, query, resolve, reject);
      });
    })
    .catch(reject);
};

export const deleteVotesBefore = functions.https.onRequest((req, res) => {
  if (!isEnabled(deleteVotesBeforeConfigs)) {
    console.info("Delete votes before feature disabled, aborting...");
  }
  const authorizationHeader = req.get("Authorization") || "";
  const keyIsCorrect =
    authorizationHeader === `Bearer ${deleteVotesBeforeConfigs.key}`;
  if (!keyIsCorrect) {
    res.sendStatus(401);
    return;
  }
  if (!req.body.campaign) {
    console.error("No campaign specified, aborting...");
    return;
  }
  const campaignToUseAsLimit: string = req.body.campaign;
  const query = db
    .collection("vote")
    .where("campaign", "<", campaignToUseAsLimit)
    .limit(asNumber(deleteVotesBeforeConfigs.batch_size));
  deleteCollection(db, query).then(() => res.sendStatus(200));
});
