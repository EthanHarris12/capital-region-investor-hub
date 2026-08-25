// ============================================
// PROPERTY PHOTOS
// Photos are downscaled and re-encoded in the browser before storage —
// a phone photo is 3-5 MB, far past what localStorage will hold, and the
// stage never displays more than ~1440px anyway.
// ============================================

export const PHOTOS_KEY = "crih_studio_photos";

const MAX_EDGE = 1440;
const START_QUALITY = 0.82;
const MIN_QUALITY = 0.45;
const MAX_BYTES = 1400000; // ~1.4 MB per photo, before base64 overhead

export function dealPhotoKey(deal, index) {
  if (deal && deal.id) return String(deal.id);
  return "idx-" + index;
}

async function decode(file) {
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(file); } catch (e) { /* fall through */ }
  }
  return await new Promise(function (resolve, reject) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("decode-failed")); };
    img.src = url;
  });
}

// Returns a JPEG data URL sized for the stage, or throws with a message
// worth showing the user.
export async function compressToDataUrl(file) {
  if (!file || !/^image\//.test(file.type || "")) {
    throw new Error("That file isn’t an image.");
  }

  let bitmap;
  try {
    bitmap = await decode(file);
  } catch (e) {
    throw new Error(
      /heic|heif/i.test(file.type || file.name || "")
        ? "This browser can’t read HEIC photos. On your iPhone, share the photo as JPEG, or open it in Preview and export as JPEG."
        : "That image couldn’t be read. Try a JPEG or PNG."
    );
  }

  var w = bitmap.width, h = bitmap.height;
  if (!w || !h) throw new Error("That image appears to be empty.");

  var scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  var cw = Math.max(1, Math.round(w * scale));
  var ch = Math.max(1, Math.round(h * scale));

  var canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  var ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser blocked image processing.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, cw, ch);
  if (bitmap.close) bitmap.close();

  var quality = START_QUALITY;
  var out = canvas.toDataURL("image/jpeg", quality);
  while (out.length > MAX_BYTES && quality > MIN_QUALITY) {
    quality -= 0.12;
    out = canvas.toDataURL("image/jpeg", quality);
  }
  if (out.length > MAX_BYTES) {
    throw new Error("That photo is too large even after compression. Try cropping it first.");
  }
  return out;
}

export function isQuotaError(e) {
  if (!e) return false;
  return e.name === "QuotaExceededError" ||
         e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
         /quota/i.test(e.message || "");
}
