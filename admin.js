// ============================================================
// Admin page logic (admin.html)
// ============================================================

const whoArea = document.getElementById("whoArea");
const gateArea = document.getElementById("gateArea");
const gateSub = document.getElementById("gateSub");
const panelArea = document.getElementById("panelArea");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminSubmitBtn = document.getElementById("adminSubmitBtn");
const switchAccountArea = document.getElementById("switchAccountArea");
const switchAccountBtn = document.getElementById("switchAccountBtn");
const errorMsg = document.getElementById("errorMsg");

const statUsers = document.getElementById("statUsers");
const statImages = document.getElementById("statImages");
const uploadForm = document.getElementById("uploadForm");
const uploadBtn = document.getElementById("uploadBtn");
const progressTrack = document.getElementById("progressTrack");
const progressFill = document.getElementById("progressFill");
const uploadStatus = document.getElementById("uploadStatus");
const manageArea = document.getElementById("manageArea");
const manageCount = document.getElementById("manageCount");

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.add("show");
}
function clearError() {
  errorMsg.classList.remove("show");
}

// ---------- auth gate ----------
auth.onAuthStateChanged((user) => {
  if (user && isAdmin(user)) {
    gateArea.style.display = "none";
    panelArea.style.display = "block";
    whoArea.innerHTML = `
      <span style="font-size:0.88rem; color:var(--paper-dim);">${user.email}</span>
      <button class="btn btn-ghost" id="signOutBtn">Sign out</button>
    `;
    document.getElementById("signOutBtn").addEventListener("click", () => auth.signOut());
    ensureUserRecord(user);
    loadStats();
    loadManageList();
  } else if (user && !isAdmin(user)) {
    panelArea.style.display = "none";
    gateArea.style.display = "block";
    adminLoginForm.style.display = "none";
    switchAccountArea.style.display = "block";
    gateSub.textContent = `You're signed in as ${user.email}, which isn't the admin account.`;
    whoArea.innerHTML = "";
  } else {
    panelArea.style.display = "none";
    gateArea.style.display = "block";
    adminLoginForm.style.display = "block";
    switchAccountArea.style.display = "none";
    gateSub.textContent = "This page is for the site administrator only.";
    whoArea.innerHTML = "";
  }
});

switchAccountBtn.addEventListener("click", () => auth.signOut());

adminLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;

  adminSubmitBtn.disabled = true;
  adminSubmitBtn.textContent = "Signing in…";

  try {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    if (!isAdmin(cred.user)) {
      await auth.signOut();
      showError("That account isn't authorized for the admin panel.");
    }
    // if admin, onAuthStateChanged above handles showing the panel
  } catch (err) {
    const map = {
      "auth/invalid-email": "That email address doesn't look right.",
      "auth/user-not-found": "No account with that email.",
      "auth/wrong-password": "Incorrect password.",
      "auth/invalid-credential": "Incorrect email or password."
    };
    showError(map[err.code] || err.message);
  } finally {
    adminSubmitBtn.disabled = false;
    adminSubmitBtn.textContent = "Sign in";
  }
});

// ---------- stats ----------
async function loadStats() {
  try {
    const usersSnap = await db.collection("users").get();
    statUsers.textContent = usersSnap.size;
  } catch (e) {
    statUsers.textContent = "–";
  }
  try {
    const imagesSnap = await db.collection("images").get();
    statImages.textContent = imagesSnap.size;
  } catch (e) {
    statImages.textContent = "–";
  }
}

// ---------- upload pipeline ----------
uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("titleInput").value.trim();
  const rawFileName = document.getElementById("fileNameInput").value.trim();
  const description = document.getElementById("descInput").value.trim();
  const files = Array.from(document.getElementById("fileInput").files);
  if (!title || !rawFileName || !files.length) return;

  const safeName = rawFileName.replace(/[^a-z0-9\-_ ]/gi, "").trim().replace(/\s+/g, "-") || "file";

  uploadBtn.disabled = true;
  progressTrack.classList.add("show");
  progressFill.style.width = "5%";

  try {
    const watermarked = [];
    for (let i = 0; i < files.length; i++) {
      uploadStatus.textContent = `Watermarking image ${i + 1} of ${files.length}…`;
      const result = await watermarkImage(files[i]);
      watermarked.push(result);
      progressFill.style.width = `${5 + Math.round(((i + 1) / files.length) * 25)}%`;
    }

    uploadStatus.textContent = "Converting to .docx…";
    const docxBlob = buildDocxBlob({
      title,
      description,
      images: watermarked.map((w) => ({
        imageDataUrl: w.dataUrl,
        imgWidth: w.width,
        imgHeight: w.height
      }))
    });
    progressFill.style.width = "55%";

    uploadStatus.textContent = "Uploading thumbnail to Cloudinary…";
    const thumbnailUrl = await uploadToCloudinary(watermarked[0].blob, `${safeName}-thumb.jpg`, "image");
    progressFill.style.width = "75%";

    uploadStatus.textContent = "Uploading document to Cloudinary…";
    const fileUrl = await uploadToCloudinary(docxBlob, `${safeName}.docx`, "raw");
    progressFill.style.width = "90%";

    uploadStatus.textContent = "Saving to gallery…";
    await db.collection("images").add({
      title,
      description,
      fileName: `${safeName}.docx`,
      thumbnailUrl,
      fileUrl,
      fileType: "docx",
      imageCount: files.length,
      uploadedBy: auth.currentUser.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    progressFill.style.width = "100%";
    uploadStatus.textContent = `"${title}" uploaded (${files.length} image${files.length === 1 ? "" : "s"}).`;
    uploadForm.reset();
    setTimeout(() => progressTrack.classList.remove("show"), 600);
    loadStats();
    loadManageList();
  } catch (err) {
    uploadStatus.textContent = "Something went wrong: " + err.message;
    progressTrack.classList.remove("show");
  } finally {
    uploadBtn.disabled = false;
  }
});

// ---------- manage list ----------
async function loadManageList() {
  let snap;
  try {
    snap = await db.collection("images").orderBy("createdAt", "desc").get();
  } catch (e) {
    manageArea.innerHTML = `<div class="loading-state">Couldn't load files: ${e.message}</div>`;
    return;
  }

  if (snap.empty) {
    manageCount.textContent = "";
    manageArea.innerHTML = `<div class="empty-state"><span class="eyebrow">Nothing yet</span>Upload the first file above.</div>`;
    return;
  }

  manageCount.textContent = `${snap.size} file${snap.size === 1 ? "" : "s"}`;

  const rows = [];
  snap.forEach((doc) => {
    const d = doc.data();
    rows.push(`
      <tr>
        <td class="title-cell">${d.title}</td>
        <td>${d.fileName || ""}</td>
        <td><a href="${d.fileUrl}" target="_blank" rel="noopener">Open</a></td>
        <td><button class="btn btn-danger" data-doc-id="${doc.id}">Remove</button></td>
      </tr>
    `);
  });

  manageArea.innerHTML = `
    <table class="manage-table">
      <thead><tr><th>Title</th><th>File</th><th>Link</th><th></th></tr></thead>
      <tbody>${rows.join("")}</tbody>
    </table>
    <p class="upload-hint">"Remove" delists the file from the gallery. The file itself stays on Cloudinary — see README for adding real deletion via a Cloud Function.</p>
  `;

  manageArea.querySelectorAll("[data-doc-id]").forEach((btn) => {
    btn.addEventListener("click", () => removeFile(btn.getAttribute("data-doc-id")));
  });
}

async function removeFile(docId) {
  if (!confirm("Remove this file from the gallery listing?")) return;
  try {
    await db.collection("images").doc(docId).delete();
    loadManageList();
    loadStats();
  } catch (e) {
    alert("Couldn't remove: " + e.message);
  }
}
