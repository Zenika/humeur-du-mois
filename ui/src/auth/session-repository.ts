export type Session = {
  user: auth0.Auth0UserProfile;
  accessToken: string;
  idToken: string;
  expiresAt: number;
};

const USER_STORAGE_KEY = "user";
const ACCESS_TOKEN_STORAGE_KEY = "access_token";
const ID_TOKEN_STORAGE_KEY = "id_token";
const EXPIRES_AT_STORAGE_KEY = "expires_at";

/**
 * Restores a valid, current session from storage.
 * If an incomplete or expired session is found, returns null.
 */
export function restore(): Session | null {
  const user = localStorage.getItem(USER_STORAGE_KEY);
  if (!user) return null;
  const accessToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  if (!accessToken) return null;
  const idToken = localStorage.getItem(ID_TOKEN_STORAGE_KEY);
  if (!idToken) return null;
  const expiresAtJson = localStorage.getItem(EXPIRES_AT_STORAGE_KEY);
  if (!expiresAtJson) return null;
  const expiresAt = JSON.parse(expiresAtJson) as number;
  if (new Date().getTime() >= expiresAt) return null;
  return {
    user: JSON.parse(user) as auth0.Auth0UserProfile,
    accessToken,
    idToken,
    expiresAt
  };
}

export function persist(session: Session) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user));
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, session.accessToken);
  localStorage.setItem(ID_TOKEN_STORAGE_KEY, session.idToken);
  localStorage.setItem(
    EXPIRES_AT_STORAGE_KEY,
    JSON.stringify(session.expiresAt)
  );
}

/**
 * Removes any session from storage.
 */
export function forget() {
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  localStorage.removeItem(ID_TOKEN_STORAGE_KEY);
  localStorage.removeItem(EXPIRES_AT_STORAGE_KEY);
}
