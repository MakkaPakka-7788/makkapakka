import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
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
const optOutKey = "makkapakkaPresenceOptOut";
let account = null;
let auth = null;
let activeUid = null;
let heartbeat = null;

const style = document.createElement("style");
style.textContent = `
  #mp-presence {
    position: fixed;
    z-index: 100000;
    right: 14px;
    bottom: 14px;
    width: min(340px, calc(100vw - 28px));
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
    border:0; border-radius:7px; padding:8px 11px;
    background:#e8f1ff; color:#1769e0; font-weight:700; cursor:pointer;
  }
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

function show(message, buttonLabel, onClick, error = false) {
  widget.replaceChildren();
  const title = document.createElement("strong");
  title.textContent = "Live player count";
  const text = document.createElement("p");
  text.textContent = message;
  if (error) text.className = "mp-error";
  widget.append(title, text);
  if (buttonLabel && onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = buttonLabel;
    button.addEventListener("click", onClick);
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

async function sendHeartbeat(uid) {
  if (!account?.db || !uid) return;
  await setDoc(doc(account.db, "presence", uid), {
    game,
    lastSeen: serverTimestamp()
  }, { merge: true });
}

function beginPresence(user) {
  if (!user?.uid || !account?.db || localStorage.getItem(optOutKey) === "yes") return;
  activeUid = user.uid;
  sendHeartbeat(activeUid).then(() => {
    show(`Counted online in ${displayGame}. The site owner sees your game and active status only—no screen, name, or email.`, "Stop sharing", stopSharing);
  }).catch(error => {
    console.error("Could not start live player presence:", error);
    show("The live player count is temporarily unavailable.", null, null, true);
  });
  clearHeartbeat();
  heartbeat = setInterval(() => {
    sendHeartbeat(activeUid).catch(error => {
      console.warn("Live player heartbeat failed:", error);
    });
  }, 45000);
}

async function stopSharing() {
  localStorage.setItem(optOutKey, "yes");
  const uid = activeUid;
  activeUid = null;
  await removePresence(uid);
  show("You are no longer included in the live player count.", "Resume sharing", resumeSharing);
}

async function resumeSharing() {
  localStorage.removeItem(optOutKey);
  if (auth?.currentUser) {
    beginPresence(auth.currentUser);
  } else {
    show("Reconnecting to the live player count…", null, null);
    try {
      await signInAnonymously(auth);
    } catch (error) {
      show("Could not reconnect to the live player count.", null, null, true);
    }
  }
}

function handleAuth(user) {
  if (!user) {
    activeUid = null;
    clearHeartbeat();
    show("Connecting to the anonymous live player count…", null, null);
    return;
  }
  if (localStorage.getItem(optOutKey) === "yes") {
    show("You are not included in the live player count.", "Resume sharing", resumeSharing);
    return;
  }
  beginPresence(user);
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
  auth = account.auth;

  onAuthStateChanged(auth, user => {
    if (!user) {
      if (localStorage.getItem(optOutKey) === "yes") {
        show("You are not included in the live player count.", "Resume sharing", resumeSharing);
      } else {
        signInAnonymously(auth).catch(error => {
          console.error("Anonymous presence sign-in failed:", error);
          show("The live player count is temporarily unavailable.", null, null, true);
        });
      }
      return;
    }
    handleAuth(user);
  });
} catch (error) {
  console.error("Live player count could not initialize:", error);
  show("The live player count is temporarily unavailable.", null, null, true);
}
