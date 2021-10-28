//@ts-check

/**
 * Checks that the config is appropriate for production.
 *
 * @param {import("../../functions/src/config").Config} config
 */
const checkConfig = config => {
  const emailsConfig = config.features?.emails;
  const collectStatsConfig = config.features?.collect_stats;
  const computeStatisticsConfigs = config.features?.compute_statistics;
  const importStatsConfig = config.features?.import_stats;
  const importVotesConfig = config.features?.import_votes;
  const backup = config.features?.backup;
  const sendVoteToManagerConfig = config.features?.send_vote_to_manager;
  const remindersConfig = config.features?.reminders;
  const votingCampaignConfig = config.features?.voting_campaigns;

  const errors = ["Some errors occured:"];

  if (emailsConfig.enabled !== "true") {
    errors.push("- emails are disabled");
  }
  if (collectStatsConfig.enabled !== "true") {
    errors.push("- collect_stats is disabled");
  }
  if (computeStatisticsConfigs?.enabled === "true") {
    errors.push("- compute_statistics is enabled");
  }
  if (importStatsConfig.enabled === "true" && !importStatsConfig.key) {
    errors.push("- import_stats is enabled");
  }
  if (importVotesConfig?.enabled === "true") {
    errors.push("- import_votes is enabled");
  }
  if (backup?.enabled === "true" && !backup.key) {
    errors.push("- backup is enabled but no key is defined");
  }
  if (
    remindersConfig?.voting_campaign_starts?.force?.enabled === "true" &&
    !remindersConfig?.voting_campaign_starts?.force?.key
  ) {
    errors.push(
      "- reminders.voting_campaign_starts.force is enabled but no key is defined"
    );
  }
  if (sendVoteToManagerConfig?.enabled !== "true") {
    errors.push("- send_vote_to_manager is disabled");
  }
  if (remindersConfig?.voting_campaign_starts?.enabled !== "true") {
    errors.push("- reminders.voting_campaign_starts is disabled");
  }
  if (remindersConfig?.voting_campaign_ends.enabled !== "true") {
    errors.push("- reminders.voting_campaign_ends is disabled");
  }
  if (votingCampaignConfig?.enabled !== "true") {
    errors.push("- voting_campaign is disabled");
  }
  if (votingCampaignConfig?.start_on !== "25") {
    errors.push("- voting_campaign doesn't start on the 25th");
  }
  if (votingCampaignConfig?.end_on !== "5") {
    errors.push("- voting_campaign doesn't end on the 5th");
  }

  return errors;
};

if (require.main === module) {
  const config = require(process.argv[2]);

  const errors = checkConfig(config);

  if (errors.length > 1) throw Error(errors.join("\n"));
  else console.log("Config looks fine, continuing...");
}

exports.checkConfig = checkConfig;
