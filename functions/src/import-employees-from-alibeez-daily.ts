import * as functions from "firebase-functions";
import { importEmployeesFromAlibeez } from "./import-employees-from-alibeez";
import { Config, isEnabled } from "./config";

const config = functions.config() as Config;

export const importEmployeesFromAlibeezDaily = functions.firestore
  .document("daily-tick/{tickId}")
  .onCreate(async () => {
    if (!isEnabled(config.features.daily_alibeez_import)) {
      console.info("feature is disabled; aborting");
      return;
    }
    await importEmployeesFromAlibeez(config);
  });
