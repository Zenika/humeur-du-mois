import firebase from "firebase/app";
import { Session } from "./session-repository";
import { exchangeToken } from "../api";

export async function authenticate({ user, accessToken }: Session) {
  const response = await exchangeToken({
    userId: user.sub,
    accessToken: accessToken
  });
  return await firebase.auth().signInWithCustomToken(response.token);
}
