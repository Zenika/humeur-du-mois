export interface StatsData {
  [key: string]: number;
}

export type VoteData = {
  campaign: string;
  counts: StatsData;
  campaign_date: string;
}[];

export function renderTemplate(voteData: VoteData) {
  const keys = ["great", "notThatGreat", "notGreatAtAll"];
  const emojis = ["😁", "😐", "😤"];
  return `
        <table>
          <tr>
           <th>Campaign</th>
            ${emojis.map(key => `<th>${key}</th>`).join("")}
          </tr>
          ${voteData
            .map(
              row => `
                <tr>
                  <td>${row.campaign_date}</td>
                  ${keys.map(key => `<td>${row.counts[key]}</td>`).join("")}
                </tr>
              `
            )
            .join("")}
        </table>`;
}
