import * as firebase from "firebase-admin";

firebase.initializeApp();

export { exchangeToken } from "./exchange-token";
export { saveDailyTick } from "./save-daily-tick";
export {
  importEmployeesFromAlibeezDaily
} from "./import-employees-from-alibeez-daily";
export {
  importEmployeesFromAlibeezHttp
} from "./import-employees-from-alibeez-http";
export { sendEmailToManager } from "./send-email-to-manager";
