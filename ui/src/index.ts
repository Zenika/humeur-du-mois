import firebase from "firebase/app";
import { authenticateAuth0, authenticateFirebase } from "./auth";
import { getCampaign, castVote } from "./api";
import { AUTH0_CONFIG } from "./config";
import "./style.css";
import { Stats } from "webpack";

interface StatsData {
  [key: string]: number;
}

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

    const stats = await db.collection("stats").get();
    let voteData = stats.docs.map(snapshot => ({
      campaign: snapshot.id,
      counts: snapshot.data() as StatsData,
      campaign_date: ""
    }));

    if (voteData.length > 0) {
      const keys = ["great", "notThatGreat", "notGreatAtAll"];
      const emojis = ["😁", "😐", "😤"];

      voteData = voteData.map(row => ({
        ...row,
        counts: {
          ...{ great: 0, notGreatAtAll: 0, notThatGreat: 0 },
          ...row.counts
        }
      }));
      voteData = voteData.map(row => ({
        ...row,
        campaign_date: new Date(
          new Date(row.campaign).getUTCFullYear(),
          new Date(row.campaign).getUTCMonth()
        ).toLocaleString("en-GB", { year: "numeric", month: "long" })
      }));
      let htmlContent: string = `
        <table>
          <tr>
           <th>Campaign</th>
            ${emojis.map(key => `<th>${key}</th>`).join("")}
          </tr>
          ${voteData
            .map(
              row => `
                <tr>
                  <td>${row.campaign_date}</td>
                  ${keys.map(key => `<td>${row.counts[key]}</td>`).join("")}
                </tr>
              `
            )
            .join("")}
        </table>`;

      let statsTab = document.getElementById("statsTab");
      if (statsTab) {
        statsTab.innerHTML = htmlContent;
      }
    }
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
    statsButton.onclick = () => displayStatsPage(campaign);
  }
});
