/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/index.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/index.ts":
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nvar __importDefault = (this && this.__importDefault) || function (mod) {\r\n    return (mod && mod.__esModule) ? mod : { \"default\": mod };\r\n}\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nconst auth0_js_1 = __importDefault(__webpack_require__(/*! auth0-js */ \"auth0-js\"));\r\nconst app_1 = __importDefault(__webpack_require__(/*! firebase/app */ \"firebase/app\"));\r\nconsole.log(\"hello webpack\", \"http://localhost:5001/humeur-du-mois-2018/us-central1\");\r\nwindow.addEventListener(\"load\", function () {\r\n    const loginButton = document.getElementById(\"loginButton\");\r\n    const submitGreat = document.getElementById(\"submitGreat\");\r\n    const submitNotThatGreat = document.getElementById(\"submitNotThatGreat\");\r\n    const submitNotGreatAtAll = document.getElementById(\"submitNotGreatAtAll\");\r\n    var webAuth = new auth0_js_1.default.WebAuth(Object.assign({}, {\"domain\":\"zenika.eu.auth0.com\",\"clientID\":\"j5xIoOh3R9Jov6wtKQm2BAHUSkrYpttY\",\"responseType\":\"token id_token\",\"audience\":\"https://zenika.eu.auth0.com/userinfo\",\"scope\":\"openid email\"}, { redirectUri: window.location.href }));\r\n    loginButton.addEventListener(\"click\", function (e) {\r\n        e.preventDefault();\r\n        webAuth.authorize();\r\n    });\r\n    handleAuthentication();\r\n    function handleAuthentication() {\r\n        webAuth.parseHash(function (err, authResult) {\r\n            console.log(err, authResult);\r\n            if (authResult && authResult.accessToken && authResult.idToken) {\r\n                window.location.hash = \"\";\r\n                setSession(authResult);\r\n            }\r\n            else if (err) {\r\n                console.log(err);\r\n                alert(\"Error: \" + err.error + \". Check the console for further details.\");\r\n            }\r\n            const user = JSON.parse(localStorage.getItem(\"user\"));\r\n            const accessToken = localStorage.getItem(\"access_token\");\r\n            fetch(`${\"http://localhost:5001/humeur-du-mois-2018/us-central1\"}/exchangeToken`, {\r\n                method: \"POST\",\r\n                body: JSON.stringify({ userId: user.sub, accessToken: accessToken }),\r\n                headers: { \"Content-Type\": \"application/json\" }\r\n            })\r\n                .then(response => {\r\n                if (response.ok) {\r\n                    return response.text();\r\n                }\r\n                else {\r\n                    throw new Error(\"Could not exchange token\");\r\n                }\r\n            })\r\n                .then(firebaseToken => {\r\n                app_1.default\r\n                    .auth()\r\n                    .signInWithCustomToken(firebaseToken)\r\n                    .catch(error => {\r\n                    console.log(error);\r\n                });\r\n            });\r\n            displayButtons();\r\n        });\r\n    }\r\n    function setSession(authResult) {\r\n        // Set the time that the Access Token will expire at\r\n        var expiresAt = JSON.stringify(authResult.expiresIn * 1000 + new Date().getTime());\r\n        localStorage.setItem(\"access_token\", authResult.accessToken);\r\n        localStorage.setItem(\"id_token\", authResult.idToken);\r\n        localStorage.setItem(\"expires_at\", expiresAt);\r\n        webAuth.client.userInfo(authResult.accessToken, function (err, user) {\r\n            localStorage.setItem(\"user\", JSON.stringify(user));\r\n        });\r\n    }\r\n    function logout() {\r\n        // Remove tokens and expiry time from localStorage\r\n        localStorage.removeItem(\"access_token\");\r\n        localStorage.removeItem(\"id_token\");\r\n        localStorage.removeItem(\"expires_at\");\r\n        displayButtons();\r\n    }\r\n    function isAuthenticated() {\r\n        // Check whether the current time is past the\r\n        // Access Token's expiry time\r\n        var expiresAt = JSON.parse(localStorage.getItem(\"expires_at\"));\r\n        return new Date().getTime() < expiresAt;\r\n    }\r\n    function displayButtons() {\r\n        if (isAuthenticated()) {\r\n            loginButton.style.display = \"none\";\r\n            // logoutBtn.style.display = 'inline-block';\r\n            // loginStatus.innerHTML = 'You are logged in!';\r\n        }\r\n        else {\r\n            loginButton.style.display = \"inline-block\";\r\n            // logoutBtn.style.display = 'none';\r\n            // loginStatus.innerHTML =\r\n            // 'You are not logged in! Please log in to continue.';\r\n        }\r\n        enableFirestore();\r\n    }\r\n    function getUser() {\r\n        return JSON.parse(localStorage.getItem(\"user\"));\r\n    }\r\n    function enableFirestore() {\r\n        // // 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥\r\n        // // The Firebase SDK is initialized and available here!\r\n        //\r\n        // firebase.auth().onAuthStateChanged(user => { });\r\n        // firebase.database().ref('/path/to/ref').on('value', snapshot => { });\r\n        // firebase.messaging().requestPermission().then(() => { });\r\n        // firebase.storage().ref('/path/to/ref').getDownloadURL().then(() => { });\r\n        //\r\n        // // 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥\r\n        var db = app_1.default.firestore();\r\n        const saveResponse = (response) => {\r\n            db.collection(\"responses\").add({\r\n                respondant: getUser().email,\r\n                response: response,\r\n                instant: new Date().toISOString()\r\n            });\r\n        };\r\n        submitGreat.onclick = () => saveResponse(\"great\");\r\n        submitNotThatGreat.onclick = () => saveResponse(\"notThatGreat\");\r\n        submitNotGreatAtAll.onclick = () => saveResponse(\"notGreatAtAll\");\r\n    }\r\n});\r\n\n\n//# sourceURL=webpack:///./src/index.ts?");

/***/ }),

/***/ "auth0-js":
/*!************************!*\
  !*** external "auth0" ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("module.exports = auth0;\n\n//# sourceURL=webpack:///external_%22auth0%22?");

/***/ }),

/***/ "firebase/app":
/*!***************************!*\
  !*** external "firebase" ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("module.exports = firebase;\n\n//# sourceURL=webpack:///external_%22firebase%22?");

/***/ })

/******/ });