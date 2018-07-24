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
  const noCampaignPage = document.getElementById("noCampaignPage")!;
  const alreadyVotedPage = document.getElementById("alreadyVotedPage")!;
  const errorPage = document.getElementById("errorPage")!;
  const pages = [
    loggingInPage,
    homePage,
    thankYouPage,
    noCampaignPage,
    alreadyVotedPage,
    errorPage
  ];
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
  const errorOut = (err: Error) => {
    console.error(err);
    changePageTo(errorPage);
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

    const getCampaign = async () => {
      const cred = await firebase.auth().currentUser!.getIdToken();
      const response = await fetch("/api/getCampaign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cred}`
        },
        body: JSON.stringify({ data: {} })
      });
      const { result } = await response.json();
      return { data: result };
    };
    const castVote = async (data: { vote: string }) => {
      const response = await fetch("/api/castVote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await firebase
            .auth()
            .currentUser!.getIdToken()}`
        },
        body: JSON.stringify({ data })
      });
      const responseBody = await response.json();
      if (!response.ok) {
        throw responseBody.error;
      }
      return { data: responseBody.result };
    };

    const response = await getCampaign();
    const campaign = response.data.campaign;

    if (campaign) {
      changePageTo(homePage);
    } else {
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
      throw new Error(`cannot find latest employee data import`);
    }

    const employeeSnapshot = await latestImport.ref
      .collection("employees")
      .doc(userId)
      .get();
    const employee = employeeSnapshot.data();
    if (!employee) {
      throw new Error(`cannot find user '${userId}' in employee data`);
    }
    if (employee.managerEmail) {
      managerName.innerText = employee.managerEmail;
      show(managerNotice);
    }

    const saveResponse = async (response: string) => {
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
