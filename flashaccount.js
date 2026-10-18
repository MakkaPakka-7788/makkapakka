
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDbUT9wwrIDM44XJPSESByTHyjrGYSlYZY",
  authDomain: "flashcard-com.firebaseapp.com",
  projectId: "flashcard-com",
  storageBucket: "flashcard-com.firebasestorage.app",
  messagingSenderId: "748102395460",
  appId: "1:748102395460:web:d41e77cb9962a8c5bb3e11",
  measurementId: "G-E7YJGGJF5C"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

async function signInWithGoogle() {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Google sign-in failed:", error);
    alert("Sign-in failed: " + error.message);
  }
}

async function signOutFlashAccount() {
  await signOut(auth);
}

onAuthStateChanged(auth, user => {
  window.dispatchEvent(new CustomEvent("flashaccount-auth", {
    detail: user ? {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL
    } : null
  }));
});

window.FlashAccount = {
  auth,
  db,
  signInWithGoogle,
  signOut: signOutFlashAccount
};

