import firebase from "firebase/app";
import { Session } from "./session-repository";

export async function authenticate({ user, accessToken }: Session) {
  const response = await fetch("/api/exchangeToken", {
    method: "POST",
    body: JSON.stringify({ userId: user.sub, accessToken: accessToken }),
    headers: { "Content-Type": "application/json" }
  });
  if (!response.ok) {
    throw new Error("Could not exchange token");
  }
  const firebaseToken = await response.text();
  await firebase.auth().signInWithCustomToken(firebaseToken);
}
