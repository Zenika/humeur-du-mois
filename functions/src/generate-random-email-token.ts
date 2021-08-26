import { randomBytes } from "crypto";
import { firestore } from "firebase-admin";

export async function generateAndSaveRandomEmailToken(
  employeeEmail: string,
  campaignId: string,
  db: firestore.Firestore
): Promise<string> {
  const token = generateRandomEmailToken();
  await db
    .collection("token")
    .doc(token)
    .create({ employeeEmail: employeeEmail, campaignId: campaignId });
  return token;
}

function generateRandomEmailToken() {
  return encodeAsBase64Url(randomBytes(64));
}

function encodeAsBase64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=*$/, "");
}
