import { firestore } from "firebase-admin";
import * as functions from "firebase-functions";

export interface TokenData {
  employeeEmail: string;
  campaignId: string;
}

export interface TokenInfo extends TokenData {
  id: string;
}

export async function generateAndSaveRandomEmailToken(
  employeeEmail: string,
  campaignId: string,
  db: firestore.Firestore
): Promise<string> {
  const ref = await db
    .collection("token")
    .add({ employeeEmail: employeeEmail, campaignId: campaignId });
  return ref.id;
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
