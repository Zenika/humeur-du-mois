const functions = require("firebase-functions");

const config = functions.config();
const computeStatisticsConfigs = config.features.compute_statistics;
const emailsConfig = config.features.emails;
const collectStatsConfig = config.features.collect_stats;
const importVotesConfig = config.features.import_votes;
const sendVoteToManagerConfig = config.features.send_vote_to_manager;
const remindersConfig = config.features.reminders;
const votingCampaignConfig = config.features.voting_campaigns;

let errors = "Some errors occured: \n";

if (computeStatisticsConfigs.enabled !== "false") {
  errors += "- compute_statistics is enabled \n";
} else if (emailsConfig.enabled !== "true") {
  errors += "- emails are disabled \n";
} else if (collectStatsConfig.enabled !== "true") {
  errors += "- collect_stats is disabled \n";
} else if (importVotesConfig.enabled !== "false") {
  errors += "- import_votes is enabled \n";
} else if (sendVoteToManagerConfig.enabled !== "true") {
  errors += "- send_vote_to_manager is disabled \n";
} else if (remindersConfig.voting_campaign_starts.enabled !== "true") {
  errors += "- reminders.voting_campaign_starts is disabled \n";
} else if (remindersConfig.voting_campaign_ends.enabled !== "true") {
  errors += "- reminders.voting_campaign_ends is disabled \n";
} else if (votingCampaignConfig.enabled !== "true") {
  errors += "- voting_campaign is disabled \n";
} else if (votingCampaignConfig.start_on !== "25") {
  errors += "- voting_campaign doesn't start on the 25th \n";
} else if (votingCampaignConfig.end_on !== "5") {
  errors += "- voting_campaign doesn't end on the 5th \n";
} else errors = false;

if (errors) throw Error(errors);
