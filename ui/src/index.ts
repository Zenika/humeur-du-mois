import auth0 from "auth0-js";
import firebase from "firebase/app";

declare var process: {
  env: {
    FUNCTIONS_BASE_URL: string;
    AUTH0_CONFIG: {
      domain: string;
      clientID: string;
      scope: string;
      responseType: string;
      audience: string;
    };
  };
};

console.log("hello webpack", process.env.FUNCTIONS_BASE_URL);

window.addEventListener("load", function() {
  const loginButton = document.getElementById("loginButton")!;
  const submitGreat = document.getElementById("submitGreat")!;
  const submitNotThatGreat = document.getElementById("submitNotThatGreat")!;
  const submitNotGreatAtAll = document.getElementById("submitNotGreatAtAll")!;

  var webAuth = new auth0.WebAuth({
    ...process.env.AUTH0_CONFIG,
    redirectUri: window.location.href
  });

  loginButton.addEventListener("click", function(e) {
    e.preventDefault();
    webAuth.authorize();
  });

  handleAuthentication();

  function handleAuthentication() {
    webAuth.parseHash(function(err, authResult) {
      console.log(err, authResult);
      if (authResult && authResult.accessToken && authResult.idToken) {
        window.location.hash = "";
        setSession(authResult);
      } else if (err) {
        console.log(err);
        alert(
          "Error: " + err.error + ". Check the console for further details."
        );
      }
      const user = JSON.parse(localStorage.getItem("user")!);
      const accessToken = localStorage.getItem("access_token");
      fetch(`${process.env.FUNCTIONS_BASE_URL}/exchangeToken`, {
        method: "POST",
        body: JSON.stringify({ userId: user.sub, accessToken: accessToken }),
        headers: { "Content-Type": "application/json" }
      })
        .then(response => {
          if (response.ok) {
            return response.text();
          } else {
            throw new Error("Could not exchange token");
          }
        })
        .then(firebaseToken => {
          firebase
            .auth()
            .signInWithCustomToken(firebaseToken)
            .catch(error => {
              console.log(error);
            });
        });
      displayButtons();
    });
  }

  function setSession(authResult: auth0.Auth0DecodedHash) {
    // Set the time that the Access Token will expire at
    var expiresAt = JSON.stringify(
      authResult.expiresIn! * 1000 + new Date().getTime()
    );
    localStorage.setItem("access_token", authResult.accessToken!);
    localStorage.setItem("id_token", authResult.idToken!);
    localStorage.setItem("expires_at", expiresAt);
    webAuth.client.userInfo(authResult.accessToken!, function(err, user) {
      localStorage.setItem("user", JSON.stringify(user));
    });
  }

  function logout() {
    // Remove tokens and expiry time from localStorage
    localStorage.removeItem("access_token");
    localStorage.removeItem("id_token");
    localStorage.removeItem("expires_at");
    displayButtons();
  }

  function isAuthenticated() {
    // Check whether the current time is past the
    // Access Token's expiry time
    var expiresAt = JSON.parse(localStorage.getItem("expires_at")!);
    return new Date().getTime() < expiresAt;
  }

  function displayButtons() {
    if (isAuthenticated()) {
      loginButton.style.display = "none";
      // logoutBtn.style.display = 'inline-block';
      // loginStatus.innerHTML = 'You are logged in!';
    } else {
      loginButton.style.display = "inline-block";
      // logoutBtn.style.display = 'none';
      // loginStatus.innerHTML =
      // 'You are not logged in! Please log in to continue.';
    }
    enableFirestore();
  }
  function getUser() {
    return JSON.parse(localStorage.getItem("user")!);
  }

  function enableFirestore() {
    // // 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
    // // The Firebase SDK is initialized and available here!
    //
    // firebase.auth().onAuthStateChanged(user => { });
    // firebase.database().ref('/path/to/ref').on('value', snapshot => { });
    // firebase.messaging().requestPermission().then(() => { });
    // firebase.storage().ref('/path/to/ref').getDownloadURL().then(() => { });
    //
    // // 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥

    var db = firebase.firestore();

    const saveResponse = (response: string) => {
      db.collection("responses").add({
        respondant: getUser().email,
        response: response,
        instant: new Date().toISOString()
      });
    };

    submitGreat.onclick = () => saveResponse("great");
    submitNotThatGreat.onclick = () => saveResponse("notThatGreat");
    submitNotGreatAtAll.onclick = () => saveResponse("notGreatAtAll");
  }
});
