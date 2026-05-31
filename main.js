import { PublicClientApplication } from "@azure/msal-browser";

// =====================================
// ANPASSEN
// =====================================
const repoBasePath = "/haupt/"; // z. B. "/mein-login-hub/"
const redirectUri = window.location.origin + repoBasePath;

// Nur diese Benutzer dürfen die Tools sehen
const allowedUsers = [
  "pete.adler@vodafone.com",
  "stefanie.adler@vodafone.com"
  "martin.elstnerr@vodafone.com"
].map(x => x.trim().toLowerCase());

// Optional: ganze Domäne erlauben
// const allowedDomains = ["firma.de"];

const msalConfig = {
  auth: {
    clientId: "YOUR_CLIENT_ID",
    authority: "https://login.microsoftonline.com/YOUR_TENANT_ID",
    redirectUri: redirectUri,
    postLogoutRedirectUri: redirectUri,
    navigateToLoginRequestUrl: false
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false
  }
};

const loginRequest = {
  scopes: ["openid", "profile", "email", "User.Read"]
};

// =====================================
// MSAL INITIALISIEREN
// =====================================
const msalInstance = new PublicClientApplication(msalConfig);

// =====================================
// UI-ELEMENTE
// =====================================
const statusEl = document.getElementById("status");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const toolsEl = document.getElementById("tools");
const userInfoEl = document.getElementById("userInfo");

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.className = isError ? "status error" : "status";
}

function showLoggedOutState() {
  loginBtn.classList.remove("hidden");
  logoutBtn.classList.add("hidden");
  toolsEl.classList.add("hidden");
  userInfoEl.classList.add("hidden");
  userInfoEl.textContent = "";
}

function showLoggedInState(account, displayName = "") {
  loginBtn.classList.add("hidden");
  logoutBtn.classList.remove("hidden");
  toolsEl.classList.remove("hidden");
  userInfoEl.classList.remove("hidden");
  userInfoEl.textContent =
    `Angemeldet als: ${displayName || account?.name || "-"} (${account?.username || "-"})`;
}

function normalizeUser(value) {
  return (value || "").trim().toLowerCase();
}

function isAllowedAccount(account) {
  const username = normalizeUser(account?.username);

  if (allowedUsers.includes(username)) {
    return true;
  }

  // Optional: ganze Domäne erlauben
  // const domain = username.split("@")[1] || "";
  // if (allowedDomains.includes(domain)) {
  //   return true;
  // }

  return false;
}

async function callGraphMe(account) {
  const tokenResponse = await msalInstance.acquireTokenSilent({
    ...loginRequest,
    account
  });

  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: {
      Authorization: `Bearer ${tokenResponse.accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error("Graph /me konnte nicht geladen werden.");
  }

  return await response.json();
}

async function evaluateAccess() {
  const accounts = msalInstance.getAllAccounts();

  if (!accounts.length) {
    setStatus("Nicht angemeldet.");
    showLoggedOutState();
    return;
  }

  const account = accounts[0];

  if (!isAllowedAccount(account)) {
    setStatus("Kein Zugriff: Benutzer nicht freigegeben.", true);
    showLoggedOutState();
    return;
  }

  try {
    const me = await callGraphMe(account);
    const displayName = me?.displayName || account?.name || "";
    setStatus("Zugriff erlaubt.");
    showLoggedInState(account, displayName);
  } catch (error) {
    console.warn(error);
    setStatus("Zugriff erlaubt.");
    showLoggedInState(account);
  }
}

async function initializeApp() {
  try {
    await msalInstance.initialize();
    await msalInstance.handleRedirectPromise();
    await evaluateAccess();
  } catch (error) {
    console.error(error);
    setStatus("Fehler bei der Initialisierung der Anmeldung.", true);
    showLoggedOutState();
  }
}

loginBtn.addEventListener("click", async () => {
  try {
    await msalInstance.loginPopup(loginRequest);
    await evaluateAccess();
  } catch (error) {
    console.error(error);
    setStatus("Anmeldung abgebrochen oder fehlgeschlagen.", true);
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    const accounts = msalInstance.getAllAccounts();
    await msalInstance.logoutPopup({
      account: accounts[0] || undefined,
      postLogoutRedirectUri: redirectUri
    });
    setStatus("Abgemeldet.");
    showLoggedOutState();
  } catch (error) {
    console.error(error);
    setStatus("Fehler beim Abmelden.", true);
  }
});

initializeApp();
