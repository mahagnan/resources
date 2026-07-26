// ============================================================
// Login page logic (login.html)
// ============================================================

let isSignup = false;

const formTitle = document.getElementById("formTitle");
const formSub = document.getElementById("formSub");
const submitBtn = document.getElementById("submitBtn");
const switchText = document.getElementById("switchText");
const switchBtn = document.getElementById("switchBtn");
const errorMsg = document.getElementById("errorMsg");
const emailForm = document.getElementById("emailForm");
const googleBtn = document.getElementById("googleBtn");

function redirectTarget() {
  const params = new URLSearchParams(window.location.search);
  return params.get("redirect") || "index.html";
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.add("show");
}
function clearError() {
  errorMsg.classList.remove("show");
  errorMsg.textContent = "";
}

function friendlyError(err) {
  const map = {
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/user-not-found": "No account with that email. Try creating one instead.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/email-already-in-use": "An account already exists for that email — try signing in instead.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/popup-closed-by-user": "Google sign-in was closed before finishing."
  };
  return map[err.code] || err.message;
}

switchBtn.addEventListener("click", () => {
  isSignup = !isSignup;
  clearError();
  if (isSignup) {
    formTitle.textContent = "Create your account";
    formSub.textContent = "Sign up to download files from the gallery.";
    submitBtn.textContent = "Create account";
    switchText.textContent = "Already have an account?";
    switchBtn.textContent = "Sign in instead";
  } else {
    formTitle.textContent = "Sign in to download";
    formSub.textContent = "Browsing the gallery is free — sign in to download files.";
    submitBtn.textContent = "Sign in";
    switchText.textContent = "New here?";
    switchBtn.textContent = "Create an account";
  }
});

emailForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  submitBtn.disabled = true;
  submitBtn.textContent = isSignup ? "Creating account…" : "Signing in…";

  try {
    let cred;
    if (isSignup) {
      cred = await auth.createUserWithEmailAndPassword(email, password);
    } else {
      cred = await auth.signInWithEmailAndPassword(email, password);
    }
    await ensureUserRecord(cred.user);
    window.location.href = redirectTarget();
  } catch (err) {
    showError(friendlyError(err));
    submitBtn.disabled = false;
    submitBtn.textContent = isSignup ? "Create account" : "Sign in";
  }
});

googleBtn.addEventListener("click", async () => {
  clearError();
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const cred = await auth.signInWithPopup(provider);
    await ensureUserRecord(cred.user);
    window.location.href = redirectTarget();
  } catch (err) {
    showError(friendlyError(err));
  }
});

// If already signed in, skip straight back to the gallery.
auth.onAuthStateChanged((user) => {
  if (user) window.location.href = redirectTarget();
});
