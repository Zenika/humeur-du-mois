import firebase from "firebase/app";
import { authenticateAuth0, authenticateFirebase } from "./auth";
import { AUTH0_CONFIG } from "./config";
import "./style.css";

window.addEventListener("load", async function() {
  const submitGreat = document.getElementById("submitGreat")!;
  const submitNotThatGreat = document.getElementById("submitNotThatGreat")!;
  const submitNotGreatAtAll = document.getElementById("submitNotGreatAtAll")!;
  const loggingInPage = document.getElementById("loggingInPage")!;
  const homePage = document.getElementById("homePage")!;
  const thankYouPage = document.getElementById("thankYouPage")!;
  const errorPage = document.getElementById("errorPage")!;
  const pages = [loggingInPage, homePage, thankYouPage, errorPage];
  const errorMessage = document.getElementById("errorMessage")!;
  const userId = document.getElementById("userId")!;
  const managerNotice = document.getElementById("managerNotice")!;
  const managerName = document.getElementById("managerName")!;
  const hideClass = "hidden";

  const show = (element: HTMLElement) => {
    element.classList.remove(hideClass);
  };
  const hide = (element: HTMLElement) => {
    element.classList.add(hideClass);
  };
  const hideAllPages = () => {
    pages.forEach(page => hide(page));
  };
  const changePageTo = (incoming: HTMLElement) => {
    hideAllPages();
    show(incoming);
  };

  try {
    const session = await authenticateAuth0({
      ...AUTH0_CONFIG,
      redirectUri: window.location.href
    });
    if (!session) return; // this means an redirect has been issued
    if (!session.user.email) {
      throw new Error("expected user to have email but it did not");
    }
    await authenticateFirebase(session);
    enableFirestore(session.user.email);
    userId.innerText = session.user.email;
    changePageTo(homePage);
  } catch (err) {
    console.error(err);
    changePageTo(errorPage);
  }

  async function enableFirestore(userId: string) {
    const db = firebase.firestore();

    const latestImport = await db
      .collection("employee-imports")
      .orderBy("at", "desc")
      .limit(1)
      .get()
      .then(result => result.docs[0]);
    if (!latestImport) {
      throw new Error(`cannot find user '${userId}' in employee data`);
    }

    const employeeSnapshot = await latestImport.ref
      .collection("employees")
      .doc(userId)
      .get();
    const employee = employeeSnapshot.data();
    if (employee.managerEmail) {
      managerName.innerText = employee.managerEmail;
      show(managerNotice);
    }

    const saveResponse = (response: string) => {
      db.collection("responses").add({
        respondant: userId,
        response: response,
        instant: new Date().toISOString()
      });
      changePageTo(thankYouPage);
    };

    submitGreat.onclick = () => saveResponse("great");
    submitNotThatGreat.onclick = () => saveResponse("notThatGreat");
    submitNotGreatAtAll.onclick = () => saveResponse("notGreatAtAll");
  }
});
