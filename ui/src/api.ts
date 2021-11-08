import { Auth, getAuth } from "firebase/auth";

export type Payload = {
  vote: string;
  comment?: string;
  voteToken: string;
};

export class ApiCallError extends Error {
  status: string;
  constructor(message: string, status: string) {
    super(message);
    this.status = status;
  }
}

const authorizationHeader = async (auth: Auth): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return "";
  }
  try {
    const apiToken = await currentUser.getIdToken();
    return `Bearer ${apiToken}`;
  } catch (err) {
    return "";
  }
};

export const call = async (
  functionName: string,
  payload: any,
  { auth }: { auth: Auth }
) => {
  const response = await fetch(`/api/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: await authorizationHeader(auth)
    },
    body: JSON.stringify({ data: payload })
  });
  const { result, error } = await response.json();
  if (!response.ok) {
    throw new ApiCallError(error.message, error.status);
  }
  return result;
};

export const exchangeToken = (
  payload: {
    userId: string;
    accessToken: string;
  },
  { auth }: { auth: Auth }
) => call("exchangeToken", payload, { auth }) as Promise<{ token: string }>;

export const getCurrentCampaignState = ({ auth }: { auth: Auth }) =>
  call("getCurrentCampaignState", {}, { auth }) as Promise<{
    campaign: string | null;
    alreadyVoted: boolean;
    voteToken: string;
  }>;

export const castVote = (payload: Payload, { auth }: { auth: Auth }) =>
  call("castVote", payload, { auth }) as Promise<void>;
