/**
 * Connects Auth0 with the Firebase authentication system.
 *
 * Inspired by https://community.auth0.com/t/no-way-to-delegate-firebase-token-with-v8-web-sdk/6904/7.
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { AuthenticationClient } from "auth0";
import { Config } from "./config";

const config = functions.config() as Config;
const exchangeTokenApp = admin.initializeApp(
  {
    credential: admin.credential.cert({
      clientEmail: config.service_account.client_email,
      privateKey: config.service_account.private_key,
      projectId: config.service_account.project_id
    })
  },
  "exchangeToken"
);

interface RequestPayload {
  userId?: string;
  accessToken?: string;
}

const errorResponse = message => ({ error: { message } });

/**
 * Cannot use functions.https.onCall here because this function is called
 * before the user is authenticated to Firebase.
 */
export const exchangeToken = functions.https.onRequest((request, response) => {
  const { userId, accessToken } = request.body.data as RequestPayload;
  if (!userId || !accessToken) {
    response.status(400).send(errorResponse("Missing fields in request body"));
    return;
  }

  const authenticationClient = new AuthenticationClient({
    domain: config.auth0.domain,
    clientId: config.auth0.client_id
  });

  authenticationClient.getProfile(accessToken, async (userInfoErr, user: any) => {
    if (userInfoErr) {
      console.error(userInfoErr);
      response.status(401).send(errorResponse("Unauthorized"));
      return;
    } else if (userId !== user.sub) {
      response
        .status(401)
        .send(errorResponse("userId and accessToken do not match"));
      return;
    }
    try {
      const customToken = await exchangeTokenApp
        .auth()
        .createCustomToken(userId);
      response.send({ result: { token: customToken } });
    } catch (err) {
      response.status(500).send(errorResponse("Error creating custom token"));
    }
  });
});
