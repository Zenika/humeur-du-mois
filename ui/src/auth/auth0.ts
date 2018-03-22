import auth0 from "auth0-js";
import { Session } from "./session-repository";
import * as sessionRepository from "./session-repository";

async function parseHash(webAuth: auth0.WebAuth) {
  return new Promise<auth0.Auth0DecodedHash>((resolve, reject) =>
    webAuth.parseHash((err, result) => {
      window.location.hash = "";
      return err ? reject(err) : resolve(result);
    })
  );
}

async function getUserInfo(webAuth: auth0.WebAuth, accessToken: string) {
  return new Promise<auth0.Auth0UserProfile>((resolve, reject) =>
    webAuth.client.userInfo(
      accessToken,
      (err, result) => (err ? reject(err) : resolve(result))
    )
  );
}

async function convertToSession(
  webAuth: auth0.WebAuth,
  authResult: auth0.Auth0DecodedHash
): Promise<Session | null> {
  if (!authResult) return null;
  const { accessToken, idToken, expiresIn } = authResult;
  if (!accessToken || !idToken || !expiresIn) return null;
  const user = await getUserInfo(webAuth, accessToken);
  const expiresAt = expiresIn * 1000 + new Date().getTime();
  return { user, accessToken, idToken, expiresAt };
}

export async function authenticate(
  config: auth0.AuthOptions
): Promise<Session | null> {
  const webAuth = new auth0.WebAuth(config);
  const authResult = await parseHash(webAuth);
  const session =
    (await convertToSession(webAuth, authResult)) ||
    sessionRepository.restore();
  if (session) {
    await sessionRepository.persist(session);
    return session;
  } else {
    sessionRepository.forget(); // ensures nothing is left hanging
    webAuth.authorize(); // this triggers a redirect to Auth0
    return null;
  }
}
