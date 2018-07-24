import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";
import * as mailgun from "mailgun-js";
import { Config } from "./config";
import { Vote } from "./cast-vote";

const config = functions.config() as Config;
const mailgunClient = mailgun({
  domain: config.mailgun.domain,
  apiKey: config.mailgun.api_key
});

export const sendEmailToManager = functions.firestore
  .document("vote/{voteId}")
  .onCreate(async voteSnapshot => {
    const vote = voteSnapshot.data()! as Vote;

    const latestImport = await firebase
      .firestore()
      .collection("employee-imports")
      .orderBy("at", "desc")
      .limit(1)
      .get()
      .then(result => result.docs[0]);
    if (!latestImport) {
      throw new Error("cannot find latest employee data import");
    }

    const employeeSnapshot = await latestImport.ref
      .collection("employees")
      .doc(vote.voter)
      .get();
    const employee = employeeSnapshot.data();
    if (!employee) {
      throw new Error(`cannot find user '${vote.voter}' in employee data`);
    }
    if (!employee.managerEmail) {
      return;
    }

    const message = {
      from: "Humeur du mois <humeur-du-mois@zenika.com>",
      to: config.mailgun.recipient_override || employee.managerEmail,
      "h:Reply-To": employee.email,
      subject: `${employee.fullName} has shared how they feel`,
      html: `
        <p>Hi ${employee.managerEmail},</p>
        <p>
          ${employee.fullName} has shared how they feel:
          "${vote.value}".
        </p>
        <p>See you soon!</p>
      `
    };

    await firebase.firestore().runTransaction(async transaction => {
      await mailgunClient.messages().send(message);
      transaction.update(voteSnapshot.ref, {
        emailToManagerSent: true,
        voter: "*REDACTED*"
      });
    });
  });
