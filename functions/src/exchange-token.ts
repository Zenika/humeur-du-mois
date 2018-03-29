/**
 * Connects Auth0 with the firebase Authentication system.
 *
 * Inspired by https://community.auth0.com/t/no-way-to-delegate-firebase-token-with-v8-web-sdk/6904/7.
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import * as auth0 from "auth0-js";
import * as cors from "cors";

const applyCors = cors({ origin: true });

interface Config {
  firebase: admin.AppOptions;
  serviceaccount?: string;
  auth0?: {
    domain?: string;
    clientid?: string;
  };
}

export const exchangeToken = functions.https.onRequest((request, response) => {
  applyCors(request, response, () => {
    const { userId, accessToken } = request.body;
    if (!userId || !accessToken) {
      response.status(400).send("Missing fields in request body");
      return;
    }
    const config: Config = functions.config() as Config;
    if (
      !config.serviceaccount ||
      !config.auth0 ||
      !config.auth0.domain ||
      !config.auth0.clientid
    ) {
      response.status(500).send("Incomplete configuration");
      return;
    }

    const auth0WebAuth = new auth0.WebAuth({
      domain: config.auth0.domain,
      clientID: config.auth0.clientid
    });

    if (admin.apps.length === 0) {
      admin.initializeApp({
        ...config.firebase,
        credential: admin.credential.cert(config.serviceaccount)
      });
    }

    auth0WebAuth.client.userInfo(accessToken, (userInfoErr, user) => {
      if (userInfoErr) {
        console.error(userInfoErr);
        response.status(401).send("Unauthorized");
      } else {
        if (userId === user.sub) {
          admin
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
});
