const test = require("ava");
const { checkConfig } = require("./check-config");

test("Config is suitable for production", t => {
  try {
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
        }
      }
    };
    checkConfig(config);
    t.pass();
  } catch (err) {
    console.error(err);
    t.fail();
  }
});

test("Config is not suitable for production", t => {
  try {
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
        }
      }
    };
    checkConfig(config);
    t.fail();
  } catch (err) {
    console.error(err);
    t.pass();
  }
});
