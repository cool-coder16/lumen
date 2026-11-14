import { firebaseConfig, isConfigured } from '../firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
let fb = null; // { app, auth, db, mods }
const listeners = new Set();
let current = null;

export const demoMode = !isConfigured;

function emit(u) { current = u; listeners.forEach((f) => f(u)); }
export const onUser = (fn) => { listeners.add(fn); fn(current); return () => listeners.delete(fn); };
export const getUser = () => current;
export const getFirebase = () => fb;

const niceUser = (u) => u && ({
  uid: u.uid, name: u.displayName || (u.email ? u.email.split('@')[0] : 'Guest'),
  email: u.email || '', photo: u.photoURL || '',
});

export async function initAuth() {
  if (demoMode) {
    try { const u = JSON.parse(localStorage.getItem('lumen.demoUser') || 'null'); emit(u); } catch { emit(null); }
    return;
  }
  const [appM, authM, fsM] = await Promise.all([
    import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js'),
  ]);
  const app = appM.initializeApp(firebaseConfig);
  const auth = authM.getAuth(app);
  const db = fsM.getFirestore(app);
  fb = { app, auth, db, authM, fsM };
  authM.onAuthStateChanged(auth, (u) => emit(niceUser(u)));
}

const ERR = {
  'auth/invalid-email': 'That email address doesn’t look right.',
  'auth/user-not-found': 'No account with that email.',
  'auth/wrong-password': 'Wrong password — try again.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/email-already-in-use': 'That email already has an account — try signing in.',
  'auth/weak-password': 'Use at least 6 characters for your password.',
  'auth/popup-closed-by-user': 'Sign-in window was closed.',
  'auth/cancelled-popup-request': 'Sign-in window was closed.',
  'auth/popup-blocked': 'Your browser blocked the sign-in popup.',
  'auth/too-many-requests': 'Too many attempts — wait a moment and retry.',
  'auth/network-request-failed': 'Network error — check your connection.',
  'auth/unauthorized-domain': 'This domain isn’t authorized in Firebase Auth settings yet.',
  'auth/operation-not-allowed': 'That sign-in method isn’t enabled in Firebase yet.',
};
export const friendly = (e) => ERR[e?.code] || e?.message || 'Something went wrong.';

function demoLogin(name, email) {
  const u = { uid: 'demo-' + (email || name).toLowerCase().replace(/\W+/g, ''), name, email: email || '', photo: '' };
  localStorage.setItem('lumen.demoUser', JSON.stringify(u)); emit(u); return u;
}

export async function signInGoogle() {
  if (demoMode) return demoLogin('Demo Artist', 'demo@lumen.local');
  const { authM, auth } = fb;
  await authM.signInWithPopup(auth, new authM.GoogleAuthProvider());
}
export async function signInEmail(email, pw) {
  if (demoMode) return demoLogin(email.split('@')[0], email);
  await fb.authM.signInWithEmailAndPassword(fb.auth, email, pw);
}
export async function signUpEmail(name, email, pw) {
  if (demoMode) return demoLogin(name || email.split('@')[0], email);
  const cred = await fb.authM.createUserWithEmailAndPassword(fb.auth, email, pw);
  if (name) { await fb.authM.updateProfile(cred.user, { displayName: name }); emit(niceUser({ ...cred.user, displayName: name })); }
}
export async function signInGuest() {
  if (demoMode) return demoLogin('Guest', '');
  await fb.authM.signInAnonymously(fb.auth);
}
export async function resetPassword(email) {
  if (demoMode) return;
  await fb.authM.sendPasswordResetEmail(fb.auth, email);
}
export async function signOutUser() {
  if (demoMode) { localStorage.removeItem('lumen.demoUser'); emit(null); return; }
  await fb.authM.signOut(fb.auth);
}
