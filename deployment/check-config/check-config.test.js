const test = require("ava");
const { checkConfig } = require("./check-config");

test("Config is suitable for production", t => {
  const config = {
    features: {
      emails: {
        enabled: "true"
      },
      collect_stats: {
        enabled: "true"
      },
      import_votes: {
        enabled: "false"
      },
      send_vote_to_manager: {
        enabled: "true"
      },
      reminders: {
        voting_campaign_ends: {
          enabled: "true"
        },
        voting_campaign_starts: {
          enabled: "true"
        }
      },
      compute_statistics: {
        enabled: "false"
      },
      voting_campaigns: {
        enabled: "true",
        start_on: "28",
        end_on: "10"
      }
    }
  };
  const errors = checkConfig(config);

  t.deepEqual(errors, []);
});

test("Config is not suitable for production", t => {
  const config = {
    features: {
      emails: {
        enabled: "false"
      },
      collect_stats: {
        enabled: "false"
      },
      import_votes: {
        enabled: "true"
      },
      import_stats: {
        enabled: "true"
      },
      backup: {
        enabled: "true"
      },
      send_vote_to_manager: {
        enabled: "false"
      },
      reminders: {
        voting_campaign_ends: {
          enabled: "false",
          force: {
            enabled: "true",
            key: ""
          }
        },
        voting_campaign_starts: {
          enabled: "false"
        },
        app_link: "app/"
      },
      compute_statistics: {
        enabled: "true"
      },
      voting_campaigns: {
        enabled: "false",
        start_on: "6",
        end_on: "101"
      }
    }
  };
  const errors = checkConfig(config);

  t.deepEqual(errors, [
    "- emails are disabled",
    "- collect_stats is disabled",
    "- compute_statistics is enabled",
    "- import_stats is enabled",
    "- import_votes is enabled",
    "- backup is enabled but no key is defined",
    "- send_vote_to_manager is disabled",
    "- reminders.voting_campaign_starts is disabled",
    "- reminders.voting_campaign_ends is disabled",
    "- app_link ends with a slash",
    "- voting_campaign is disabled",
    "- voting_campaign doesn't start on the 1st",
    "- voting_campaign doesn't end on the 10th"
  ]);
});
