import * as functions from "firebase-functions";
import { Config, isEnabled, asNumber } from "./config";

const config = functions.config() as Config;

export function composeEmailSender() {
  return `${config.features.emails.sender.name || "Humeur du mois"} <${
    config.features.emails.sender.email || "humeur-du-mois@zenika.com"
  }>`;
}
