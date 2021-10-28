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
        start_on: "25",
        end_on: "5"
      },
      allow_force_send_campaign_reminder: "false"
    }
  };
  const errors = checkConfig(config);

  if (errors.length > 1) t.fail();
  else t.pass();
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
        }
      },
      compute_statistics: {
        enabled: "true"
      },
      voting_campaigns: {
        enabled: "false",
        start_on: "2",
        end_on: "6"
      },
      allow_force_send_campaign_reminder: "true"
    }
  };
  const errors = checkConfig(config);

  if (errors.length < 14) t.fail();
  else t.pass();
});
