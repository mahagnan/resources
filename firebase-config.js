// ============================================================
// FIREBASE CONFIG
// ------------------------------------------------------------
// Firebase is used here for AUTH + FIRESTORE only. File storage
// moved to Cloudinary (see cloudinary-config.js), so this project
// never needs the paid "Blaze" plan that Firebase Storage asks for.
//
// Replace every value below with the config object from your own
// Firebase project: Console → Project settings → General →
// "Your apps" → Web app → SDK setup and configuration
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyAI34-4lvpfD7jbAEtO16HqWTHY3AMBGlo",
    authDomain: "resourcesappbymahagnan.firebaseapp.com",
    projectId: "resourcesappbymahagnan",
    storageBucket: "resourcesappbymahagnan.firebasestorage.app",
    messagingSenderId: "1067155648651",
    appId: "1:1067155648651:web:3d8edcf5afd4ba6135648e",
    measurementId: "G-1DY4X2X3BY"
};

// The only account allowed to see the admin panel.
const ADMIN_EMAIL = "mahagnan01@gmail.com";

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Called right after any successful sign-in (regular or admin) so we
// have a real count of distinct people who've signed in, and when
// each last visited. This is what the admin stats strip reads from.
async function ensureUserRecord(user) {
  if (!user) return;
  const ref = db.collection("users").doc(user.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      email: user.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    });
  } else {
    await ref.update({
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}

function isAdmin(user) {
  return !!user && user.email === ADMIN_EMAIL;
}
