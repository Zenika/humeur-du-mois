import firebase from "firebase/app";
import { API_BASE_URL } from "../config";
import { Session } from "./session-repository";

const EXCHANGE_TOKEN_ENDPOINT_URL = `${API_BASE_URL}/exchangeToken`;

export async function authenticate({ user, accessToken }: Session) {
  const response = await fetch(EXCHANGE_TOKEN_ENDPOINT_URL, {
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
