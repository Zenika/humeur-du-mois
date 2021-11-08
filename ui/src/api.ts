import firebase from "firebase/app";

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

const authorizationHeader = async (): Promise<string> => {
  const currentUser = firebase.auth().currentUser;
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

export const call = async (functionName: string, payload: any) => {
  const response = await fetch(`/api/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: await authorizationHeader()
    },
    body: JSON.stringify({ data: payload })
  });
  const { result, error } = await response.json();
  if (!response.ok) {
    throw new ApiCallError(error.message, error.status);
  }
  return result;
};

export const exchangeToken = (payload: {
  userId: string;
  accessToken: string;
}) => call("exchangeToken", payload) as Promise<{ token: string }>;

export const getCurrentCampaignState = () =>
  call("getCurrentCampaignState", {}) as Promise<{
    campaign: string | null;
    alreadyVoted: boolean;
    voteToken: string;
  }>;

export const castVote = (payload: Payload) =>
  call("castVote", payload) as Promise<void>;
