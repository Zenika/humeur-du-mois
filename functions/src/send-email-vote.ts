import * as functions from "firebase-functions";
import { firestore } from "firebase-admin";
import { Config, isEnabled, asNumber } from "./config";
import { enqueue } from "./process-email-queue";
import { Employee } from "./import-employees-from-alibeez";
import { CampaignInfo } from "./compute-current-campaign";
import { generateAndSaveRandomEmailToken } from "./generate-random-email-token";

const db = firestore();
const config = functions.config() as Config;
const linkToApp =
  config.features.reminders.app_link ||
  `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com`;

export const sendEmailToEmployees = async (campaign: CampaignInfo) => {
  if (!campaign.open) return;

  const monthLongName = new Date(
    Date.UTC(campaign.year, campaign.month)
  ).toLocaleString("en-us", {
    month: "long"
  });

  const employeeDocumentRefs = await db.collection("employees").listDocuments();
  for (const employeeDocumentRef of employeeDocumentRefs) {
    const employeeDocument = await employeeDocumentRef.get();
    const employee = employeeDocument.data() as Employee;

    const token = await generateAndSaveRandomEmailToken(
      employee.email,
      campaign.id,
      db
    );

    const message = {
      from: config.features.reminders.voting_campaign_starts.sender,
      to: employee.email,
      subject: `Humeur du mois is open for ${monthLongName}!`,
      html: `
            <p>Hi ${employee.fullName},</p>
            <p>
              Tell us how it's been for you this past month!
              Go to <a href="${linkToApp}">${linkToApp}</a>.
            </p>
            <p>See you soon!</p>
            `,
      "amp-html": `
          <!doctype html>
<html ⚡4email>

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

.button--no-that-great {
    color: #263238;
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
  </style>
</head>

<body>
  <form id="homePage" class="page" action-xhr="${linkToApp}/api/emailVote" method="POST">
  <input type="hidden" name="token" value="${token}"/>
    <h1 class="page__title">
      <span>Hi, <span id="userId">${employee.fullName}</span></span>
    </h1>
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
    <div id="errorDisplay" class="errorDisplay" submit-error>
      <template type="amp-mustache">
        Error to send vote : {{error.message}}
      </template>
    </div>
    <div id="successDisplay" class="successDisplay" submit-success>
      <template type="amp-mustache">
        Your answer was properly recorded. {{message}}
      </template>
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
  <footer>
    This email is send to ${employee.fullName} (${employee.email})
    Go to <a href="${linkToApp}">${linkToApp}</a>.
  </footer>
</body>

</html>
          `
    };

    await enqueue(message);
  }
};

// Test, Send a new vote email always
export const sendEmailVote = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    const voteDate = new Date();
    const campaign = {
      open: true,
      year: voteDate.getUTCFullYear(),
      month: voteDate.getUTCMonth(),
      id: new Date(Date.UTC(voteDate.getUTCFullYear(), voteDate.getUTCMonth()))
        .toISOString()
        .substr(0, 7)
    };

    await sendEmailToEmployees(campaign);

    res.status(200).send("OK");
  }
);
