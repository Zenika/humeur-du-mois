import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";

export interface Tick {
  receivedAt: firestore.Timestamp;
  emittedAt: firestore.Timestamp;
}

const pubSubToFirestoreFunction = (topic: string) =>
  functions.pubsub
    .schedule("0 0 * * *")
    .timeZone("Europe/Paris")
    .onRun(() =>
      firestore()
        .collection(topic)
        .add({
          receivedAt: firestore.Timestamp.now(),
          emittedAt: firestore.Timestamp.now()
        } as Tick)
    );

export const saveDailyTick = pubSubToFirestoreFunction("daily-tick");
