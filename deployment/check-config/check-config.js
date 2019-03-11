const { execSync } = require("child_process");

const checkConfig = config => {
  const computeStatisticsConfigs = config.features.compute_statistics;
  const emailsConfig = config.features.emails;
  const collectStatsConfig = config.features.collect_stats;
  const importVotesConfig = config.features.import_votes;
  const sendVoteToManagerConfig = config.features.send_vote_to_manager;
  const remindersConfig = config.features.reminders;
  const votingCampaignConfig = config.features.voting_campaigns;

  const errors = ["Some errors occured:"];

  if (computeStatisticsConfigs.enabled !== "false") {
    errors.push("- compute_statistics is enabled");
  }
  if (emailsConfig.enabled !== "true") {
    errors.push("- emails are disabled");
  }
  if (collectStatsConfig.enabled !== "true") {
    errors.push("- collect_stats is disabled");
  }
  if (importVotesConfig.enabled !== "false") {
    errors.push("- import_votes is enabled");
  }
  if (sendVoteToManagerConfig.enabled !== "true") {
    errors.push("- send_vote_to_manager is disabled");
  }
  if (remindersConfig.voting_campaign_starts.enabled !== "true") {
    errors.push("- reminders.voting_campaign_starts is disabled");
  }
  if (remindersConfig.voting_campaign_ends.enabled !== "true") {
    errors.push("- reminders.voting_campaign_ends is disabled");
  }
  if (votingCampaignConfig.enabled !== "true") {
    errors.push("- voting_campaign is disabled");
  }
  if (votingCampaignConfig.start_on !== "25") {
    errors.push("- voting_campaign doesn't start on the 25th");
  }
  if (votingCampaignConfig.end_on !== "5") {
    errors.push("- voting_campaign doesn't end on the 5th");
  }

  if (errors.length > 1) throw Error(errors.join("\n"));
  else console.log("Config looks fine, continuing...");
};

const response = execSync("npm --silent run firebase functions:config:get", {
  encoding: "utf8"
});

if (require.main === module) {
  const config = JSON.parse(response);
  checkConfig(config);
}

exports.checkConfig = checkConfig;
