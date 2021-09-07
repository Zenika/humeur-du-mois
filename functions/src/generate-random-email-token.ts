import { firestore } from "firebase-admin";

export interface TokenData {
  employeeEmail: string;
  campaignId: string;
  agency?: string;
}

export async function generateAndSaveRandomEmailToken(
  data: TokenData,
  db: firestore.Firestore
): Promise<string> {
  const ref = await db.collection("token").add({ ...data });
  return ref.id;
}
