import firebase from "firebase/app";
import { authenticateAuth0, authenticateFirebase } from "./auth";
import { getCampaign, castVote } from "./api";
import { AUTH0_CONFIG } from "./config";
import "./style.css";
import { Stats } from "webpack";
import { renderTemplate, VoteData, StatsData } from "./services/renderTemplate";
import { computeDataFromDataBase } from "./services/computeDataFromDataBase";

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
  const unknownEmployeePage = document.getElementById("unknownEmployeePage")!;
  const statsPage = document.getElementById("displayStats")!;
  const statsButton = document.getElementById("displayStatsButton")!;
  const statsTab = document.getElementById("statsTab")!;

  const pages = [
    loggingInPage,
    homePage,
    recordingPage,
    thankYouPage,
    noCampaignPage,
    alreadyVotedPage,
    errorPage,
    unknownEmployeePage,
    statsPage
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

  const displayStatsPage = (currentCampaign: string) => {
    hideAllPages();
    show(statsPage);
    retrieveStatsData(currentCampaign);
  };

  const retrieveStatsData = async (campaign: string) => {
    const db = firebase.firestore();
    db.settings({ timestampsInSnapshots: true });

    const stats: firebase.firestore.QuerySnapshot = await db
      .collection("stats")
      .get();
    let voteRawData: VoteData = stats.docs.map(snapshot => ({
      campaign: snapshot.id,
      counts: snapshot.data() as StatsData,
      campaignDate: ""
    }));
    const voteData: VoteData = computeDataFromDataBase(voteRawData);
    statsTab.innerHTML = renderTemplate(voteData);
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

    const response = await getCampaign();
    const campaign = response.campaign;

    if (!campaign) {
      changePageTo(noCampaignPage);
      return;
    }

    const employeeSnapshot = await db
      .collection("employees")
      .doc(userId)
      .get();
    if (!employeeSnapshot) {
      errorOut(new Error("cannot find latest employee data import"));
      return;
    }
    const employee = employeeSnapshot.data();
    if (!employee) {
      userEmail.innerText = userId;
      changePageTo(unknownEmployeePage);
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
        await castVote({
          vote: response
        });
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
    statsButton.onclick = () => displayStatsPage(campaign);
  }
});
