import { firestore } from "firebase-admin";

export interface TokenData {
  employeeEmail: string;
  campaignId: string;
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
