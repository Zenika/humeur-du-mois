import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";

export interface Tick {
  receivedAt: firestore.Timestamp;
  emittedAt: firestore.Timestamp;
}

const pubSubToFirestoreFunction = (topic: string) =>
  functions.pubsub.topic(topic).onPublish(event =>
    firestore()
      .collection(topic)
      .add({
        receivedAt: firestore.Timestamp.now(),
        emittedAt: firestore.Timestamp.fromDate(
          new Date(Buffer.from(event.data, "base64").toString())
        )
      } as Tick)
  );

export const saveDailyTick = pubSubToFirestoreFunction("daily-tick");
