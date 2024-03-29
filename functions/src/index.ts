import * as firebase from "firebase-admin";
import * as functions from "firebase-functions";
import { Config } from "./config";

const config = functions.config() as Config;

firebase.initializeApp({
  credential: firebase.credential.cert({
    clientEmail: config.service_account.client_email,
    privateKey: config.service_account.private_key,
    projectId: config.service_account.project_id
  })
});
firebase.firestore().settings({ timestampsInSnapshots: true });

export { exchangeToken } from "./exchange-token";

export { saveDailyTick } from "./save-ticks";

export { importEmployeesFromAlibeezDaily } from "./import-employees-from-alibeez-daily";

export { sendEmailToManager } from "./send-email-to-manager";

export {
  sendCampaignStartsReminder,
  sendCampaignEndsReminder,
  forceSendCampaingReminder
} from "./send-reminders";

export { processEmailQueue } from "./process-email-queue";

export { getCurrentCampaignState } from "./get-current-campaign-state";

export { castVote, castVoteFromEmail } from "./cast-vote";

export { backup } from "./backup-votes-and-stats";

export { updateStats } from "./update-stats";

export { importVotes } from "./import-votes";

export { importStats } from "./import-stats";

export { updateStatsOnVote } from "./update-stats";

export { computeStatistics } from "./compute-statistics";

export { deleteVotesBefore } from "./delete-votes-before";

export { changeAgencyName } from "./change-agency-name";

export { statsManager } from "./stats-manager";

export { getEmailStat } from "./get-email-stat";
