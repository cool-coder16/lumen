// Firebase web-app config. These are public identifiers (safe to commit);
// access is enforced by Firebase Auth + Firestore security rules (firestore.rules).
// Leave apiKey empty to run in DEMO MODE (accounts + gallery stored in the browser only).
export const firebaseConfig = {
  apiKey: "AIzaSyBb5pGcByZyLEYfprBJod4MsF9GagbSJh8",
  authDomain: "lumen-studio-ea4af.firebaseapp.com",
  projectId: "lumen-studio-ea4af",
  storageBucket: "lumen-studio-ea4af.firebasestorage.app",
  messagingSenderId: "795739016114",
  appId: "1:795739016114:web:1fcd328fe0808a1b00f2ab",
};
export const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
