// ============================================================
// CLOUDINARY CONFIG
// ------------------------------------------------------------
// Cloudinary stores the actual files (the generated .docx files
// and their watermarked thumbnail images). It has a generous free
// tier and — unlike Firebase Storage — doesn't require a billing
// account to use.
//
// Fill these in after you create your free Cloudinary account and
// an UNSIGNED upload preset. See README.md, section "Cloudinary
// setup", for the exact steps.
// ============================================================

const CLOUDINARY_CLOUD_NAME = "vnpinxun";        // e.g. "dxyzabc12"
const CLOUDINARY_UPLOAD_PRESET = "Resources";     // the unsigned preset name you create

// Uploads a Blob/File to Cloudinary and returns the secure_url.
// resourceType: "image" for the watermarked thumbnail, "raw" for the .docx file.
async function uploadToCloudinary(blob, filename, resourceType) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
  const formData = new FormData();
  formData.append("file", blob, filename);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(url, { method: "POST", body: formData });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `Cloudinary upload failed (${res.status})`);
  }
  const data = await res.json();
  return data.secure_url;
}
