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

const BATCH_SIZE = Number(process.env.HUMEUR_IMPORT_BATCH_SIZE) || 200;

const AUTHORIZATION_KEY = process.env.HUMEUR_IMPORT_STATS_AUTHORIZATION_KEY;

const [
  zenAppExportGlobalDataFilePath,
  zenAppExportAgencyDataFilePath,
  importUri
] = process.argv.slice(2);

if (
  !zenAppExportGlobalDataFilePath ||
  !zenAppExportAgencyDataFilePath ||
  !importUri
) {
  console.error(
    "please provide the input file as the first argument and the import uri as the second"
  );
  process.exit(1);
}

/**
 * @typedef {["mood", "month", "year"]} Columns
 * @typedef {{ good: number, normal: number, bad: number, number: number }} MoodStats
 * @typedef {{ value: number }} MonthValue
 * @typedef {{ value: number }} YearValue
 * @typedef {{ name: string }} AgencyValue
 * @typedef {[MoodStats, MonthValue, YearValue]} RowGlobal
 * @typedef {Array<{ row: RowGlobal }>} DataGlobal
 * @typedef {{ results: [{ columns: Columns, data: DataGlobal }] }} ZenAppExportGlobal
 * @type {ZenAppExportGlobal}
 */
const zenAppExportGlobalData = JSON.parse(
  fs.readFileSync(zenAppExportGlobalDataFilePath).toString()
);
/**
 * @typedef {[MoodStats, AgencyValue, MonthValue, YearValue]} RowAgencies
 * @typedef {Array<{ row: RowAgencies }>} DataAgencies
 * @typedef {{ results: [{ columns: Columns, data: DataAgencies }] }} ZenAppExportAgencies
 * @type {ZenAppExportAgencies}
 */
const zenAppExportAgencyData = JSON.parse(
  fs.readFileSync(zenAppExportAgencyDataFilePath).toString()
);

/**
 * @typedef {{great: number, notThatGreat: number, notGreatAtAll: number}} MoodExport
 * @type {{mood: MoodExport, campaign: string}[]}
 */
const globalStats = zenAppExportGlobalData.results[0].data.map(
  ({
    row: [{ good, normal, bad, number }, { value: month }, { value: year }]
  }) => ({
    mood: {
      great: Math.floor((number * good) / 100),
      notThatGreat: Math.floor((number * normal) / 100),
      notGreatAtAll: Math.floor((number * bad) / 100)
    },
    campaign: new Date(Date.UTC(year, month - 1)).toISOString().substr(0, 7)
  })
);

/**
 * @type {{mood: MoodExport, agency: string, campaign: string}[]}
 */
const agencyStats = zenAppExportAgencyData.results[0].data.map(
  ({
    row: [
      { good, normal, bad, number },
      { name: agency },
      { value: month },
      { value: year }
    ]
  }) => ({
    mood: {
      great: Math.floor((number * good) / 100),
      notThatGreat: Math.floor((number * normal) / 100),
      notGreatAtAll: Math.floor((number * bad) / 100)
    },
    agency,
    campaign: new Date(Date.UTC(year, month - 1)).toISOString().substr(0, 7)
  })
);

console.log("globalStats", globalStats);
sendData(globalStats);
console.log("agencyStats", agencyStats);
sendData(agencyStats);

/**
 * @param {{mood: MoodExport, campaign: string}[]} stats
 */
async function sendData(stats) {
  const leftToSend = [...stats];
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
      body: { stats: nextBatch },
      json: true,
      headers: {
        Authorization: `Bearer ${AUTHORIZATION_KEY}`
      }
    });
    console.log(`got response ${response}`);
  }
}
