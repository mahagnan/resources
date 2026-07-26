// ============================================================
// Public gallery page logic (index.html)
// No sign-in is required to view this page. Only the Download
// button checks auth state, and prompts sign-in if needed.
// ============================================================

const whoArea = document.getElementById("whoArea");
const galleryArea = document.getElementById("galleryArea");
const galleryCount = document.getElementById("galleryCount");
const cardTemplate = document.getElementById("cardTemplate");
const gateModal = document.getElementById("gateModal");
const closeGate = document.getElementById("closeGate");

let signedInUser = null;

auth.onAuthStateChanged((user) => {
  signedInUser = user;
  if (user) {
    ensureUserRecord(user);
    whoArea.innerHTML = `
      <span style="font-size:0.88rem; color:var(--paper-dim);">${user.email}</span>
      <button class="btn btn-ghost" id="signOutBtn">Sign out</button>
      ${isAdmin(user) ? '<a class="btn btn-ghost" href="admin.html">Admin</a>' : ""}
    `;
    document.getElementById("signOutBtn").addEventListener("click", () => auth.signOut());
  } else {
    whoArea.innerHTML = `<a class="btn btn-ghost" href="login.html">Sign in</a>`;
  }
});

closeGate.addEventListener("click", () => (gateModal.style.display = "none"));

async function loadGallery() {
  let snap;
  try {
    snap = await db.collection("images").orderBy("createdAt", "desc").get();
  } catch (e) {
    galleryArea.innerHTML = `<div class="loading-state">Couldn't load the gallery: ${e.message}</div>`;
    return;
  }

  if (snap.empty) {
    galleryCount.textContent = "";
    galleryArea.innerHTML = `
      <div class="empty-state">
        <span class="eyebrow">Nothing here yet</span>
        The vault is empty. Check back soon.
      </div>`;
    return;
  }

  galleryCount.textContent = `${snap.size} file${snap.size === 1 ? "" : "s"}`;
  galleryArea.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "grid";

  snap.forEach((doc) => {
    const data = doc.data();
    const node = cardTemplate.content.cloneNode(true);

    const thumb = node.querySelector(".thumb-img");
    thumb.src = data.thumbnailUrl || data.fileUrl;
    thumb.alt = data.title;

    node.querySelector(".fname").textContent = data.title;
    node.querySelector(".fdesc").textContent = data.description || "";

    const dl = node.querySelector(".download-btn");
    dl.addEventListener("click", () => {
      if (!signedInUser) {
        gateModal.style.display = "flex";
        return;
      }
      const fileName = data.fileName || `${data.title}.docx`;
      downloadFile(data.fileUrl, fileName, dl);
    });

    grid.appendChild(node);
  });

  galleryArea.appendChild(grid);
}

// Cloudinary URLs are cross-origin, so a plain <a download> is ignored
// by the browser. Fetching the bytes ourselves and saving as a Blob
// makes the download actually happen with the right file name.
async function downloadFile(url, fileName, btn) {
  const original = btn.textContent;
  btn.textContent = "Downloading…";
  btn.disabled = true;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch (e) {
    window.open(url, "_blank");
  } finally {
    btn.textContent = original;
    btn.disabled = false;
  }
}

loadGallery();
