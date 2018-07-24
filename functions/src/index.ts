import * as firebase from "firebase-admin";

firebase.initializeApp();
firebase.firestore().settings({ timestampsInSnapshots: true });

export { exchangeToken } from "./exchange-token";

export { saveDailyTick } from "./save-ticks";

export {
  importEmployeesFromAlibeezDaily
} from "./import-employees-from-alibeez-daily";

export {
  importEmployeesFromAlibeezHttp
} from "./import-employees-from-alibeez-http";

export { sendEmailToManager } from "./send-email-to-manager";

export { sendCampaignStartsReminder } from "./send-reminders";

export { getCampaign } from "./get-campaign";

export { castVote } from "./cast-vote";
