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
}> {
  const auth0Client = await createAuth0Client(config);
  try {
    await auth0Client.handleRedirectCallback();
  } catch (err) {
    await auth0Client.loginWithRedirect({ prompt: "none" });
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
