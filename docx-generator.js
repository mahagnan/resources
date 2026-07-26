// ============================================================
// DOCX GENERATOR
// ------------------------------------------------------------
// Wraps one or more watermarked images (plus title/description)
// into a real .docx file, using the html-docx-js library loaded
// via CDN in admin.html. Each image after the first starts on a
// new page.
// ============================================================

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildDocxBlob({ title, description, images }) {
  const maxW = 600;

  const pagesHtml = images.map((img, idx) => {
    let displayW = img.imgWidth;
    let displayH = img.imgHeight;
    if (displayW > maxW) {
      const ratio = maxW / displayW;
      displayW = maxW;
      displayH = Math.round(img.imgHeight * ratio);
    }
    const breakStyle = idx > 0 ? "page-break-before: always;" : "";
    return `<div style="${breakStyle} margin-top: 12px;">
      <img src="${img.imageDataUrl}" width="${displayW}" height="${displayH}" />
    </div>`;
  }).join("");

  const html = `
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Calibri, Arial, sans-serif;">
        <h1 style="font-size: 22pt; margin-bottom: 4px;">${escapeHtml(title)}</h1>
        ${description ? `<p style="font-size: 11pt; color:#444; margin-top:0;">${escapeHtml(description)}</p>` : ""}
        ${pagesHtml}
      </body>
    </html>`;

  return window.htmlDocx.asBlob(html);
}