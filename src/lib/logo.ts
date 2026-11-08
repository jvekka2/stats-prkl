/**
 * Team logos are stored as small PNG data URLs inside the team (on this device only),
 * so they work offline, in backups, and on the share image (no cross-origin canvas issues).
 */
const MAX = 256;

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Image could not be read'));
    img.src = src;
  });
}

/** Scale an image down to fit MAX x MAX and return a PNG data URL (transparency kept). */
async function normalize(src: string): Promise<string> {
  const img = await loadImg(src);
  const w = img.naturalWidth || MAX, h = img.naturalHeight || MAX;
  const k = Math.min(1, MAX / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k));
  c.height = Math.max(1, Math.round(h * k));
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

const blobToDataUrl = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result));
  r.onerror = () => rej(r.error);
  r.readAsDataURL(b);
});

export async function logoFromFile(file: File): Promise<string> {
  return normalize(await blobToDataUrl(file));
}

/**
 * Download a logo from a URL. Fails if the site doesn't allow cross-origin downloads (CORS);
 * the user can then save the image and upload the file instead.
 */
export async function logoFromUrl(url: string): Promise<string> {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  if (!blob.type.startsWith('image/')) throw new Error('Not an image');
  return normalize(await blobToDataUrl(blob));
}
