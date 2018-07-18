/**
 * Connects Auth0 with the Firebase authentication system.
 *
 * Inspired by https://community.auth0.com/t/no-way-to-delegate-firebase-token-with-v8-web-sdk/6904/7.
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import * as auth0 from "auth0-js";
import { Config } from "./config";

const config = functions.config() as Config;

export const exchangeToken = functions.https.onRequest((request, response) => {
  const { userId, accessToken } = request.body;
  if (!userId || !accessToken) {
    response.status(400).send("Missing fields in request body");
    return;
  }

  const auth0WebAuth = new auth0.WebAuth({
    domain: config.auth0.domain,
    clientID: config.auth0.client_id
  });

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

  auth0WebAuth.client.userInfo(accessToken, (userInfoErr, user) => {
    if (userInfoErr) {
      console.error(userInfoErr);
      response.status(401).send("Unauthorized");
    } else {
      if (userId === user.sub) {
        exchangeTokenApp
          .auth()
          .createCustomToken(userId)
          .then(customToken => {
            response.send(customToken);
          })
          .catch(error => {
            response.status(500).send("Error creating custom token");
          });
      } else {
        response.status(401).send("userId and accessToken do not match");
      }
    }
  });
});
