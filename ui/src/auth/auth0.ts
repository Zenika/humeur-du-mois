import auth0 from "auth0-js";
import { Session } from "./session-repository";
import * as sessionRepository from "./session-repository";

async function parseHash(webAuth: auth0.WebAuth) {
  return new Promise<auth0.Auth0DecodedHash | null>((resolve, reject) =>
    webAuth.parseHash((err, decodedHash) => {
      window.location.hash = "";
      return err ? reject(err) : resolve(decodedHash);
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
  decodedHash: auth0.Auth0DecodedHash | null
): Promise<Session | null> {
  if (!decodedHash) return null;
  const { accessToken, idToken, expiresIn } = decodedHash;
  if (!accessToken || !idToken || !expiresIn) return null;
  const user = await getUserInfo(webAuth, accessToken);
  const expiresAt = expiresIn * 1000 + new Date().getTime();
  return { user, accessToken, idToken, expiresAt };
}

export async function authenticate(
  config: auth0.AuthOptions
): Promise<Session | null> {
  const webAuth = new auth0.WebAuth(config);
  const decodedHash = await parseHash(webAuth);
  const session =
    (await convertToSession(webAuth, decodedHash)) ||
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
