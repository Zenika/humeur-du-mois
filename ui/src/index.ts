import firebase from "firebase/app";
import { authenticateAuth0, authenticateFirebase } from "./auth";
import { getCampaign, castVote } from "./api";
import { AUTH0_CONFIG } from "./config";
import "./style.css";

window.addEventListener("load", async function() {
  const submitGreat = document.getElementById("submitGreat")!;
  const submitNotThatGreat = document.getElementById("submitNotThatGreat")!;
  const submitNotGreatAtAll = document.getElementById("submitNotGreatAtAll")!;
  const loggingInPage = document.getElementById("loggingInPage")!;
  const homePage = document.getElementById("homePage")!;
  const recordingPage = document.getElementById("recordingPage")!;
  const thankYouPage = document.getElementById("thankYouPage")!;
  const noCampaignPage = document.getElementById("noCampaignPage")!;
  const alreadyVotedPage = document.getElementById("alreadyVotedPage")!;
  const errorPage = document.getElementById("errorPage")!;
  const errorUnknowUserPage = document.getElementById("errorUnknowUserPage")!;
  const pages = [
    loggingInPage,
    homePage,
    recordingPage,
    thankYouPage,
    noCampaignPage,
    alreadyVotedPage,
    errorPage,
    errorUnknowUserPage
  ];
  const userId = document.getElementById("userId")!;
  const userEmail = document.getElementById("userEmail")!;
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
  const errorOut = (err: Error) => {
    console.error(err);
    if (err.message.includes('cannot find user')) {
      changePageTo(errorUnknowUserPage);
    } else {
      changePageTo(errorPage);
    }    
  };
  try {
    const session = await authenticateAuth0({
      ...AUTH0_CONFIG,
      redirectUri: window.location.href
    });
    if (!session) return; // this means a redirect has been issued
    if (!session.user.email) {
      throw new Error("expected user to have email but it did not");
    }
    await authenticateFirebase(session);
    userId.innerText = session.user.email;
    enableFirestore(session.user.email);
  } catch (err) {
    errorOut(err);
    return;
  }

  async function enableFirestore(userId: string) {
    const db = firebase.firestore();
    db.settings({ timestampsInSnapshots: true });

    const response = await getCampaign();
    const campaign = response.campaign;

    if (!campaign) {
      changePageTo(noCampaignPage);
      return;
    }

    const latestImport = await db
      .collection("employee-imports")
      .orderBy("at", "desc")
      .limit(1)
      .get()
      .then(result => result.docs[0]);
    if (!latestImport) {
      errorOut(new Error("cannot find latest employee data import"));
      return;
    }

    const employeeSnapshot = await latestImport.ref
      .collection("employees")
      .doc(userId)
      .get();
    const employee = employeeSnapshot.data();
    if (!employee) {
      userEmail.innerText = userId
      errorOut(new Error(`cannot find user '${userId}' in employee data`));
      return;
    }
    if (employee.managerEmail) {
      managerName.innerText = employee.managerEmail;
      show(managerNotice);
    }
    changePageTo(homePage);

    const saveResponse = async (response: string) => {
      changePageTo(recordingPage);
      try {
        await castVote({ vote: response, voter: employee.email });
      } catch (err) {
        if (err.status === "ALREADY_EXISTS") {
          changePageTo(alreadyVotedPage);
        } else {
          errorOut(err.message);
        }
        return;
      }
      changePageTo(thankYouPage);
    };

    submitGreat.onclick = () => saveResponse("great");
    submitNotThatGreat.onclick = () => saveResponse("notThatGreat");
    submitNotGreatAtAll.onclick = () => saveResponse("notGreatAtAll");
  }
});
