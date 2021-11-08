import firebase from "firebase/app";
import { exchangeToken } from "../api";
import { Session } from "./auth0";

export async function authenticate({ user, accessToken }: Session) {
  const response = await exchangeToken({
    userId: user.sub || "",
    accessToken: accessToken
  });
  return await firebase.auth().signInWithCustomToken(response.token);
}

export async function signOutFirebase(): Promise<void> {
  return firebase.auth().signOut();
}
