import { firestore } from "firebase-admin";
import { isDocumentAlreadyExistsError } from "./already-exists";
import { DocumentSnapshot } from "firebase-functions/lib/providers/firestore";

/**
 * This file implements a distributed lock system based on the unicity of
 * document ids in Firestore collections.
 */

/**
 * For any given pair of functionName and callId, returns true on its first
 * call, then returns false for every subsequent call.
 *
 * @param firestoreInstance
 * @param functionName
 * @param callId
 */
export const acquireLock = async (
  firestoreInstance: firestore.Firestore,
  functionName: string,
  callId: string
): Promise<boolean> => {
  try {
    await firestoreInstance
      .collection("functions-call-traces")
      .doc(functionName)
      .collection("call-traces")
      .doc(callId)
      .create({ recordedAt: firestore.Timestamp.now() });
    return true;
  } catch (err) {
    if (isDocumentAlreadyExistsError(err)) {
      return false;
    }
    throw err;
  }
};

type FirestoreTriggerHandler = (snapshot: DocumentSnapshot) => void;

/**
 * Given a function that handles Firestore triggers, return a new such handler
 * that is guaranteed to ever run once.
 *
 * @param firestoreInstance
 * @param functionName
 * @param fn
 */
export const ensureCalledOnce = (
  firestoreInstance: firestore.Firestore,
  functionName: string,
  fn: FirestoreTriggerHandler
): FirestoreTriggerHandler => {
  return async (snapshot: DocumentSnapshot) => {
    const lockAcquired = await acquireLock(
      firestoreInstance,
      functionName,
      snapshot.id
    );
    if (!lockAcquired) {
      console.info("duplicate call detected; aborting");
      return;
    }
    fn(snapshot);
  };
};
