//@ts-check

/**
 * This script compute stats to votes and imports them into the application given a JSON
 * file. The JSON file must be in the format of an export from
 * ZenApp, ie a JSON file created from a call to the HTTP API
 * of Neo4j 2.3.
 *
 * Here is the HTTP request that we used to generate the JSON
 * file.
 * curl -i -X POST \
 *  -H 'Content-Type:application/json' \
 *  -d '{"statements":[{"statement":"MATCH (mood:AgencyMoodHistory)-->(month:Month)--(year:Year), (mood)-->(agency:Agency) RETURN DISTINCT mood, agency, month, year"}]}' \
 *  http://localhost:7474/db/data/transaction/commit
 *
 * The expected schema of the JSON file is documented as part
 * of the ZenAppExportAgencies type defined in JSdoc below.
 *
 * The script converts the stats from the input file to the exported
 * format of the import function then calls the import function with
 * batches of votes until there are no more stats to send.
 *
 * The script expects 2 parameters: the input and the URI
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

const AUTHORIZATION_KEY = process.env.HUMEUR_COMPUTE_STATS_AUTHORIZATION_KEY;

const [zenAppExportAgencyDataFilePath, importUri] = process.argv.slice(2);

if (!zenAppExportAgencyDataFilePath || !importUri) {
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

const votes = generateVotesFromStats(agencyStats);
sendData(votes);

/**
 * @typedef {{mood: MoodExport, agency: string, campaign: string}} AgencyStat
 * @typedef {{ value: string, campaign: string, agency: string}} Vote
 * @param {AgencyStat[]} agencyStats
 * @returns {Vote[]}
}
 */
function generateVotesFromStats(agencyStats) {
  return agencyStats
    .map(agencyStat => {
      const votes = [];
      for (let i = 0; i < agencyStat.mood.great; ++i) {
        votes.push({
          value: "great",
          campaign: agencyStat.campaign,
          agency: agencyStat.agency
        });
      }
      for (let i = 0; i < agencyStat.mood.notThatGreat; ++i) {
        votes.push({
          value: "notThatGreat",
          campaign: agencyStat.campaign,
          agency: agencyStat.agency
        });
      }
      for (let i = 0; i < agencyStat.mood.notGreatAtAll; ++i) {
        votes.push({
          value: "notGreatAtAll",
          campaign: agencyStat.campaign,
          agency: agencyStat.agency
        });
      }
      return votes;
    })
    .reduce((previous, current) => [...previous, ...current]);
}
/**
 * @param {Vote[]} votes
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
