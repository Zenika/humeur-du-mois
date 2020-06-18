import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";

export interface Tick {
  receivedAt: firestore.Timestamp;
  emittedAt: firestore.Timestamp;
}

const cron = "0 0 * * *";

const saveTickScheduledFunction = (topic: string) =>
  functions.pubsub
    .schedule(cron)
    .timeZone("Europe/Paris")
    .onRun(() => {
      firestore()
        .collection(topic)
        .add({
          receivedAt: firestore.Timestamp.now(),
          emittedAt: firestore.Timestamp.now()
        } as Tick);
    });

export const saveDailyTick = saveTickScheduledFunction("daily-tick");
