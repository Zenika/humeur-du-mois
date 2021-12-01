export interface StatsData {
  [key: string]: number;
  total: number;
}

export type VoteData = {
  campaign: string;
  counts: StatsData;
  campaignDate: string;
  agency?: string;
}[];

export function renderTemplate(voteData?: VoteData) {
  if (!voteData)
    return `Oops, something went wrong. We got no data to show you, try reloading and contacting dreamlabs if this keeps happening`;
  const keys = ["great", "ok", "notThatGreat", "notGreatAtAll"];
  const emojis = ["😁", "🙂", "😐", "😤"];
  return `
        <table>
          <tr>
           <th>Campaign</th>
           ${emojis.map(key => `<th>${key}</th>`).join("")}
           <th>total</th>
          </tr>
          ${voteData
            .map(
              row => `
                <tr>
                  <td class="table__light">${row.campaignDate}</td>
                  ${keys.map(key => `<td>${row.counts[key]}</td>`).join("")}
                  <td class="table__light">${row.counts.total ? row.counts.total : keys.reduce((total, key) => total + row.counts[key], 0)}</td>
                </tr>
              `
            )
            .join("")}
        </table>`;
}
