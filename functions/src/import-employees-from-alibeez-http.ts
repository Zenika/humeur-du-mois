import * as functions from "firebase-functions";
import {
  ensureAlibeezApiConfigIsValid,
  importEmployeesFromAlibeez
} from "./import-employees-from-alibeez";

export const importEmployeesFromAlibeezHttp = functions.https.onRequest(
  async (request, response) => {
    const config = functions.config();
    if (!ensureAlibeezApiConfigIsValid(config)) {
      response.status(500).send("Incomplete configuration");
      return;
    }
    await importEmployeesFromAlibeez(config.tyk.proxybeez);
    response.sendStatus(200);
  }
);
