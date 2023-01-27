import * as functions from "firebase-functions";
import { Config } from "./config";

const config = functions.config() as Config;

const allowedEmailSenders = [
  "amp@gmail.dev",
  config.features.emails.sender.email
];

export function allowCorsEmail(
  req: functions.Request,
  res: functions.Response
): boolean {
  const email = req.header("AMP-Email-Sender");
  if (email) {
    if (!allowedEmailSenders.includes(email)) {
      res.status(401).send({
        message: "Bad Email"
      });
      return false;
    }
    res.set("AMP-Email-Allow-Sender", email);
  } else {
    const requestOrigin = req.get("Origin");
    if (!requestOrigin) {
      res.status(401).send({
        message: "No Cors"
      });
      return false;
    }
    res.set("Access-Control-Allow-Origin", requestOrigin);
    const sourceOriginEmail = req.query.__amp_source_origin as string;
    if (!sourceOriginEmail) {
      res.status(401).send({
        message: "No Source Origin params"
      });
      return false;
    }
    if (!allowedEmailSenders.includes(sourceOriginEmail)) {
      res.status(401).send({
        message: "Bad Email"
      });
      return false;
    }
    res.set("AMP-Access-Control-Allow-Source-Origin", sourceOriginEmail);
    res.set(
      "Access-Control-Expose-Headers",
      "AMP-Access-Control-Allow-Source-Origin"
    );
  }

  return true;
}
