import * as functions from "firebase-functions";
import { importEmployeesFromAlibeez } from "./import-employees-from-alibeez";
import { Config } from "./config";

const config = functions.config() as Config;

export const importEmployeesFromAlibeezHttp = functions.https.onRequest(
  async (request, response) => {
    await importEmployeesFromAlibeez(config.alibeez);
    response.sendStatus(200);
  }
);
