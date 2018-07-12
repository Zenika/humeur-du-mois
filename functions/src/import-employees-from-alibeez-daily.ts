import * as functions from "firebase-functions";
import {
  ensureAlibeezApiConfigIsValid,
  importEmployeesFromAlibeez
} from "./import-employees-from-alibeez";

export const importEmployeesFromAlibeezDaily = functions.firestore
  .document("daily-ticks/{tickId}")
  .onCreate(async () => {
    const config = functions.config();
    if (!ensureAlibeezApiConfigIsValid(config)) {
      throw new Error("Incomplete configuration");
    }
    await importEmployeesFromAlibeez(config.tyk.proxybeez);
  });
