import * as firebase from "firebase-admin";
import * as functions from "firebase-functions";

const pubSubToFirestoreFunction = topic =>
  functions.pubsub.topic(topic).onPublish(event =>
    firebase
      .firestore()
      .collection(topic)
      .add({
        receivedAt: new Date().toISOString(),
        emittedAt: Buffer.from(event.data, "base64").toString()
      })
  );

export const saveDailyTick = pubSubToFirestoreFunction("daily-tick");
export const saveEndOfMonthStartsTick = pubSubToFirestoreFunction(
  "end-of-month-starts-tick"
);
export const saveEndOfMonthEndsTick = pubSubToFirestoreFunction(
  "end-of-month-ends-tick"
);
