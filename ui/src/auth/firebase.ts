import { Auth, signInWithCustomToken, signOut } from "firebase/auth";

import { exchangeToken } from "../api";
import { Session } from "./auth0";

export async function authenticate(
  { user, accessToken }: Session,
  { auth }: { auth: Auth }
) {
  const response = await exchangeToken(
    {
      userId: user.sub || "",
      accessToken: accessToken
    },
    { auth }
  );
  return await signInWithCustomToken(auth, response.token);
}

export async function signOutFirebase({ auth }: { auth: Auth }): Promise<void> {
  return signOut(auth);
}
