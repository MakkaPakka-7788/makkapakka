import { signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const ACTIVE_WINDOW_MS = 120000;
const game = new URL(import.meta.url).searchParams.get("game") || "game";
let account = null;
let auth = null;
let heartbeat = null;
let currentUid = null;
let lastSuccessfulHeartbeatAt = 0;

async function recordJoinIfNeeded(uid) {
  if (!account?.db || !uid) return;
  const presenceRef = doc(account.db, "presence", uid);
  const joinEventRef = doc(collection(account.db, "presenceEvents"));
  const observedAt = Date.now();

  await runTransaction(account.db, async transaction => {
    const current = await transaction.get(presenceRef);
    const lastSeen = current.exists()
      ? current.data().lastSeen?.toMillis?.() || 0
      : 0;
    const needsJoinEvent = !lastSeen || observedAt - lastSeen > ACTIVE_WINDOW_MS;

    transaction.set(presenceRef, {
      game,
      lastSeen: serverTimestamp()
    }, { merge: true });

    if (needsJoinEvent) {
      transaction.set(joinEventRef, {
        uid,
        game,
        joinedAt: serverTimestamp()
      });
    }
  });

  lastSuccessfulHeartbeatAt = Date.now();
}

async function heartbeatNow(uid) {
  if (!account?.db || !uid) return;
  await setDoc(doc(account.db, "presence", uid), {
    game,
    lastSeen: serverTimestamp()
  }, { merge: true });
  lastSuccessfulHeartbeatAt = Date.now();
}

function startHeartbeat(user) {
  if (!user?.uid || !account?.db) return;
  if (currentUid === user.uid && heartbeat !== null) return;
  if (heartbeat !== null) clearInterval(heartbeat);
  currentUid = user.uid;
  lastSuccessfulHeartbeatAt = 0;

  recordJoinIfNeeded(currentUid).catch(error => {
    console.warn("Live player join tracking unavailable:", error);
  });

  heartbeat = setInterval(() => {
    const uid = currentUid;
    const shouldCheckForNewJoin =
      Date.now() - lastSuccessfulHeartbeatAt > ACTIVE_WINDOW_MS;
    const update = shouldCheckForNewJoin
      ? recordJoinIfNeeded(uid)
      : heartbeatNow(uid);
    update.catch(error => {
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
