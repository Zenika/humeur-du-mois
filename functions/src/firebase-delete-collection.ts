//From firebase documentation: https://firebase.google.com/docs/firestore/manage-data/delete-data#collections

export const deleteCollection = async (
  fireStore: FirebaseFirestore.Firestore,
  collectionPath: string,
  batchSize: number
) => {
  const collectionRef = fireStore.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(fireStore, query, batchSize, resolve, reject).catch(
      reject
    );
  });
};

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
        return 0;
      }
      // Delete documents in a batch
      const batch = fireStore.batch();
      for (const doc of snapshot.docs) {
        const collections = await doc.ref.getCollections();
        collections.forEach(async collection => {
          await deleteCollection(fireStore, collection.path, 100).catch(reject);
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
      process.nextTick(async () => {
        await deleteQueryBatch(
          fireStore,
          query,
          batchSize,
          resolve,
          reject
        ).catch(reject);
      });
    })
    .catch(reject);
}
