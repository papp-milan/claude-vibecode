const MAX_BYTES = 15 * 1024 * 1024;
const MAX_SIDE = 2400;
/** Nur diese Typen werden unverändert übernommen (alles andere wird zu PNG gerastert). */
const NATIVE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export interface LoadedImage {
  src: string;
  width: number;
  height: number;
}

export async function loadImageFile(file: File): Promise<LoadedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('keine Bilddatei');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('größer als 15 MB');
  }

  const dataUrl = await readAsDataUrl(file);
  const img = await decodeImage(dataUrl);
  const width = img.naturalWidth || 512;
  const height = img.naturalHeight || 512;

  const native = NATIVE_TYPES.includes(file.type);
  const tooBig = Math.max(width, height) > MAX_SIDE && file.type !== 'image/gif';
  if (native && !tooBig) {
    return { src: dataUrl, width, height };
  }

  const factor = tooBig ? MAX_SIDE / Math.max(width, height) : 1;
  const w = Math.max(1, Math.round(width * factor));
  const h = Math.max(1, Math.round(height * factor));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Bild konnte nicht verarbeitet werden');
  }
  ctx.drawImage(img, 0, 0, w, h);
  const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
  return { src: canvas.toDataURL(type, 0.92), width: w, height: h };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'));
    reader.readAsDataURL(file);
  });
}

function decodeImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Bild konnte nicht dekodiert werden'));
    img.src = src;
  });
}
