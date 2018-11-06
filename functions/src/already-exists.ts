// From https://github.com/googleapis/nodejs-firestore/blob/v0.18.0/dev/src/watch.ts#L91
const ALREADY_EXISTS_FIRESTORE_ERROR_CODE = 6;

export const isDocumentAlreadyExistsError = (err: any): boolean =>
  typeof err === "object" &&
  err !== null &&
  err.code === ALREADY_EXISTS_FIRESTORE_ERROR_CODE;
