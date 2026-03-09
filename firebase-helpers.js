// ============================================================
//  PaperBank – Firebase Auth & Firestore Helpers
// ============================================================
import { auth, db, OWNER_EMAIL, EDITOR_EMAILS } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  FacebookAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, getDocs, query, where, orderBy,
  addDoc, serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── AUTH PROVIDERS ────────────────────────────────────────
const googleProvider   = new GoogleAuthProvider();
const githubProvider   = new GithubAuthProvider();
const facebookProvider = new FacebookAuthProvider();

// ── CURRENT USER STATE ────────────────────────────────────
export let currentUser = null;
export let currentRole = "visitor"; // visitor | user | editor | owner

export function onUserChange(callback) {
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      currentRole = await getUserRole(user);
    } else {
      currentRole = "visitor";
    }
    callback(user, currentRole);
  });
}

// ── ROLE HELPERS ──────────────────────────────────────────
export async function getUserRole(user) {
  if (!user) return "visitor";
  if (user.email === OWNER_EMAIL) return "owner";
  if (EDITOR_EMAILS.includes(user.email)) return "editor";
  const snap = await getDoc(doc(db, "users", user.uid));
  if (snap.exists()) {
    return snap.data().role || "user";
  }
  return "user";
}

// ── SIGN UP (email + password) ────────────────────────────
export async function signUpEmail(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await setDoc(doc(db, "users", cred.user.uid), {
    uid:         cred.user.uid,
    email:       email,
    displayName: displayName,
    role:        "user",
    createdAt:   serverTimestamp(),
    banned:      false
  });
  return cred.user;
}

// ── SIGN IN (email + password) ────────────────────────────
export async function signInEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserDoc(cred.user);
  return cred.user;
}

// ── GOOGLE SIGN IN ────────────────────────────────────────
export async function signInGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  await ensureUserDoc(cred.user);
  return cred.user;
}

// ── GITHUB SIGN IN ────────────────────────────────────────
export async function signInGithub() {
  const cred = await signInWithPopup(auth, githubProvider);
  await ensureUserDoc(cred.user);
  return cred.user;
}

// ── FACEBOOK SIGN IN ─────────────────────────────────────
export async function signInFacebook() {
  const cred = await signInWithPopup(auth, facebookProvider);
  await ensureUserDoc(cred.user);
  return cred.user;
}

// ── PHONE SIGN IN (step 1: send OTP) ─────────────────────
export function setupRecaptcha(containerId) {
  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {}
  });
}

export async function sendOTP(phoneNumber) {
  const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
  window.confirmationResult = confirmationResult;
}

export async function verifyOTP(otp) {
  const cred = await window.confirmationResult.confirm(otp);
  await ensureUserDoc(cred.user);
  return cred.user;
}

// ── SIGN OUT ──────────────────────────────────────────────
export async function logOut() {
  await signOut(auth);
}

// ── PASSWORD RESET ────────────────────────────────────────
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ── ENSURE USER DOC EXISTS ────────────────────────────────
async function ensureUserDoc(user) {
  const ref  = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid:         user.uid,
      email:       user.email || "",
      displayName: user.displayName || "User",
      role:        user.email === OWNER_EMAIL ? "owner" : "user",
      createdAt:   serverTimestamp(),
      banned:      false
    });
  }
}

// ── ADMIN: GET ALL USERS ──────────────────────────────────
export async function getAllUsers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── ADMIN: SET USER ROLE ──────────────────────────────────
export async function setUserRole(uid, role) {
  await updateDoc(doc(db, "users", uid), { role });
}

// ── ADMIN: BAN / DELETE USER ──────────────────────────────
export async function banUser(uid) {
  await updateDoc(doc(db, "users", uid), { banned: true });
}

export async function deleteUserDoc(uid) {
  await deleteDoc(doc(db, "users", uid));
}

// ── RESOURCES ─────────────────────────────────────────────
export async function getResources(pathKey) {
  const snap = await getDocs(
    query(collection(db, "resources"), where("pathKey", "==", pathKey), orderBy("createdAt", "asc"))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addResource(pathKey, data) {
  return await addDoc(collection(db, "resources"), {
    ...data,
    pathKey,
    createdAt: serverTimestamp()
  });
}

export async function deleteResource(id) {
  await deleteDoc(doc(db, "resources", id));
}

// ── FOLDERS ───────────────────────────────────────────────
export async function getFolders(pathKey) {
  const snap = await getDocs(
    query(collection(db, "folders"), where("pathKey", "==", pathKey), orderBy("createdAt", "asc"))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addFolder(pathKey, data) {
  return await addDoc(collection(db, "folders"), {
    ...data,
    pathKey,
    createdAt: serverTimestamp()
  });
}

export async function deleteFolder(id) {
  await deleteDoc(doc(db, "folders", id));
}

// ── COMMENTS ──────────────────────────────────────────────
export async function getComments(resourceId) {
  const snap = await getDocs(
    query(collection(db, "comments"), where("resourceId", "==", resourceId), orderBy("createdAt", "asc"))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addComment(resourceId, text, user) {
  return await addDoc(collection(db, "comments"), {
    resourceId,
    text,
    authorId:   user.uid,
    authorName: user.displayName || user.email || "User",
    createdAt:  serverTimestamp()
  });
}

export async function deleteComment(id) {
  await deleteDoc(doc(db, "comments", id));
}

export async function getAllComments() {
  const snap = await getDocs(
    query(collection(db, "comments"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
