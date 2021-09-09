import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";

export interface TokenData {
  employeeEmail: string;
  campaignId: string;
}

export interface TokenInfo extends TokenData {
  id: string;
}
const db = firestore();

export async function generateAndSaveRandomEmailToken(
  tokenData: TokenData
): Promise<string> {
  const ref = await db.collection("token").add(tokenData);
  return ref.id;
}

export async function getOrGenerateRandomEmailToken(tokenData: TokenData) {
  const voteTokenQueryResults = await db
    .collection("token")
    .where("employeeEmail", "==", tokenData.employeeEmail)
    .where("campaign", "==", tokenData.campaignId)
    .get();

  let voteToken = voteTokenQueryResults.empty
    ? await generateAndSaveRandomEmailToken(tokenData)
    : voteTokenQueryResults.docs[0].id;
  return voteToken;
}

export async function decodeTokenData(tokenId: string): Promise<TokenInfo> {
  const tokenSnapshot = await db.collection("token").doc(tokenId).get();
  if (!tokenSnapshot || !tokenSnapshot.exists) {
    throw new functions.https.HttpsError(
      "permission-denied",
      `token is unknown`
    );
  }
  const tokenData = tokenSnapshot.data() as TokenData;
  return { id: tokenId, ...tokenData };
}
