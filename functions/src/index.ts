import * as firebase from "firebase-admin";

firebase.initializeApp();

export { exchangeToken } from "./exchange-token";

export {
  saveDailyTick,
  saveEndOfMonthStartsTick,
  saveEndOfMonthEndsTick
} from "./save-ticks";

export {
  importEmployeesFromAlibeezDaily
} from "./import-employees-from-alibeez-daily";

export {
  importEmployeesFromAlibeezHttp
} from "./import-employees-from-alibeez-http";

export { sendEmailToManager } from "./send-email-to-manager";

export { sendEndOfMonthStartsReminder } from "./send-reminders";
