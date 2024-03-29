import * as functions from "firebase-functions";
import { Config } from "./config";
import { Employee } from "./import-employees-from-alibeez";

const config = functions.config() as Config;

const linkToApp =
  config.features.reminders.app_link ||
  `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com`;

export function composeReminderEmailSender() {
  return `${config.features.emails.sender.name || "Humeur du mois"} <${
    config.features.emails.sender.email || "humeur-du-mois@zenika.com"
  }>`;
}

export const composeReminderEmailHtml = (employee: Employee) => {
  return `
    <p>Hi ${employee.fullName},</p>
    <p>
      Tell us how it's been for you this past month!
      Go to <a href="${linkToApp}">${linkToApp}</a>.
    </p>
    <p>See you soon!</p>`;
};

export const composeReminderEmailText = (employee: Employee) => {
  return `
    Hi ${employee.fullName},
    
    Tell us how it's been for you this past month!
    Go to ${linkToApp}.
    
    See you soon!`;
};

export function composeReminderEmailAmpHtml(employee: Employee, token: string) {
  return `
  <!doctype html>
<html ⚡4email data-css-strict>
<head>
  <meta charset="utf-8">
  <style amp4email-boilerplate>
    body {
      visibility: hidden
    }
  </style>
  <script async src="https://cdn.ampproject.org/v0.js"></script>
  <script async custom-element="amp-form" src="https://cdn.ampproject.org/v0/amp-form-0.1.js"></script>
  <script async custom-template="amp-mustache" src="https://cdn.ampproject.org/v0/amp-mustache-0.2.js"></script>
  <script async custom-element="amp-bind" src="https://cdn.ampproject.org/v0/amp-bind-0.1.js"></script>
  <script async custom-element="amp-selector" src="https://cdn.ampproject.org/v0/amp-selector-0.1.js"></script>
  <script async custom-element="amp-list" src="https://cdn.ampproject.org/v0/amp-list-0.1.js"></script>
  <style amp-custom>
    body {
      background: #eceff1;
      color: rgba(0, 0, 0, 0.87);
      font-family: Lato, Calibri, Arial, sans-serif;
      margin: 0;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      display: flex;
      flex-direction: column;
      margin: 92px 32px 0 32px;
      max-height: 100%;
      max-width: 100%;
    }

    .page {
      background: white;
      border-radius: 2px;
      border: 1px solid #d0d0d0;
      box-shadow: 0 0 3px rgba(0, 0, 0, 0.1);
      box-sizing: border-box;
      margin: 10px 0;
      max-width: 100%;
      padding: 32px;
      width: 500px;
    }

    .page__title {
      align-items: center;
      border-radius: 2px;
      box-shadow: 0 0 3px rgba(0, 0, 0, 0.1);
      color: #af1e31;
      display: flex;
      display: flex;
      font-size: 16px;
      font-weight: 400;
      height: 48px;
      justify-content: space-between;
      margin: -32px -32px 24px -32px;
      padding: 0 32px;
    }

    .page h2 {
      align-items: center;
      color: rgba(0, 0, 0, 0.6);
      display: flex;
      font-size: 22px;
      font-weight: 300;
      justify-content: flex-start;
      margin: 0;
    }

    .page h2 + * {
      margin: 20px 0;
    }

    .button--great {
        color: #1b5e20;
    }

    .button--ok {
      color: #263238;
    }

    .button--no-that-great {
      color: #d67d00;
    }

    .button--not-great-at-all {
        color: #b71c1c;
    }

    .button--big {
        display: flex;
        width: 100%;
        background: transparent;
        margin: 8px 0;
        padding: 16px;
        border-radius: 4px;
        border: 1px solid rgba(0, 0, 0, 0.12);
        align-items: center;
        cursor: pointer;
        line-height: 25px;
    }

    amp-selector [option][selected] {
      cursor: pointer;
      outline: 1px solid #f44336;
    }

    .button__emoji {
      margin-right: 0.5em;
    }

    .textarea {
        width: 100%;
        background: transparent;
        border-radius: 4px;
        border: 1px solid rgba(0, 0, 0, 0.12);
    }

    .managerNotice {
        margin-bottom: 20px;
    }

    .errorDisplay {
        color: red;
    }

    .successDisplay {
      color: #1b5e20;
    }

    .submittingDisplay {
        color: orange;
    }

    .button-vote-wrapper {
        display: flex;
        justify-content: center;
        margin-top: 20px;
    }

    .button--small {
        width: 50%;
        background-color: #4c4c4c;
        border: 0;
        color: #ffffff;
        padding: 16px 0;
        border-radius: 4px;
        border: 1px solid rgba(0, 0, 0, 0.12);
        margin-left: auto;
        margin-right: auto;
        cursor: pointer;
    }

    button {
        font-size: unset;
        font-family: unset;
    }
    footer {
      font-size: 0.8em;
      font-style: italic;
      color: grey;
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
        color: #d67d00;
      }
      td:nth-child(5) {
        color: #b71c1c;
      }

      tr:hover td {
        background: #f7f7f7;
      }
  </style>
</head>
<body>
  <div class="page">
    <h1 class="page__title">
      <span>Hi, ${employee.fullName}</span>
    </h1>
    <amp-list id="list" src="${linkToApp}/api/getEmailStat?token=${token}" layout="fixed-height" height="600" items="." single-item>
      <div placeholder>Checking vote status...</div>
      <div fallback>
		    <p>
          Tell us how it's been for you this past month!
          Go to <a href="${linkToApp}">${linkToApp}</a>.
        </p>
        <p>See you soon!</p>
      </div>
      <template type="amp-mustache">
        {{#alreadyVoted}}
        <p>
          You have already voted, thanks! Here are the stats for the current month:
        </p>
          <div id="statsTab">
            <table>
              <tbody>
                <tr>
                <th>Stats {{campaign}}</th>
                  <th>😁</th><th>🙂</th><th>😐</th><th>😤</th><th>Total</th>
                </tr>
                <tr>
                  <td class="table__light">Zenika</td>
                  <td>{{global.great}}</td><td>{{global.ok}}</td><td>{{global.notThatGreat}}</td><td>{{global.notGreatAtAll}}</td><td>{{global.total}}</td>
                </tr>
                <tr>
                  <td class="table__light">{{agency.agency}}</td>
                  <td>{{agency.great}}</td><td>{{agency.ok}}</td><td>{{agency.notThatGreat}}</td><td>{{agency.notGreatAtAll}}</td><td>{{agency.total}}</td>
                </tr>
              </tbody>
            </table>
          </div>
        {{/alreadyVoted}}
        {{^alreadyVoted}}
          <form id="homePage" action-xhr="${linkToApp}/api/castVoteFromEmail" method="POST">
            <input type="hidden" name="token" value="${token}"/>

            <h2>How have you been at Zenika?</h2>
            <amp-selector class="button__wrapper" name="vote">
              <button class="button--big button--great" type="button" id="submitGreat" option="great">
                <span class="button__emoji">😁</span> Great!
              </button>
              <button class="button--big button--ok" type="button" id="submitOk" option="ok">
                <span class="button__emoji">🙂</span> OK
              </button>
              <button class="button--big button--no-that-great" type="button" id="submitNotThatGreat" option="notThatGreat">
                <span class="button__emoji">😐</span> Not that great
              </button>
              <button class="button--big button--not-great-at-all" type="button" id="submitNotGreatAtAll" option="notGreatAtAll">
                <span class="button__emoji">😤</span> Not great at all
              </button>
            </amp-selector>
            <h2>A little comment?</h2>
            <textarea class="textarea" id="comment" name="comment" rows="4"></textarea>
            <div id="managerNotice" class="managerNotice">
              The result will be sent to <span id="managerName">${employee.managerEmail}</span>
            </div>
            <div id="errorDisplay" class="errorDisplay" submit-error template="submit_error_template">
            </div>
            <div id="successDisplay" class="successDisplay" submit-success template="submit_success_template">
            </div>
            <div id="submitting" class="submittingDisplay" submitting>
                Please wait ...
            </div>
            <div class="button-vote-wrapper">
              <button id="buttonVote" type="submit" class="button--small">
                Vote
              </button>
            </div>
          </form>
        {{/alreadyVoted}}
      </template>
    </amp-list>
    <template type="amp-mustache" id="submit_success_template">
      Your answer was properly recorded. {{message}}
      <div class="button-vote-wrapper">
        <button id="buttonRefresh" on="tap:list.refresh" type="button" class="button--small">
          See vote results
        </button>
      </div>
    </template>
    <template type="amp-mustache" id="submit_error_template">
      Error: {{error.message}}
    </template>
    
  </div>
  <footer>
    This email is send to ${employee.fullName} (${employee.email})
    <br />
    Go to <a href="${linkToApp}">${linkToApp}</a>.
  </footer>
</body>

</html>
    `;
}
