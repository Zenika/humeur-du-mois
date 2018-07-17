import * as functions from "firebase-functions";
import * as firebase from "firebase-admin";
import * as mailgun from "mailgun-js";

const config = functions.config();
const mailgunClient = mailgun({
  domain: config.mailgun.domain,
  apiKey: config.mailgun.apikey
});

export const sendEndOfMonthStartsReminder = functions.firestore
  .document("end-of-month-starts-tick/{tickId}")
  .onCreate(async tickSnapshot => {
    const tick = tickSnapshot.data();
    if (!tick) {
      throw new Error(
        "sendEndOfMonthStartsReminder was triggered but no tick was found"
      );
    }
    const tickEmissionDate = new Date(tick.emittedAt);
    const monthLongName = tickEmissionDate.toLocaleString("en-us", {
      month: "long"
    });

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

    const allEmployeesQuerySnapshot = await latestImport.ref
      .collection("employees")
      .get();

    const reminderSeriesRef = await firebase
      .firestore()
      .collection("end-of-month-starts-reminder-campaigns")
      .add({
        tick: tickSnapshot.ref,
        size: allEmployeesQuerySnapshot.size
      });

    allEmployeesQuerySnapshot.forEach(async employeeSnapshot => {
      const employee = employeeSnapshot.data();
      if (!employee) {
        console.warn(
          `found no data for employee ${
            employeeSnapshot.ref
          } while iterating employees`
        );
        return;
      }
      const message = {
        from: "Humeur du mois <humeur-du-mois@zenika.com>",
        to: config.mailgun.recipientoverride || employee.email,
        subject: `Humeur du mois is open for ${monthLongName}!`,
        html: `
          <p>Hi ${employee.fullName},</p>
          <p>
            Tell us how it's been for you this past month!
            Go to https://humeur-du-mois.zenika.com.
          </p>
          <p>See you soon!</p>
        `
      };
      await firebase.firestore().runTransaction(async transaction => {
        await mailgunClient.messages().send(message);
        transaction.create(
          reminderSeriesRef.collection("reminders").doc(employee.email),
          {
            emailSentAt: new Date().toISOString()
          }
        );
      });
    });
  });
