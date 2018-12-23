//@ts-check

/**
 * This script imports votes into the application given a JSON
 * file. The JSON file must be in the format of an export from
 * ZenApp, ie a JSON file created from a call to the HTTP API
 * of Neo4j 2.3.
 *
 * Here is the HTTP request that we used to generate the JSON
 * file.
 *
 * curl -i -X POST \
 *  -H 'Content-Type:application/json' \
 *  -d '{"statements":[{"statement":"MATCH (mood:Mood)-->(month:Month)--(year:Year), mood--(:User)--(agency:Agency) RETURN mood, month, year, agency"}]}' \
 *  http://localhost:7474/db/data/transaction/commit
 *
 * The expected schema of the JSON file is documented as part
 * of the ZenAppExport type defined in JSdoc below.
 *
 * The script converts the votes from the input file to the exported
 * format of the import function then calls the import function with
 * batches of votes until there are no more votes to send.
 *
 * The script expects 2 parameters: the input file and the URI
 * of the import function. The authorization key must be passed
 * through the environment variable HUMEUR_IMPORT_AUTHORIZATION_KEY.
 * The batch size can be customized using the environment variable
 * HUMEUR_IMPORT_BATCH_SIZE. The default is 200.
 */

const fs = require("fs");
const request = require("request-promise-native");

/**
 * Maps moods from values used by ZenApp
 * to values used by Humeur du mois 2018
 */
const MOOD_MAP = {
  GOOD: "great",
  NORMAL: "notThatGreat",
  BAD: "notGreatAtAll"
};

const BATCH_SIZE = Number(process.env.HUMEUR_IMPORT_BATCH_SIZE) || 200;

const AUTHORIZATION_KEY = process.env.HUMEUR_IMPORT_AUTHORIZATION_KEY;

const [zenAppExportDataFilePath, importUri] = process.argv.slice(2);

if (!zenAppExportDataFilePath || !importUri) {
  console.error("please provide the input file as the first argument and the import uri as the second");
  process.exit(1);
}

/**
 * @typedef {["mood", "month", "year", "agency"]} Columns
 * @typedef {{ moodState: string }} MoodValue
 * @typedef {{ value: number }} MonthValue
 * @typedef {{ value: number }} YearValue
 * @typedef {{ name: string }} AgencyValue
 * @typedef {[MoodValue, MonthValue, YearValue, AgencyValue]} Row
 * @typedef {Array<{ row: Row }>} Data
 * @typedef {{ results: [{ columns: Columns, data: Data }] }} ZenAppExport
 * @type {ZenAppExport}
 */
const zenAppExportData = JSON.parse(
  fs.readFileSync(zenAppExportDataFilePath).toString()
);

/**
 * @typedef {{ value: string, campaign: string, agency: string}} Vote
 * @type {Array<Vote>}
 */
const votes = zenAppExportData.results[0].data.map(
  ({
    row: [
      { moodState: mood },
      { value: month },
      { value: year },
      { name: agency }
    ]
  }) => ({
    value: MOOD_MAP[mood],
    campaign: new Date(Date.UTC(year, month - 1)).toISOString().substr(0, 7),
    agency
  })
);

sendData(votes);

/**
 * @param {Array<Vote>} votes
 */
async function sendData(votes) {
  const leftToSend = [...votes];
  while (leftToSend.length > 0) {
    const nextBatch = leftToSend.splice(0, BATCH_SIZE);
    console.info(
      `sending batch of ${nextBatch.length} entries, ${
        leftToSend.length
      } entries left`
    );
    const response = await request({
      method: "POST",
      uri: importUri,
      body: { votes: nextBatch },
      json: true,
      headers: {
        Authorization: `Bearer ${AUTHORIZATION_KEY}`
      }
    });
    console.log(`got response ${response}`);
  }
}
