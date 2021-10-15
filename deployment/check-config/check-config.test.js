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
      allow_manual_trigger_of_campaign_start_reminder: "false"
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
      send_vote_to_manager: {
        enabled: "false"
      },
      reminders: {
        voting_campaign_ends: {
          enabled: "false"
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
      allow_manual_trigger_of_campaign_start_reminder: "true"
    }
  };
  const errors = checkConfig(config);

  if (errors.length < 11) t.fail();
  else t.pass();
});
