// ============================================================
//  PaperBank – Firebase Configuration
//  Project: paperbank-32c23
// ============================================================
import { initializeApp }        from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth }              from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore }         from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAnalytics }         from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDiVuSdoHLnjcXQ0ZQukpl6SNmo9E4ETCw",
  authDomain:        "paperbank-32c23.firebaseapp.com",
  projectId:         "paperbank-32c23",
  storageBucket:     "paperbank-32c23.firebasestorage.app",
  messagingSenderId: "1029763702592",
  appId:             "1:1029763702592:web:2aef21f62ecc499d6a64a5",
  measurementId:     "G-T1W6MW5XFS"
};

const app       = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export const analytics = getAnalytics(app);

// ── Owner & Editor emails (hardcoded) ──
export const OWNER_EMAIL = "akeel.rncoe@gmail.com";
export const EDITOR_EMAILS = []; // Add editor emails here, e.g. ["editor@example.com"]
