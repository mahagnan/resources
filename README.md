# PhotoVault — setup guide (v2)

Public gallery of watermarked images auto-converted to `.docx`.
Anyone can browse; signing in is only required to download. A
separate admin page lets you upload, watermark, and manage files.

## What changed from v1

- **Storage moved from Firebase Storage → Cloudinary.** Firebase Storage
  now requires the paid "Blaze" plan even for small usage — that's the
  upgrade prompt you hit. Cloudinary has a real free tier and works
  fine for this.
- **File format is `.docx` instead of `.pdf`,** with a "MahaGnan" mark
  stamped onto the image 3 times, rotated, blended in, before it's
  packaged into the Word file.
- **The gallery is public.** Anyone can see thumbnails, titles, and
  descriptions without signing in. Clicking **Download** is the only
  thing gated behind sign-in.
- **The admin panel is a separate page** (`admin.html`) with its own
  sign-in gate, entirely apart from the public gallery.

## What's in this folder

```
index.html                  → public gallery (no login needed to browse)
login.html                  → regular sign-in/sign-up (Google or email), unlocks downloads
admin.html                  → admin-only page: upload, watermark, manage
assets/style.css            → all styling
assets/firebase-config.js   → your Firebase keys (Auth + Firestore only)
assets/cloudinary-config.js → your Cloudinary cloud name + upload preset
assets/watermark.js         → canvas watermarking (the "MahaGnan" stamp)
assets/docx-generator.js    → builds the .docx file in-browser
assets/gallery.js           → public gallery logic
assets/login.js             → regular login logic
assets/admin.js             → admin gate + upload pipeline + manage list
firestore.rules             → security rules (paste into Firebase console)
```

There's no `storage.rules` anymore — Firebase Storage isn't used.

---

## 1. Firebase setup (Auth + Firestore only)

You already have a project (`resources-a6232`). A couple of corrections
based on your screenshot:

- **Ignore Realtime Database** — you don't need it, and the "Parse
  error" happened because Storage rules syntax was pasted into the
  Realtime Database rules editor (they're different rule languages).
  Just click **Discard** there.
- Make sure **Firestore Database** exists (Databases & Storage →
  Firestore Database → Create database, if you haven't already).
- **Authentication → Sign-in method**: enable **Email/Password** and
  **Google**.
- **Authentication → Users → Add user**: create
  `mahagnan01@gmail.com` / `MahaGnan@2026` — this is your real admin
  login, checked against `ADMIN_EMAIL` in `firebase-config.js`.
- **Firestore Database → Rules**: paste the contents of
  `firestore.rules` → Publish.

`assets/firebase-config.js` is already filled in with the values from
your screenshot — no changes needed there.

## 2. Cloudinary setup (file storage)

1. Sign up free at [cloudinary.com](https://cloudinary.com) (no credit
   card required; free tier is ~25GB storage/bandwidth, plenty for this).
2. On your **Dashboard**, copy the **Cloud name** shown near the top.
3. Go to **Settings (gear icon) → Upload** → scroll to **Upload
   presets** → **Add upload preset**.
   - **Signing mode: Unsigned** (this is what lets the browser upload
     directly, with no server and no exposed secret key).
   - Save, and copy the preset's name.
4. Open `assets/cloudinary-config.js` and set:
   ```javascript
   const CLOUDINARY_CLOUD_NAME = "your-cloud-name";
   const CLOUDINARY_UPLOAD_PRESET = "your-preset-name";
   ```

That's the whole setup — no API key or secret goes in the code.

### About "PDF vs DOCX" on Cloudinary
You mentioned PDF links weren't working — that's a known Cloudinary
quirk: PDFs are treated as an **image** resource type (since Cloudinary
can rasterize them), and *serving* raw PDFs sometimes needs extra
account settings (`allowed_for_strict` / enabling PDF delivery) that
aren't on by default for security reasons. `.docx` files are uploaded
as a plain **raw** resource type instead, which doesn't have that
restriction — so it "just works," which is exactly why this version
switched to `.docx`.

## 3. How the upload pipeline works

When you're signed in on `admin.html` and submit the upload form:

1. **Watermark** — the chosen image is drawn onto an in-memory canvas,
   and "MahaGnan" is stamped 3 times diagonally across it, rotated
   ~28°, blended at low opacity so it doesn't obscure the photo
   (`assets/watermark.js`).
   - If you have an actual logo file (a transparent PNG works best),
     add it to `assets/` and set `WATERMARK_LOGO_URL` in that file —
     it'll stamp your logo image instead of the text.
2. **Convert to .docx** — the watermarked image, title, and description
   are wrapped into a small HTML document and handed to the
   `html-docx-js` library, which packages it as a real `.docx`
   (`assets/docx-generator.js`).
3. **Upload to Cloudinary** — both the watermarked thumbnail (as an
   image, for the gallery preview) and the `.docx` (as a raw file, for
   download) are uploaded.
4. **Save metadata to Firestore** — title, description, file name, both
   Cloudinary URLs, and the timestamp go into the `images` collection,
   which is what the public gallery reads from.

## 4. How access control works now

| Action | Requirement |
|---|---|
| Browse gallery (see thumbnails, titles, descriptions) | None — fully public |
| Click Download | Must be signed in (Google or email/password via `login.html`) |
| See/use the admin panel (`admin.html`) | Must be signed in as `mahagnan01@gmail.com` |

The admin check happens in two places, matching what you asked for:
- **UI**: `admin.html` only renders the upload/manage panel if
  `auth.currentUser.email === "mahagnan01@gmail.com"`.
- **Security rules**: `firestore.rules` also enforces this server-side,
  so the restriction holds even if someone bypasses the UI.

**On "Remove" in the admin panel**: it delists the file from the public
gallery (deletes the Firestore record) but doesn't delete the actual
file from Cloudinary, because real deletion needs a signed API request
(Cloudinary's `destroy` endpoint requires your API secret, which must
never sit in browser code). If you want true deletion, the clean way
is a small Firebase Cloud Function that holds the secret server-side —
happy to build that if you want it.

## 5. Google AdSense — how it actually works here

Being upfront about the realistic path, since this matters for whether
you'll actually see revenue:

**A. Eligibility first.** AdSense approval requires: a working site
with genuine original content, a **Privacy Policy** page (required —
Google checks for this), and enough content/traffic that it isn't
flagged as "insufficient content." A small personal file-sharing
gallery can qualify, but approval isn't guaranteed and can take days to
weeks. Google reviews the whole site, not just one page.

**B. Steps:**
1. Apply at [adsense.google.com](https://adsense.google.com) with your
   site's URL.
2. Add the verification snippet Google gives you into the `<head>` of
   every page (there's a comment marking the spot in each HTML file
   here) — this is how Google confirms you own the site.
3. Create an **`ads.txt`** file at your site's root (`ads.txt`, not
   inside `assets/`) with the one line Google's dashboard gives you
   (looks like `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`).
   This must be reachable at `https://yourdomain/ads.txt` — required
   for ads to actually serve, even after approval.
4. Wait for review/approval (check your AdSense dashboard).
5. Once approved, create an **ad unit** (Display ads, responsive size
   is easiest) and get its snippet — you'll get a `<script>` tag plus
   an `<ins class="adsbygoogle">` block.
6. Drop that `<ins>` block into the two placeholder slots already in
   `index.html` — search for `id="adSlotTop"` and `id="adSlotBottom"`.
   These sit below the header and at the page footer, away from the
   Download buttons, so ads can't be mistaken for site controls (a
   real AdSense policy risk — accidental clicks near real buttons can
   get an account suspended).

**C. A few things worth knowing:**
- Don't place ads inside/overlapping the gallery cards or right next
  to the Download button — that's the #1 way AdSense accounts get
  flagged for "invalid click activity."
- If you expect visitors from the EU/UK, you'll also need a basic
  cookie/consent banner (AdSense uses cookies for ad personalization)
  — Google's own **Funding Choices** tool can generate one for free.
- Revenue depends entirely on traffic volume; a low-traffic personal
  site typically earns very little at first. Worth doing for the
  long run, not a quick income source.

## 6. Hosting

Same as before — GitHub Pages:
1. Push this folder to a GitHub repo.
2. Repo → **Settings → Pages** → Source: `main` branch, `/ (root)` → Save.
3. Site goes live at `https://<username>.github.io/<repo>/`.
4. Back in Firebase: **Authentication → Settings → Authorized domains**
   → add that GitHub Pages domain (needed for Google sign-in there).

If you also mirror this to your ccbp.tech/Nextwave hosting, add that
domain too under Authorized domains — same as before.

---

## Feature ideas

**Fairly quick:**
- Search/filter bar for the gallery by title.
- Multi-file upload (batch through several images at once).
- Toast notifications instead of plain status text.
- Download counter per file.

**Medium effort:**
- Image compression before watermarking, for faster uploads on mobile data.
- Categories/tags with a filter chip row.
- "My downloads" page for signed-in users, showing what they've grabbed before.

**Bigger lifts:**
- A small Firebase Cloud Function for **real** Cloudinary deletion (holds the API secret safely, server-side).
- Multiple admin accounts via an `admins` Firestore collection instead of one hardcoded email.
- Usage analytics dashboard (most-downloaded files, daily active users).
- Rate-limiting downloads per user/day if traffic grows a lot.

Let me know which of these you'd like built next.
