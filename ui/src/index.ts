import { initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import {
  Firestore,
  getFirestore,
  getDoc,
  getDocs,
  doc,
  collection,
  query,
  orderBy
} from "firebase/firestore";
import { authenticateAuth0, authenticateFirebase } from "./auth";
import { getCurrentCampaignState, castVote, ApiCallError } from "./api";
import { AUTH0_CONFIG, FIREBASE_CONFIG } from "./config";
import "./styles/navbar.css";
import "./styles/style.css";
import { renderTemplate, VoteData, StatsData } from "./services/renderTemplate";
import { computeDataFromDataBase } from "./services/computeDataFromDataBase";
import { signOutFirebase } from "./auth/firebase";
import { signOutAuth0 } from "./auth/auth0";

window.addEventListener("load", async function () {
  const submitGreat = document.getElementById("submitGreat")!;
  const submitOk = document.getElementById("submitOk")!;
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
  statsTab.innerHTML = statsLoader;

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

  const displayHomePage = () => {
    hideAllPages();
    show(homePage);
  };

  const renderInitialStatsPage = async ({
    firestore
  }: {
    firestore: Firestore;
  }) => {
    voteData = await retrieveStatsData({}, { firestore });
    await fillAgenciesList({ firestore });
    renderStatsData(voteData);
  };

  const displayStatsPage = async (agency?: string) => {
    changePageTo(statsPage);
  };

  const retrieveStatsData = async (
    { agency }: { agency?: string },
    { firestore }: { firestore: Firestore }
  ) => {
    const collectionName = agency ? `stats-campaign-agency` : `stats-campaign`;
    const stats = await getDocs(
      query(collection(firestore, collectionName), orderBy("campaign", "desc"))
    );
    return stats.docs.map((snapshot: any) => ({
      campaign: snapshot.id,
      counts: snapshot.data() as StatsData,
      campaignDate: ""
    }));
  };

  const fillAgenciesList = async ({ firestore }: { firestore: Firestore }) => {
    const statsCampaignAgency = await getDocs(
      query(collection(firestore, "stats-campaign-agency"))
    );
    const agencies = new Set<string>(
      statsCampaignAgency.docs.map(
        (snapshot: any) => (snapshot.data() as StatsData).agency || ''
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

  const renderStatsData = (voteData: VoteData, agency?: string) => {
    statsTab.innerHTML = renderTemplate(
      computeDataFromDataBase(
        agency ? filterStatsData(voteData, agency) : voteData
      )
    );
  };

  const filterStatsData = (voteRawData: VoteData, agency: string) => {
    return voteRawData.filter(rawVote => rawVote.counts.agency === agency);
  };

  const errorOut = (err: unknown) => {
    console.error(err);
    changePageTo(errorPage);
  };

  const saveResponse = async (
    payload: { vote: string; voteToken: string; comment?: string },
    { auth }: { auth: Auth }
  ) => {
    changePageTo(recordingPage);
    try {
      await castVote(payload, { auth });
    } catch (err) {
      if (err instanceof ApiCallError && err.status === "ALREADY_EXISTS") {
        changePageTo(alreadyVotedPage);
      } else if (err instanceof Error) {
        errorOut(err.message);
      } else {
        errorOut("An unknown error has occurred");
      }
      return;
    }
    changePageTo(thankYouPage);
  };

  const initVoteButtonsEventHandlers = (
    voteToken: string,
    { auth }: { auth: Auth }
  ) => {
    let mood: string;
    const buttonMap = [
      submitGreat,
      submitOk,
      submitNotThatGreat,
      submitNotGreatAtAll
    ];
    submitGreat.onclick = () => {
      buttonMap.forEach(button => button.classList.remove("focusButton"));
      submitGreat.classList.add("focusButton");
      mood = "great";
    };
    submitOk.onclick = () => {
      buttonMap.forEach(button => button.classList.remove("focusButton"));
      submitOk.classList.add("focusButton");
      mood = "ok";
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
      saveResponse({ voteToken, vote: mood, comment }, { auth });
    };
  };

  const initStatsButtonsEventHandlers = ({
    firestore
  }: {
    firestore: Firestore;
  }) => {
    statsButton.onclick = () => {
      displayStatsPage();
    };

    agencySelector.onchange = async () => {
      const newSelectedAgency =
        agencySelector.options[agencySelector.selectedIndex].value;
      if (selectedAgency === "" && newSelectedAgency !== "") {
        voteData = await retrieveStatsData(
          { agency: newSelectedAgency },
          { firestore }
        );
      } else if (selectedAgency !== "" && newSelectedAgency === "") {
        voteData = await retrieveStatsData({}, { firestore });
      }
      agencyName.innerText = newSelectedAgency;

      selectedAgency = newSelectedAgency;
      renderStatsData(
        voteData,
        selectedAgency === "" ? undefined : selectedAgency
      );
    };
  };

  const initCampaignAndEmployeeData = async (
    userId: string,
    { auth, firestore }: { auth: Auth; firestore: Firestore }
  ): Promise<string | undefined> => {
    const { campaign, alreadyVoted, voteToken } = await getCurrentCampaignState(
      { auth }
    );

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

    const employeeSnapshot = await getDoc(
      doc(firestore, "employees", userId.toLowerCase())
    );
    if (!employeeSnapshot) {
      throw new Error("cannot find latest employee data import");
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

    return voteToken;
  };

  try {
    // Auth0 authentication
    const { session, auth0Client, err } = await authenticateAuth0(AUTH0_CONFIG);
    if (err) {
      errorOut(err);
      return;
    }
    if (!session) {
      // this means a redirect has been issued by authenticateAuth0
      return;
    }
    if (!session.user.email) {
      errorOut(new Error("expected user to have email but it did not"));
      return;
    }

    // Initialize Firebase
    const firebaseApp = initializeApp(FIREBASE_CONFIG);
    const auth = getAuth(firebaseApp);
    const firestore = getFirestore(firebaseApp);

    // Display the main content (Optimistic UI)
    userIdElement.innerText = session.user.email;
    displayHomePage();
    initStatsButtonsEventHandlers({ firestore });

    // Firebase authentication
    await authenticateFirebase(session, { auth });

    // Now that the user is fully logged in, they can logout
    logoutButton.onclick = async () => {
      await signOutFirebase({ auth });
      signOutAuth0(auth0Client);
    };

    // Load data for both pages in parallel
    initCampaignAndEmployeeData(session.user.email, { auth, firestore })
      .then(voteToken => {
        if (voteToken) {
          initVoteButtonsEventHandlers(voteToken, { auth });
          show(sendingSection);
        }
        hide(sendingSectionLoader);
      })
      .catch(errorOut);

    renderInitialStatsPage({ firestore })
      .then(() => {
        show(statsTitle);
      })
      .catch(errorOut);
  } catch (err) {
    errorOut(err);
    return;
  }
});
