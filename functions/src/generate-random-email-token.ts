import { randomBytes } from "crypto";

export function generateRandomEmailToken() {
  return encodeAsBase64Url(randomBytes(64));
}

function encodeAsBase64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=*$/, "");
}
