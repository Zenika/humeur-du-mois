import createAuth0Client, {
  Auth0Client,
  Auth0ClientOptions,
  User
} from "@auth0/auth0-spa-js";

export interface Session {
  user: User;
  accessToken: string;
}

export async function authenticate(
  config: Auth0ClientOptions
): Promise<{
  session?: Session;
  auth0Client: Auth0Client;
  err?: unknown;
}> {
  const auth0Client = await createAuth0Client(config);
  const { loginRequired, prompt, err } = await handleCallback(auth0Client);
  if (loginRequired) {
    await auth0Client.loginWithRedirect({
      prompt,
      redirect_uri: window.location.href
    });
    return { auth0Client };
  } else if (err) {
    return { auth0Client, err };
  }
  const user = await auth0Client.getUser();
  if (user) {
    const accessToken = await auth0Client.getTokenSilently();
    return { auth0Client, session: { user, accessToken } };
  } else {
    return { auth0Client };
  }
}

export async function signOutAuth0(auth0Client: Auth0Client): Promise<void> {
  await auth0Client.logout({ returnTo: window.location.href });
}

async function handleCallback(
  auth0Client: Auth0Client
): Promise<{
  loginRequired: boolean;
  prompt?: "none" | "login";
  err?: unknown;
}> {
  try {
    await auth0Client.handleRedirectCallback();
    removeAuthState();
    return { loginRequired: false };
  } catch (err) {
    removeAuthState();
    if (err instanceof Error) {
      if (err.message === "There are no query params available for parsing.") {
        return { loginRequired: true, prompt: "none", err };
      } else if (err.message === "Login required") {
        return { loginRequired: true, prompt: "login", err };
      }
    }
    return { loginRequired: false, err };
  }
}

function removeAuthState() {
  window.history.replaceState({}, document.title, window.location.pathname);
}
