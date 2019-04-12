import * as firebase from "firebase-admin";

firebase.initializeApp();
firebase.firestore().settings({ timestampsInSnapshots: true });

export { exchangeToken } from "./exchange-token";

export { saveDailyTick } from "./save-ticks";

export {
  importEmployeesFromAlibeezDaily
} from "./import-employees-from-alibeez-daily";

export { sendEmailToManager } from "./send-email-to-manager";

export {
  sendCampaignStartsReminder,
  sendCampaignEndsReminder
} from "./send-reminders";

export { processEmailQueue } from "./process-email-queue";

export { getCampaign } from "./get-campaign";

export { castVote } from "./cast-vote";

export { backup } from "./backup-votes-and-stats";

export { updateStats } from "./update-stats";

export { importVotes } from "./import-votes";

export { importStats } from "./import-stats";

export { updateStatsOnVote } from "./update-stats";

export { computeStatistics } from "./compute-statistics";

export { deleteVotesBefore } from "./delete-votes-before";
