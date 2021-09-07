import { Vote } from "./cast-vote";
const voteMap: { [key: string]: { color: string; label: string } } = {
  great: { label: "Great 😁", color: "#1b5e20" },
  ok: { label: "OK 🙂", color: "#263238" },
  notThatGreat: { label: "So-so 😐", color: "#d67d00" },
  notGreatAtAll: { label: "Bad 😤", color: "#b71c1c" }
};

export const composeEmailHtml = (vote: Vote) => {
  let comment = "";
  if (vote.comment) {
    comment = `
  <p>
    and left a comment:
    "${vote.comment}"
  </p>`;
  }
  return `
  <p>Hi ${vote.managerEmail},</p>
  <p>
    ${vote.fullName} has shared how they feel:
    <p style="font-size:50px; color:${voteMap[vote.value].color};">${
    voteMap[vote.value].label
  }</p>
  </p>${comment}
  <p>See you soon!</p>`;
};

export function composeEmailAmpHtml(vote: Vote, token: string) {
  const content = composeEmailHtml(vote);
  return `
  <!DOCTYPE html>
<html ⚡4email data-css-strict>
  <head>
    <meta charset="utf-8" />
    <script async src="https://cdn.ampproject.org/v0.js"></script>
    <script async custom-element="amp-list" src="https://cdn.ampproject.org/v0/amp-list-0.1.js"></script>
    <script async custom-template="amp-mustache" src="https://cdn.ampproject.org/v0/amp-mustache-0.2.js"></script>
      <style amp4email-boilerplate>
      body {
        visibility: hidden;
      }
    </style>
    <style amp-custom>
      h1 {
        margin: 1rem;
      }
      table {
        border: 1px solid #eeeeee;
        border-bottom: 0;
        border-radius: 3px;
        border-spacing: 0;
        box-shadow: 0 0 3px rgba(0, 0, 0, 0.1);
        color: #333;
        overflow: hidden;
        width: 100%;
      }
      td,
      th {
        background: #ffffff;
        border-bottom: 1px solid #eeeeee;
        color: #333333;
        font-size: 14px;
        padding: 10px;
      }
      td:first-child,
      th:first-child {
        text-align: left;
      }
      th {
        color: #666666;
        font-size: 12px;
        font-weight: bold;
      }
      .table__light {
        font-weight: 300;
      }
      
      td {
        text-align: center;
      }
      
      td:nth-child(2) {
        color: #1b5e20;
      }
      td:nth-child(3) {
        color: #263238;
      }
      td:nth-child(4) {
        color: #b71c1c;
      }
      
      tr:hover td {
        background: #f7f7f7;
      }
    </style>
  </head>
  <body>
    ${content}

    <amp-list src="https://us-central1-humeur-du-mois-2018.cloudfunctions.net/statsManager?token=10y6KFyCb9Wf4uw5DCCd" layout="fixed-height" height="120" items="." single-item>
    <template type="amp-mustache">
      <div id="statsTab">
        <table>
          <tbody><tr>
           <th>Stats {{campaign}}</th>
            <th>😁</th><th>🙂</th><th>😐</th><th>😤</th>
          </tr>
          
                <tr>
                  <td class="table__light">Teams</td>
                  <td>{{manager.great}}</td><td>{{manager.ok}}</td><td>{{manager.notThatGreat}}</td><td>{{manager.notGreatAtAll}}</td>
                </tr>
              
                <tr>
                  <td class="table__light">{{agency.agency}}</td>
                  <td>{{agency.great}}</td><td>{{agency.ok}}</td><td>{{agency.notThatGreat}}</td><td>{{agency.notGreatAtAll}}</td>
                </tr>
              
        </tbody></table></div>
    </template>
  </amp-list>
  </body>
</html>
  `;
}
