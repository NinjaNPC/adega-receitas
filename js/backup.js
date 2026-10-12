// Exportação / importação de todos os dados em um único arquivo .json
// (inclui as fotos), para levar de um aparelho para outro.
import * as db from './db.js';

const DATA_STORES = ['drinks', 'recipes', 'logs', 'photos'];
const APP_ID = 'adega-receitas';

export async function buildBackup({ includePhotos = true } = {}) {
  const out = { app: APP_ID, version: 1, exportedAt: new Date().toISOString() };
  for (const s of DATA_STORES) {
    out[s] = (s === 'photos' && !includePhotos) ? [] : await db.getAll(s);
  }
  return out;
}

export async function exportBackup(opts) {
  const data = await buildBackup(opts);
  const name = `adega-receitas-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });

  // Em celulares, a folha de compartilhamento permite salvar em Arquivos/Drive
  // ou enviar direto para outro aparelho.
  if (navigator.canShare && navigator.canShare({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ files: [file], title: name });
      await db.setMeta('lastBackup', Date.now());
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  await db.setMeta('lastBackup', Date.now());
  return 'downloaded';
}

function validItem(it) {
  return it && typeof it === 'object' && typeof it.id === 'string' && it.id.length < 100;
}

function validPhoto(p) {
  return validItem(p) && typeof p.data === 'string' && p.data.startsWith('data:image/')
    && (p.thumb == null || (typeof p.thumb === 'string' && p.thumb.startsWith('data:image/')));
}

// mode: 'merge' mantém o mais recente de cada registro; 'replace' apaga tudo antes.
export async function importBackup(file, mode = 'merge') {
  const text = await file.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Arquivo não é um JSON válido.'); }
  if (!data || data.app !== APP_ID) throw new Error('Este arquivo não é um backup do Adega & Receitas.');

  const counts = {};
  if (mode === 'replace') for (const s of DATA_STORES) await db.clear(s);

  for (const s of DATA_STORES) {
    const incoming = (Array.isArray(data[s]) ? data[s] : []).filter(s === 'photos' ? validPhoto : validItem);
    let toWrite = incoming;
    if (mode === 'merge') {
      const existing = new Map((await db.getAll(s)).map(x => [x.id, x]));
      toWrite = incoming.filter(it => {
        const cur = existing.get(it.id);
        if (!cur) return true;
        if (s === 'photos') return false;
        return (it.updatedAt || 0) > (cur.updatedAt || 0);
      });
    }
    if (toWrite.length) await db.putMany(s, toWrite);
    counts[s] = toWrite.length;
  }
  return counts;
}
