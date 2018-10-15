import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";

import { Config, isEnabled } from "./config";
import { updateStatsFunction } from "./update-stats";
import { Vote } from "./cast-vote";

const config = functions.config() as Config;
const adminKey: string = config.features.compute_statistics.key;
const db = firebase.firestore();

export const computeStatistics = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    if (!config.features.compute_statistics.enabled) {
      console.info("Compute statistics feature is disabled; aborting");
      return;
    }
    const passedData = req.get("Authorization") || "";
    const passedKey = passedData.toString() === `Bearer ${adminKey}`;
    if (!passedKey) {
      console.info("function's payload passed the wrong admin key; aborting");
      return;
    }
    await deleteCollection(db, "stats", 100);
    const votes = await db.collection("vote").get();
    console.info(`Starting updating stats, votes list size is ${votes.size}`);
    for (const vote of votes.docs) {
      console.info(`Update stats for vote ${vote.id}`);
      await updateStatsFunction(vote.data() as Vote, vote.id);
    }
    res.send("done");
  }
);

async function deleteCollection(
  fireStore: FirebaseFirestore.Firestore,
  collectionPath: string,
  batchSize: number
) {
  console.info(`Trying to delete collection ${collectionPath}`);
  const collectionRef = fireStore.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(fireStore, query, batchSize, resolve, reject).catch(
      reject
    );
  });
}

async function deleteQueryBatch(
  fireStore: FirebaseFirestore.Firestore,
  query: FirebaseFirestore.Query,
  batchSize: number,
  resolve,
  reject
) {
  query
    .get()
    .then(async snapshot => {
      // When there are no documents left, we are done
      if (snapshot.size === 0) {
        console.info("Size is <= 0, aborting deletion");
        return 0;
      }
      // Delete documents in a batch
      const batch = fireStore.batch();
      for (const doc of snapshot.docs) {
        const collections = await doc.ref.getCollections();
        collections.forEach(collection => {
          console.log(`Found subcollection ${collection.id}`);
          deleteCollection(fireStore, collection.path, 100).catch(reject);
        });
      }
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

      // Recurse on the next process tick, to avoid
      // exploding the stack.
      process.nextTick(() => {
        console.info(`Deleting batch of size ${batchSize}`);
        deleteQueryBatch(fireStore, query, batchSize, resolve, reject).catch(
          reject
        );
      });
    })
    .catch(reject);
}
