// ============================================================
// WATERMARK
// ------------------------------------------------------------
// Takes a selected image file and returns a watermarked version:
// the "MahaGnan" mark repeated 3 times, rotated, and blended
// across the image. This runs entirely in the browser before
// anything is uploaded.
//
// NOTE: this stamps a text mark by default. If you have an actual
// logo image (a transparent PNG works best), see the
// WATERMARK_LOGO_URL option below to stamp that instead of text —
// just set it to the logo's path/URL and it'll be used automatically.
// ============================================================

const WATERMARK_TEXT = "MahaGnan";
const WATERMARK_LOGO_URL = "https://res.cloudinary.com/vnpinxun/image/upload/v1785082241/ChatGPT_Image_Jul_26_2026_09_40_24_PM_tefuxo.png";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load image."));
    img.src = src;
  });
}

async function watermarkImage(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Couldn't read the file."));
    reader.readAsDataURL(file);
  });

  const img = await loadImage(dataUrl);
  let w = img.naturalWidth;
  let h = img.naturalHeight;

  // Shrink large photos so the final file stays well under Cloudinary's
  // 10MB limit, even with multiple images in one doc.
  const MAX_DIMENSION = 1600;
  if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  // base image
  ctx.drawImage(img, 0, 0, w, h);

  // watermark positions — spread diagonally across the frame
  const positions = [
    { x: w * 0.22, y: h * 0.22 },
    { x: w * 0.5, y: h * 0.5 },
    { x: w * 0.78, y: h * 0.78 }
  ];
  const angle = -28 * (Math.PI / 180);
  const fontSize = Math.max(18, Math.round(w * 0.14));

  ctx.save();
  ctx.globalCompositeOperation = "overlay"; // blends into the image rather than sitting flatly on top
  ctx.globalAlpha = 0.5;

  if (WATERMARK_LOGO_URL) {
    const logo = await loadImage(WATERMARK_LOGO_URL).catch(() => null);
    if (logo) {
      const logoW = w * 0.45;
      const logoH = logoW * (logo.naturalHeight / logo.naturalWidth);
      positions.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);
        ctx.drawImage(logo, -logoW / 2, -logoH / 2, logoW, logoH);
        ctx.restore();
      });
    }
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${fontSize}px Inter, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    positions.forEach((p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      ctx.fillText(WATERMARK_TEXT, 0, 0);
      ctx.restore();
    });
  }
  ctx.restore();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  const finalDataUrl = canvas.toDataURL("image/jpeg", 0.92);

  return { blob, dataUrl: finalDataUrl, width: w, height: h };
}
