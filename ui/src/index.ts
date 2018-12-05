import firebase, { FirebaseError } from "firebase/app";
import { authenticateAuth0, authenticateFirebase } from "./auth";
import { getCampaign, castVote } from "./api";
import { AUTH0_CONFIG } from "./config";
import "./style.css";
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
  const agencySelector: HTMLSelectElement = <HTMLSelectElement>(
    document.getElementById("agencySelector")!
  );
  const homeButtons = [
    this.document.getElementById("homeButton1")!,
    this.document.getElementById("homeButton2")!,
    this.document.getElementById("homeButton3")!,
    this.document.getElementById("homeButton4")!,
    this.document.getElementById("homeButton5")!
  ];

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

  let voteData: VoteData;
  let selectedAgency = "";

  const htmlLoader = `<h1>Hold on, we're retrieving the data you requested ...</h1>
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
    statsTab.innerHTML = htmlLoader;
    voteData = await retrieveStatsData(agency);
    displayStatsData(voteData, agency);
  };

  const displayHomePage: any = () => {
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

  const fillAgenciesList = (agencyList: Set<string>) => {
    agencySelector.childNodes.forEach(child => {
      agencySelector.removeChild(child);
    });
    const globalElement = this.document.createElement("option");
    globalElement.innerText = "Global";
    globalElement.setAttribute("value", "");
    agencySelector.appendChild(globalElement);
    agencyList.forEach(agency => {
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
    statsButton.onclick = () => {
      displayStatsPage();
    };
    homeButtons.forEach(button => {
      button.onclick = () => displayHomePage();
    });
    agencySelector.onchange = async () => {
      const newSelectedAgency =
        agencySelector.options[agencySelector.selectedIndex].value;
      if (selectedAgency === "" && newSelectedAgency !== "") {
        voteData = await retrieveStatsData(newSelectedAgency);
      } else if (selectedAgency !== "" && newSelectedAgency === "") {
        voteData = await retrieveStatsData();
      }

      selectedAgency = newSelectedAgency;
      displayStatsData(
        voteData,
        selectedAgency === "" ? undefined : selectedAgency
      );
    };
    const statsCampaignAgency: firebase.firestore.QuerySnapshot = await firebase
      .firestore()
      .collection(`stats-campaign-agency`)
      .get();
    fillAgenciesList(
      new Set(
        statsCampaignAgency.docs.map(
          snapshot => (snapshot.data() as StatsData).agency
        )
      )
    );
  }
});
