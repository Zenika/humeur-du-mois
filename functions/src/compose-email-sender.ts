import * as functions from "firebase-functions";
import { Config, isEnabled, asNumber } from "./config";

const config = functions.config() as Config;

export function composeEmailSender() {
  return `${config.features.emails.name || "Humeur du mois"} <${
    config.features.emails.email || "humeur-du-mois@zenika.com"
  }>`;
}
