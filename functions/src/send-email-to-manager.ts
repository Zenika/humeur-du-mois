import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";
import * as mailgun from "mailgun-js";

const config = functions.config();
const mailgunClient = mailgun({
  domain: config.mailgun.domain,
  apiKey: config.mailgun.apikey
});

export const sendEmailToManager = functions.firestore
  .document("responses/{responseId}")
  .onCreate(async responseSnapshot => {
    const response = responseSnapshot.data();
    if (!response) {
      throw new Error(
        "sendEmailToManager was triggered but no response was found"
      );
    }

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
      .doc(response.respondant)
      .get();
    const employee = employeeSnapshot.data();
    if (!employee) {
      throw new Error(
        `cannot find user '${response.respondant}' in employee data`
      );
    }
    if (!employee.managerEmail) {
      return;
    }

    const message = {
      from: "Humeur du mois <humeur-du-mois@zenika.com>",
      to: config.mailgun.recipientoverride || employee.managerEmail,
      "h:Reply-To": employee.email,
      subject: `${employee.fullName} has shared how they feel`,
      html: `
        <p>Hi ${employee.managerEmail},</p>
        <p>${employee.fullName} has shared how they feel: "${
        response.response
      }".</p>
        <p>See you soon!</p>
      `
    };

    await firebase.firestore().runTransaction(async transaction => {
      await mailgunClient.messages().send(message);
      transaction.update(responseSnapshot.ref, {
        emailSent: true,
        respondant: "*REDACTED*"
      });
    });
  });
