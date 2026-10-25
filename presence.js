/* Anonymous game presence is not recorded until a player signs in and opts in. */
import { doc, deleteDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const game = new URL(import.meta.url).searchParams.get("game") || "game";
const gameNames = {
  snake: "Snake",
  tetris: "Tetris",
  pong: "Pong",
  flappybird: "Flappy Bird",
  towerdefense: "Tower Defence",
  dino: "Dino",
  pacman: "Pac-Man",
  "danger-spinner": "Danger Spinner",
  rng: "RNG",
  minesweeper: "Minesweeper",
  plinko: "Plinko",
  "car.f1": "Car",
  "flashcards.city": "Fable Cities",
  "dr-doom": "Doom",
  clicker: "Antimatter Dimensions",
  balatro: "Poker",
  polytrack: "Poly Track",
  fishing: "Tiny Fishing",
  ironcrown: "Ironcrown"
};
const displayGame = gameNames[game] || "Game";
const consentKey = "makkapakkaPresenceConsent";
let account = null;
let activeUid = null;
let heartbeat = null;
let presenceRef = null;

const style = document.createElement("style");
style.textContent = `
  #mp-presence {
    position: fixed;
    z-index: 100000;
    right: 14px;
    bottom: 14px;
    width: min(330px, calc(100vw - 28px));
    padding: 13px 15px;
    border: 1px solid #cbd8e8;
    border-radius: 12px;
    background: rgba(255,255,255,.97);
    color: #1d2a3a;
    box-shadow: 0 8px 28px rgba(15,35,60,.22);
    font: 13px/1.45 Arial, Helvetica, sans-serif;
  }
  #mp-presence strong { display:block; margin-bottom:4px; color:#1769e0; }
  #mp-presence p { margin:0 0 9px; color:#53657a; }
  #mp-presence button {
    border:0; border-radius:7px; padding:8px 11px; margin:0 7px 0 0;
    background:#1769e0; color:white; font-weight:700; cursor:pointer;
  }
  #mp-presence button.secondary { background:#e8f1ff; color:#1769e0; }
  #mp-presence .mp-error { color:#b42318; }
  @media (max-width: 520px) {
    #mp-presence { right:10px; bottom:10px; width:calc(100vw - 20px); }
  }
`;
document.head.appendChild(style);

const widget = document.createElement("aside");
widget.id = "mp-presence";
widget.setAttribute("aria-live", "polite");
document.body.appendChild(widget);

function render(message, actions = [], isError = false) {
  widget.replaceChildren();
  const title = document.createElement("strong");
  title.textContent = "Live player count";
  const text = document.createElement("p");
  text.textContent = message;
  if (isError) text.className = "mp-error";
  widget.append(title, text);
  for (const action of actions) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    if (action.secondary) button.className = "secondary";
    button.addEventListener("click", action.onClick);
    widget.appendChild(button);
  }
}

function clearHeartbeat() {
  if (heartbeat !== null) {
    clearInterval(heartbeat);
    heartbeat = null;
  }
}

async function removePresence(uid = activeUid) {
  clearHeartbeat();
  if (!uid || !account?.db) return;
  try {
    await deleteDoc(doc(account.db, "presence", uid));
  } catch (error) {
    console.warn("Could not remove live presence:", error);
  }
}

async function writeHeartbeat(uid) {
  if (!account?.db || !uid) return;
  await setDoc(doc(account.db, "presence", uid), {
    game,
    lastSeen: serverTimestamp()
  }, { merge: true });
}

async function startSharing(user) {
  if (!user?.uid || !account?.db) return;
  clearHeartbeat();
  activeUid = user.uid;
  presenceRef = doc(account.db, "presence", activeUid);
  try {
    await writeHeartbeat(activeUid);
    render(`Sharing your online status and ${displayGame} with the live count. Your screen, name, and email are not shown.`, [
      { label: "Stop sharing", secondary: true, onClick: stopSharing }
    ]);
    heartbeat = setInterval(() => {
      writeHeartbeat(activeUid).catch(error => {
        console.warn("Live player heartbeat failed:", error);
      });
    }, 45000);
  } catch (error) {
    console.error("Could not start live player presence:", error);
    render("The live count is temporarily unavailable. Please try again later.", [], true);
  }
}

async function stopSharing() {
  const uid = activeUid;
  localStorage.setItem(consentKey, "no");
  activeUid = null;
  presenceRef = null;
  await removePresence(uid);
  render("You are not included in the live player count.", [
    { label: "Join the count", onClick: joinSharing }
  ]);
}

async function joinSharing() {
  localStorage.setItem(consentKey, "yes");
  const user = account?.auth?.currentUser;
  if (user) {
    await startSharing(user);
    return;
  }
  render("Sign in with Google to join the live player count.", [
    { label: "Sign in with Google", onClick: async () => {
      try {
        await account.signInWithGoogle();
      } catch (error) {
        render("Google sign-in failed. Please try again.", [], true);
      }
    } },
    { label: "Not now", secondary: true, onClick: () => {
      localStorage.setItem(consentKey, "no");
      render("You are not included in the live player count.", [
        { label: "Join the count", onClick: joinSharing }
      ]);
    } }
  ]);
}

function handleAuth(user) {
  if (!user) {
    const oldUid = activeUid;
    activeUid = null;
    presenceRef = null;
    clearHeartbeat();
    if (oldUid) removePresence(oldUid);
    render("Sign in with Google and choose to join if you want to appear in the live player count.", [
      { label: "Sign in with Google", onClick: joinSharing }
    ]);
    return;
  }

  if (localStorage.getItem(consentKey) === "yes") {
    startSharing(user);
    return;
  }

  render("Share only your game and online status with the live count. No screen, name, or email is shown.", [
    { label: "Join the count", onClick: joinSharing },
    { label: "Not now", secondary: true, onClick: () => {
      localStorage.setItem(consentKey, "no");
      render("You are not included in the live player count.", [
        { label: "Join the count", onClick: joinSharing }
      ]);
    } }
  ]);
}

window.addEventListener("pagehide", () => {
  const uid = activeUid;
  clearHeartbeat();
  if (uid && account?.db) {
    deleteDoc(doc(account.db, "presence", uid)).catch(() => {});
  }
}, { once: true });

try {
  await import("https://makkapakka-7788.github.io/makkapakka/flashaccount.js");
  account = window.FlashAccount;
  if (!account) throw new Error("FlashAccount did not initialize.");
  window.addEventListener("flashaccount-auth", event => {
    handleAuth(event.detail);
  });
  if (account.auth.currentUser) {
    handleAuth(account.auth.currentUser);
  } else {
    render("Sign in with Google and choose to join if you want to appear in the live player count.", [
      { label: "Sign in with Google", onClick: joinSharing }
    ]);
  }
} catch (error) {
  console.error("Live player count could not initialize:", error);
  render("The live player count is temporarily unavailable.", [], true);
}
