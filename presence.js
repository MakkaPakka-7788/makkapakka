import { signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const game = new URL(import.meta.url).searchParams.get("game") || "game";
let account = null;
let auth = null;
let heartbeat = null;
let currentUid = null;

async function heartbeatNow(uid) {
  if (!account?.db || !uid) return;
  await setDoc(doc(account.db, "presence", uid), {
    game,
    lastSeen: serverTimestamp()
  }, { merge: true });
}

function startHeartbeat(user) {
  if (!user?.uid || !account?.db) return;
  if (currentUid === user.uid && heartbeat !== null) return;
  if (heartbeat !== null) clearInterval(heartbeat);
  currentUid = user.uid;

  heartbeatNow(currentUid).catch(error => {
    console.warn("Live player heartbeat unavailable:", error);
  });
  heartbeat = setInterval(() => {
    heartbeatNow(currentUid).catch(error => {
      console.warn("Live player heartbeat failed:", error);
    });
  }, 45000);
}

try {
  await import("https://makkapakka-7788.github.io/makkapakka/flashaccount.js");
  account = window.FlashAccount;
  if (!account) throw new Error("FlashAccount did not initialize.");
  auth = account.auth;

  onAuthStateChanged(auth, user => {
    if (user) {
      startHeartbeat(user);
      return;
    }
    if (heartbeat !== null) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
    currentUid = null;
    signInAnonymously(auth).catch(error => {
      console.warn("Anonymous player heartbeat unavailable:", error);
    });
  });
} catch (error) {
  console.warn("Live player heartbeat could not initialize:", error);
}
