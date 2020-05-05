import firebase from "firebase/app";

export type Payload = {
  vote: string;
  comment?: string;
};

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
    throw error;
  }
  return result;
};

export const exchangeToken = (payload: {
  userId: string;
  accessToken: string;
}) => call("exchangeToken", payload) as Promise<{ token: string }>;

export const getInitialState = () =>
  call("getInitialState", {}) as Promise<{ campaign: string | null, alreadyVoted: boolean }>;

export const castVote = (payload: Payload) =>
  call("castVote", payload) as Promise<void>;

