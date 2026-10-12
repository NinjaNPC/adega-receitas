// Camada de armazenamento local (IndexedDB). Tudo fica no aparelho.

const DB_NAME = 'adega-receitas';
const DB_VERSION = 1;
export const STORES = ['drinks', 'recipes', 'logs', 'photos', 'meta'];

let dbPromise;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const s of STORES) {
          if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function run(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result;
    const r = fn(s);
    if (r && 'onsuccess' in r) r.onsuccess = () => { result = r.result; };
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const getAll = store => run(store, 'readonly', s => s.getAll()).then(r => r || []);
export const get = (store, id) => run(store, 'readonly', s => s.get(id));
export const del = (store, id) => run(store, 'readwrite', s => s.delete(id));
export const clear = store => run(store, 'readwrite', s => s.clear());

export function put(store, obj) {
  return run(store, 'readwrite', s => s.put(obj)).then(() => obj);
}

export function putMany(store, items) {
  return run(store, 'readwrite', s => { for (const it of items) s.put(it); });
}

export function delMany(store, ids) {
  return run(store, 'readwrite', s => { for (const id of ids) s.delete(id); });
}

export function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export async function getMeta(key, fallback = null) {
  const r = await get('meta', key);
  return r ? r.value : fallback;
}

export const setMeta = (key, value) => put('meta', { id: key, value });
