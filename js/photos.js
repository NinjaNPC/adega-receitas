// Fotos: redimensiona e comprime no próprio aparelho antes de guardar.
import * as db from './db.js';

const FULL_MAX = 1600;
const THUMB_MAX = 360;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida')); };
    img.src = url;
  });
}

function resize(img, max, quality) {
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  return c.toDataURL('image/jpeg', quality);
}

export async function savePhotoFile(file) {
  const img = await loadImage(file);
  const photo = {
    id: db.uid(),
    data: resize(img, FULL_MAX, 0.82),
    thumb: resize(img, THUMB_MAX, 0.7),
    createdAt: Date.now(),
  };
  await db.put('photos', photo);
  return photo;
}

const cache = new Map();

export async function getPhoto(id) {
  if (cache.has(id)) return cache.get(id);
  const p = await db.get('photos', id);
  if (p) cache.set(id, p);
  return p;
}

export function forgetPhoto(id) { cache.delete(id); }

// Remove fotos que não pertencem a nenhum registro (ex.: formulário cancelado).
export async function cleanOrphanPhotos() {
  const [drinks, recipes, logs, photos] = await Promise.all(['drinks', 'recipes', 'logs', 'photos'].map(db.getAll));
  const used = new Set();
  for (const r of [...drinks, ...recipes, ...logs]) for (const id of r.photos || []) used.add(id);
  const hourAgo = Date.now() - 3600_000;
  const orphans = photos.filter(p => !used.has(p.id) && (p.createdAt || 0) < hourAgo).map(p => p.id);
  if (orphans.length) await db.delMany('photos', orphans);
  return orphans.length;
}
