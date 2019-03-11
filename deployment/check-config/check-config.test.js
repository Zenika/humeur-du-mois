const test = require("ava");
const { execSync } = require("child_process");
const { checkConfig } = require("./check-config");

test("Config is suitable for production", t => {
  try {
    const response = execSync(
      "npm --silent run firebase functions:config:get",
      {
        encoding: "utf8"
      }
    );

    const config = JSON.parse(response);
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
          enabled: false
        },
        collect_stats: {
          enabled: false
        },
        import_votes: {
          enabled: false
        },
        send_vote_to_manager: {
          enabled: false
        },
        reminders: {
          voting_campaign_ends: {
            enabled: false
          },
          voting_campaign_starts: {
            enabled: false
          }
        },
        compute_statistics: {
          enabled: false
        },
        voting_campaigns: {
          enabled: false,
          start_on: 25,
          end_on: 5
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
