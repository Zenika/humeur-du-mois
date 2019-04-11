/**
 * This script does a backup of the vote, stats-campaign and
 * stats-campaign-agency collections.
 *
 * The script expects 2 parameters: the output path (has to be .json)
 * and the URI of the backup function. The authorization key must be passed
 * through the environment variable HUMEUR_BACKUP_AUTHORIZATION_KEY.
 */

const fs = require("fs");
const request = require("request-promise-native");

const AUTHORIZATION_KEY = process.env.HUMEUR_BACKUP_AUTHORIZATION_KEY;

const [backupDataFilePath, backupUrl] = process.argv.slice(2);

if (!backupDataFilePath || !backupUrl) {
  console.error(
    "please provide the input file as the first argument and the import uri as the second"
  );
  process.exit(1);
}

const backupData = async (url, authorizationKey, targetFileName) => {
  const response = await sendRequest(url, authorizationKey);
  if (!response) {
    console.error("ERROR: no data returned, aborting");
    return;
  }
  fs.writeFileSync(targetFileName, JSON.stringify(response));
};

const sendRequest = async (url, authorizationKey) => {
  return await request({
    method: "POST",
    uri: url,
    body: {},
    json: true,
    headers: {
      Authorization: `Bearer ${authorizationKey}`
    }
  });
};

backupData(backupUrl, AUTHORIZATION_KEY, backupDataFilePath).catch(err =>
  console.error(err)
);
