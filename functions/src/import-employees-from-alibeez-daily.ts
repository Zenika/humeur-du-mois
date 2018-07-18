import * as functions from "firebase-functions";
import {
  importEmployeesFromAlibeez
} from "./import-employees-from-alibeez";
import { Config } from "./config";

const config = functions.config() as Config;

export const importEmployeesFromAlibeezDaily = functions.firestore
  .document("daily-tick/{tickId}")
  .onCreate(async () => {
    await importEmployeesFromAlibeez(config.alibeez);
  });
