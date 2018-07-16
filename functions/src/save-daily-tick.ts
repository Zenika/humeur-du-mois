import * as firebase from "firebase-admin";
import * as functions from "firebase-functions";

export const saveDailyTick = functions.pubsub
  .topic("daily-tick")
  .onPublish(event =>
    firebase
      .firestore()
      .collection("daily-ticks")
      .add(event.toJSON())
  );
