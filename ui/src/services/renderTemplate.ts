export function renderTemplate(voteData) {
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
