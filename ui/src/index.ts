import firebase from "firebase/app";
import { authenticateAuth0, authenticateFirebase } from "./auth";
import { getCurrentCampaignState, castVote, Payload } from "./api";
import { AUTH0_CONFIG } from "./config";
import "./styles/navbar.css";
import "./styles/style.css";
import { renderTemplate, VoteData, StatsData } from "./services/renderTemplate";
import { computeDataFromDataBase } from "./services/computeDataFromDataBase";
import { signOutFirebase } from "./auth/firebase";
import { signOutAuth0 } from "./auth/auth0";

window.addEventListener("load", async function () {
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
  const agencyName = document.getElementById("agencyName")!;
  const statsTab = document.getElementById("statsTab")!;
  const statsTitle = document.getElementById("statsTitle")!;
  const agencySelector: HTMLSelectElement = <HTMLSelectElement>(
    document.getElementById("agencySelector")!
  );
  const homeButton = this.document.getElementById("homeButton")!;
  const commentTextarea: HTMLTextAreaElement = <HTMLTextAreaElement>(
    document.getElementById("comment")!
  );
  const voteButton = document.getElementById("buttonVote")!;
  const errorDisplay = document.getElementById("errorDisplay")!;
  const logoutButton = document.getElementById("logoutButton")!;

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
  const userIdElement = document.getElementById("userId")!;
  const userEmail = document.getElementById("userEmail")!;
  const sendingSection = document.getElementById("sendingSection")!;
  const sendingSectionLoader = document.getElementById("sendingSectionLoader")!;
  const managerName = document.getElementById("managerName")!;
  const hideClass = "hidden";

  let voteData: VoteData;
  let selectedAgency = "";

  const htmlLoader = `
    <div class="loader">
      <svg class="circular" viewBox="25 25 50 50">
        <circle
          class="path"
          cx="50"
          cy="50"
          r="20"
          fill="none"
          strokeWidth="2"
          strokeMiterlimit="10"
        />
      </svg>
    </div>`;

  const statsLoader = `<div class="loading-message">${htmlLoader} Hold on, we're retrieving the data you requested ...</div>`;

  sendingSectionLoader.innerHTML = htmlLoader;

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

  const displayStatsPage = async (agency?: string) => {
    changePageTo(statsPage);
    statsTitle.style.display = "none";
    statsTab.innerHTML = statsLoader;
    voteData = await retrieveStatsData(agency);
    statsTitle.style.display = "";
    displayStatsData(voteData, agency);
  };

  const displayHomePage = () => {
    hideAllPages();
    show(homePage);
  };

  const retrieveStatsData = async (agency?: string) => {
    const db = firebase.firestore();
    db.settings({ timestampsInSnapshots: true });
    const collectionName = agency ? `stats-campaign-agency` : `stats-campaign`;

    const stats: firebase.firestore.QuerySnapshot = await db
      .collection(collectionName)
      .orderBy("campaign", "desc")
      .get();

    return stats.docs.map(snapshot => ({
      campaign: snapshot.id,
      counts: snapshot.data() as StatsData,
      campaignDate: ""
    }));
  };

  const fillAgenciesList = async () => {
    const statsCampaignAgency: firebase.firestore.QuerySnapshot = await firebase
      .firestore()
      .collection(`stats-campaign-agency`)
      .get();

    const agencies = new Set(
      statsCampaignAgency.docs.map(
        snapshot => (snapshot.data() as StatsData).agency
      )
    );

    agencySelector.childNodes.forEach(child => {
      agencySelector.removeChild(child);
    });
    const globalElement = this.document.createElement("option");
    globalElement.innerText = "Global";
    agencyName.innerText = "Global";
    globalElement.setAttribute("value", "");
    agencySelector.appendChild(globalElement);

    agencies.forEach(agency => {
      const element = this.document.createElement("option");
      element.innerText = agency;
      element.setAttribute("value", agency);
      agencySelector.appendChild(element);
    });
  };

  const displayStatsData = (voteData: VoteData, agency?: string) => {
    statsTab.innerHTML = renderTemplate(
      computeDataFromDataBase(
        agency ? filterStatsData(voteData, agency) : voteData
      )
    );
  };

  const filterStatsData = (voteRawData: VoteData, agency: string) => {
    return voteRawData.filter(rawVote => rawVote.counts.agency === agency);
  };

  const errorOut = (err: Error) => {
    console.error(err);
    changePageTo(errorPage);
  };

  const saveResponse = async (response: string, comment?: string) => {
    changePageTo(recordingPage);
    const payload: Payload = {
      vote: response
    };
    if (comment) {
      payload.comment = comment;
    }
    try {
      await castVote(payload);
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

  const initVoteButtonsEventHandlers = () => {
    let mood: string;
    const buttonMap = [submitGreat, submitNotThatGreat, submitNotGreatAtAll];
    submitGreat.onclick = () => {
      buttonMap.forEach(button => button.classList.remove("focusButton"));
      submitGreat.classList.add("focusButton");
      mood = "great";
    };
    submitNotThatGreat.onclick = () => {
      buttonMap.forEach(button => button.classList.remove("focusButton"));
      submitNotThatGreat.classList.add("focusButton");
      mood = "notThatGreat";
    };
    submitNotGreatAtAll.onclick = () => {
      buttonMap.forEach(button => button.classList.remove("focusButton"));
      submitNotGreatAtAll.classList.add("focusButton");
      mood = "notGreatAtAll";
    };

    voteButton.onclick = () => {
      const comment = commentTextarea.value || undefined;
      if (!mood) {
        errorDisplay.hidden = false;
        return;
      }
      saveResponse(mood, comment);
    };
  };

  const initStatsButtonsEventHandlers = () => {
    statsButton.onclick = () => {
      displayStatsPage();
    };

    agencySelector.onchange = async () => {
      const newSelectedAgency =
        agencySelector.options[agencySelector.selectedIndex].value;
      if (selectedAgency === "" && newSelectedAgency !== "") {
        voteData = await retrieveStatsData(newSelectedAgency);
      } else if (selectedAgency !== "" && newSelectedAgency === "") {
        voteData = await retrieveStatsData();
      }
      agencyName.innerText = newSelectedAgency;

      selectedAgency = newSelectedAgency;
      displayStatsData(
        voteData,
        selectedAgency === "" ? undefined : selectedAgency
      );
    };
  };

  const initCampaignAndEmployeeData = async (userId: string) => {
    const db = firebase.firestore();
    db.settings({ timestampsInSnapshots: true });

    const { campaign, alreadyVoted } = await getCurrentCampaignState();

    homeButton.onclick = () => {
      if (!campaign) {
        changePageTo(noCampaignPage);
        return;
      }
      if (alreadyVoted) {
        changePageTo(alreadyVotedPage);
        return;
      }
      displayHomePage();
    };

    if (!campaign) {
      changePageTo(noCampaignPage);
      return;
    }
    if (alreadyVoted) {
      changePageTo(alreadyVotedPage);
      return;
    }

    const employeeSnapshot = await db
      .collection("employees")
      .doc(userId.toLowerCase())
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
    }
  };

  try {
    // 1 - Auth0 authentication
    const { session, webAuth } = await authenticateAuth0({
      ...AUTH0_CONFIG,
      redirectUri: window.location.href
    });
    if (!session) return; // this means a redirect has been issued
    if (!session.user.email) {
      throw new Error("expected user to have email but it did not");
    }

    // 2 - Display the main content (Optimistic UI)
    userIdElement.innerText = session.user.email;
    displayHomePage();
    initVoteButtonsEventHandlers();

    // 3 - Firebase authentication, fetch the campaign and employee data
    await authenticateFirebase(session);
    await initCampaignAndEmployeeData(session.user.email);

    // 4 - Now that the user is fully logged in, they can go on the stats page and logout
    initStatsButtonsEventHandlers();
    logoutButton.onclick = async () => {
      await signOutFirebase();
      signOutAuth0(webAuth);
    };

    // 5 - Display the sending section (vote button + manager email)
    hide(sendingSectionLoader);
    show(sendingSection);

    // 6 - Fetch the list of agencies
    await fillAgenciesList();
  } catch (err) {
    errorOut(err);
    return;
  }
});
