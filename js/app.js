import * as db from './db.js';
import {
  DRINK_TYPES, typeById, COMMON_LABELS, COUNTRY_SUGGESTIONS,
  RECIPE_CATEGORIES, DIFFICULTIES, UTENSILS, SIDE_SUGGESTIONS,
} from './schemas.js';
import { savePhotoFile, getPhoto, forgetPhoto, cleanOrphanPhotos } from './photos.js';
import { exportBackup, importBackup } from './backup.js';
import { parseRecipeText, scaleLine, isSectionLine, sectionTitle, formatNum } from './recipe-text.js';

// ================= Utilidades =================

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const isNum = v => typeof v === 'number' && isFinite(v);

const viewEl = $('#view');

function today() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
const fmtDate = s => (s ? new Date(s + 'T12:00').toLocaleDateString('pt-BR') : '');
const fmtMoney = n => (isNum(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '');
const fmtRating = v => (isNum(v) && v > 0 ? v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—');
const fmtNum = n => (isNum(n) ? n.toLocaleString('pt-BR', { useGrouping: Math.abs(n) >= 10000 }) : '');
const fmtMinutes = m => {
  if (!isNum(m) || m <= 0) return '';
  const h = Math.floor(m / 60), r = Math.round(m % 60);
  return h ? `${h} h${r ? ` ${r} min` : ''}` : `${r} min`;
};

function avg(arr) {
  const v = arr.filter(x => isNum(x) && x > 0);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2800);
}

const go = hash => { location.hash = hash; };

function setHeader(title, back = '') {
  $('#title').textContent = title;
  const b = $('#back');
  b.hidden = !back;
  b.dataset.target = back;
  document.title = `${title} · Adega & Receitas`;
}

function paint(html) {
  viewEl.innerHTML = html;
  hydratePhotos(viewEl);
}

async function hydratePhotos(root) {
  for (const img of $$('img[data-photo]', root)) {
    if (img.src) continue;
    const p = await getPhoto(img.dataset.photo);
    if (p) img.src = img.hasAttribute('data-full') ? p.data : (p.thumb || p.data);
    else img.closest('.ph, .gal-item, .log-ph')?.remove();
  }
}

async function deletePhotosIfUnused(ids) {
  if (!ids?.length) return;
  const [drinks, recipes, logs] = await Promise.all(['drinks', 'recipes', 'logs'].map(db.getAll));
  const used = new Set();
  for (const r of [...drinks, ...recipes, ...logs]) for (const id of r.photos || []) used.add(id);
  const gone = ids.filter(id => !used.has(id));
  gone.forEach(forgetPhoto);
  if (gone.length) await db.delMany('photos', gone);
}

// ================= Componentes =================

const stars = (v, cls = '') =>
  `<span class="stars ${cls}" style="--v:${isNum(v) ? v : 0}" role="img" aria-label="${fmtRating(v)} de 5">★★★★★</span>`;

const field = (label, inner, cls = '') => `<label class="field ${cls}"><span>${esc(label)}</span>${inner}</label>`;
const textInput = (name, v, attrs = '') => `<input name="${name}" value="${esc(v)}" ${attrs}>`;
const numInput = (name, v, attrs = '') => `<input name="${name}" inputmode="decimal" data-num value="${esc(v ?? '')}" ${attrs}>`;

function selectInput(name, options, v) {
  const opts = !v || options.includes(v) ? options : [...options, v];
  return `<select name="${name}"><option value="">—</option>${opts.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
}

let dlCounter = 0;
function comboInput(name, options, v, attrs = '') {
  const id = 'dl' + (++dlCounter);
  return `<input name="${name}" list="${id}" value="${esc(v)}" autocomplete="off" ${attrs}><datalist id="${id}">${options.map(o => `<option value="${esc(o)}">`).join('')}</datalist>`;
}

function segInput(name, options, v) {
  return `<div class="seg">${options.map(o => `<label><input type="radio" name="${name}" value="${esc(o)}" ${o === v ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div>`;
}

const tagChip = v => `<span class="tag" data-v="${esc(v)}">${esc(v)}<button type="button" data-tag-del aria-label="Remover ${esc(v)}">×</button></span>`;

function tagInput(name, values, suggestions = [], placeholder = 'Digite e toque em +') {
  return `<div class="tags" data-tags="${name}" data-sugg="${esc(JSON.stringify(suggestions))}">
    <div class="tag-list">${(values || []).map(tagChip).join('')}</div>
    <div class="tag-entry"><input type="text" placeholder="${esc(placeholder)}" enterkeyhint="done" data-tag-input autocomplete="off"><button type="button" class="btn small" data-tag-add aria-label="Adicionar">+</button></div>
    <div class="tag-sugg"></div>
  </div>`;
}

const tagValues = box => $$('.tag', box).map(t => t.dataset.v);

function refreshSugg(box) {
  const sugg = JSON.parse(box.dataset.sugg || '[]');
  const have = new Set(tagValues(box).map(norm));
  const q = norm($('[data-tag-input]', box).value);
  const list = sugg.filter(s => !have.has(norm(s)) && (!q || norm(s).includes(q))).slice(0, 10);
  $('.tag-sugg', box).innerHTML = list.map(s => `<button type="button" class="chip sugg" data-sugg-add="${esc(s)}">+ ${esc(s)}</button>`).join('');
}

function appendTag(box, value) {
  value = String(value).trim();
  if (!value || tagValues(box).some(v => norm(v) === norm(value))) return;
  $('.tag-list', box).insertAdjacentHTML('beforeend', tagChip(value));
}

function addTagFromInput(box) {
  const inp = $('[data-tag-input]', box);
  inp.value.split(/[,;]/).forEach(v => appendTag(box, v));
  inp.value = '';
  refreshSugg(box);
}

function chipsInput(name, options, selected = []) {
  const sel = new Set(selected);
  const all = [...options, ...selected.filter(s => !options.includes(s))];
  return `<div class="chips" data-chips="${name}">
    ${all.map(o => `<button type="button" class="chip ${sel.has(o) ? 'on' : ''}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}
    <span class="chip-add"><input placeholder="outro…" data-chip-new enterkeyhint="done"><button type="button" data-chip-add aria-label="Adicionar">+</button></span>
  </div>`;
}

function addCustomChip(box) {
  const inp = $('[data-chip-new]', box);
  const v = inp.value.trim();
  inp.value = '';
  if (!v) return;
  const existing = $$('.chip', box).find(c => norm(c.dataset.v) === norm(v));
  if (existing) { existing.classList.add('on'); return; }
  $('.chip-add', box).insertAdjacentHTML('beforebegin', `<button type="button" class="chip on" data-v="${esc(v)}">${esc(v)}</button>`);
}

function ratingInput(name, v) {
  return `<div class="rating-input" data-rating>
    <div class="rstars">${[1, 2, 3, 4, 5].map(i => `<button type="button" class="rstar" data-star="${i}" aria-label="${i} estrelas">★</button>`).join('')}</div>
    <output></output>
    <button type="button" class="link" data-rating-clear>limpar</button>
    <input type="hidden" name="${name}" data-num value="${isNum(v) && v > 0 ? v : ''}">
  </div>`;
}

function setRating(box, v) {
  $('input', box).value = v || '';
  $$('[data-star]', box).forEach(b => {
    const i = Number(b.dataset.star);
    b.className = 'rstar' + (v >= i ? ' full' : v >= i - 0.5 ? ' half' : '');
  });
  $('output', box).textContent = v ? `${fmtRating(v)} / 5` : 'sem nota (toque 2× para meia estrela)';
}

function sensoryInput(axis, v) {
  const val = isNum(v) ? v : 0;
  return `<div class="sense">
    <div class="sense-head"><span>${esc(axis.label)}</span><output>${val || '—'}</output></div>
    <input type="range" min="0" max="5" step="1" name="sensory.${axis.k}" data-num value="${val}">
    <div class="sense-ends"><span>${esc(axis.low)}</span><span>${esc(axis.high)}</span></div>
  </div>`;
}

function photoPicker(name, ids = []) {
  return `<div class="photos-edit" data-photos="${name}">
    <div class="ph-grid">
      ${ids.map(id => `<div class="ph" data-id="${esc(id)}"><img data-photo="${esc(id)}" alt=""><button type="button" data-ph-del aria-label="Remover foto">×</button></div>`).join('')}
      <label class="ph add"><input type="file" accept="image/*" multiple hidden data-ph-input><span>📷<br>Adicionar</span></label>
    </div>
  </div>`;
}

function gallery(ids) {
  if (!ids?.length) return '';
  return `<div class="gallery">${ids.map(id => `<div class="gal-item"><img data-photo="${esc(id)}" data-full data-zoom alt=""></div>`).join('')}</div>`;
}

// Liga o comportamento de todos os widgets de um formulário
function bindForm(form) {
  form.addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t || !form.contains(t)) return;
    if (t.matches('[data-chips] .chip')) t.classList.toggle('on');
    else if (t.matches('[data-chip-add]')) addCustomChip(t.closest('[data-chips]'));
    else if (t.matches('[data-tag-add]')) addTagFromInput(t.closest('[data-tags]'));
    else if (t.matches('[data-tag-del]')) { const box = t.closest('[data-tags]'); t.closest('.tag').remove(); refreshSugg(box); }
    else if (t.matches('[data-sugg-add]')) { const box = t.closest('[data-tags]'); appendTag(box, t.dataset.suggAdd); refreshSugg(box); }
    else if (t.matches('[data-ph-del]')) t.closest('.ph').remove();
    else if (t.matches('[data-star]')) {
      const box = t.closest('[data-rating]');
      const i = Number(t.dataset.star);
      const cur = Number($('input', box).value) || 0;
      setRating(box, cur === i ? i - 0.5 : i);
    } else if (t.matches('[data-rating-clear]')) setRating(t.closest('[data-rating]'), 0);
  });
  form.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    if (e.target.matches('[data-tag-input]')) { e.preventDefault(); addTagFromInput(e.target.closest('[data-tags]')); }
    if (e.target.matches('[data-chip-new]')) { e.preventDefault(); addCustomChip(e.target.closest('[data-chips]')); }
  });
  form.addEventListener('input', e => {
    if (e.target.matches('[data-tag-input]')) refreshSugg(e.target.closest('[data-tags]'));
    if (e.target.type === 'range') $('output', e.target.closest('.sense')).textContent = e.target.value === '0' ? '—' : e.target.value;
  });
  form.addEventListener('change', async e => {
    if (!e.target.matches('[data-ph-input]')) return;
    const grid = $('.ph-grid', e.target.closest('[data-photos]'));
    const addBtn = e.target.closest('.ph.add');
    const files = [...e.target.files];
    e.target.value = '';
    for (const f of files) {
      try {
        const p = await savePhotoFile(f);
        addBtn.insertAdjacentHTML('beforebegin', `<div class="ph" data-id="${p.id}"><img src="${p.thumb}" alt=""><button type="button" data-ph-del aria-label="Remover foto">×</button></div>`);
      } catch {
        toast('Não foi possível ler uma das imagens');
      }
    }
  });
  $$('[data-rating]', form).forEach(box => setRating(box, Number($('input', box).value) || 0));
  $$('[data-tags]', form).forEach(refreshSugg);
  form.addEventListener('click', e => { if (e.target.closest('[data-cancel]')) history.back(); });
}

function collectForm(form) {
  const out = {};
  const set = (path, val) => {
    const ks = path.split('.');
    let o = out;
    for (const k of ks.slice(0, -1)) o = o[k] ??= {};
    o[ks[ks.length - 1]] = val;
  };
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'radio') { if (el.checked) set(el.name, el.value); else if (!(el.name in out)) set(el.name, ''); continue; }
    if (el.type === 'checkbox') { set(el.name, el.checked); continue; }
    if (el.hasAttribute('data-num')) {
      const raw = el.value.trim().replace(',', '.');
      const n = Number(raw);
      set(el.name, raw === '' || !isFinite(n) ? '' : n);
      continue;
    }
    set(el.name, el.value.trim());
  }
  $$('[data-chips]', form).forEach(b => set(b.dataset.chips, $$('.chip.on', b).map(c => c.dataset.v)));
  $$('[data-tags]', form).forEach(b => {
    const pending = $('[data-tag-input]', b).value.trim();
    if (pending) addTagFromInput(b);
    set(b.dataset.tags, tagValues(b));
  });
  $$('[data-photos]', form).forEach(b => set(b.dataset.photos, $$('.ph[data-id]', b).map(p => p.dataset.id)));
  return out;
}

async function backupBanner() {
  const [last, n] = await Promise.all([db.getMeta('lastBackup', 0), db.getAll('drinks').then(a => a.length)]);
  const days = (Date.now() - last) / 86400000;
  if (n < 5 || days < 30) return '';
  return `<a class="banner" href="#/more">💾 ${last ? `Último backup há ${Math.floor(days)} dias.` : 'Você ainda não fez backup.'} Toque para exportar seus dados.</a>`;
}

// ================= Bebidas =================

const ui = {
  drinks: { type: '', q: '', sort: 'recent', fav: false },
  recipes: { cat: '', q: '', sort: 'recent', fav: false },
};

function newDrink(type) {
  return {
    id: db.uid(), type, name: '', produtor: '', pais: '', regiao: '', abv: '', volume: '', price: '',
    place: '', date: today(), occasion: '', spec: {}, sensory: {}, aromas: [], rating: 0, buyAgain: '',
    notes: '', pairing: '', photos: [], favorite: false, createdAt: Date.now(), updatedAt: Date.now(),
  };
}

function drinkSubtitle(d) {
  const t = typeById(d.type);
  const main = t.fields[0] ? d.spec?.[t.fields[0].k] : '';
  return [Array.isArray(main) ? main.join(', ') : main, d.produtor, d.spec?.safra].filter(Boolean).join(' · ');
}

function drinkItem(d) {
  const t = typeById(d.type);
  const thumb = d.photos?.[0]
    ? `<img class="thumb" data-photo="${esc(d.photos[0])}" alt="">`
    : `<div class="thumb empty" style="--c:${t.color}">${t.icon}</div>`;
  return `<a class="item" href="#/drinks/${esc(d.id)}">${thumb}
    <div class="item-body">
      <div class="item-title">${d.favorite ? '<span class="fav">♥</span> ' : ''}${esc(d.name)}</div>
      <div class="item-sub">${t.icon} ${esc(drinkSubtitle(d) || t.label)}</div>
      <div class="item-meta">${stars(d.rating)}<span>${fmtDate(d.date)}</span></div>
    </div></a>`;
}

function searchText(d) {
  const spec = Object.values(d.spec || {}).flat().join(' ');
  return norm([d.name, d.produtor, d.pais, d.regiao, d.place, d.occasion, d.notes, d.pairing, spec, (d.aromas || []).join(' ')].join(' '));
}

async function drinkList() {
  setHeader('Bebidas');
  const all = await db.getAll('drinks');
  const st = ui.drinks;
  const counts = Object.fromEntries(DRINK_TYPES.map(t => [t.id, all.filter(d => d.type === t.id).length]));
  const typesUsed = DRINK_TYPES.filter(t => counts[t.id]);

  paint(`${await backupBanner()}
    <div class="toolbar">
      <input type="search" id="q" placeholder="Buscar por nome, produtor, uva, aroma…" value="${esc(st.q)}">
      <select id="sort" aria-label="Ordenar">
        <option value="recent">Mais recentes</option><option value="rating">Melhor nota</option><option value="name">Nome</option>
      </select>
    </div>
    ${all.length ? `<div class="filter-chips">
      <button class="chip ${!st.type ? 'on' : ''}" data-type="">Todas (${all.length})</button>
      ${typesUsed.map(t => `<button class="chip ${st.type === t.id ? 'on' : ''}" data-type="${t.id}">${t.icon} ${t.label} (${counts[t.id]})</button>`).join('')}
      <button class="chip ${st.fav ? 'on' : ''}" data-fav>♥ Favoritas</button>
    </div>` : ''}
    <div id="list" class="list"></div>
    <a class="fab" href="#/drinks/new" aria-label="Registrar bebida">＋</a>`);

  $('#sort').value = st.sort;
  const renderItems = () => {
    const q = norm(st.q);
    let items = all.filter(d => (!st.type || d.type === st.type) && (!st.fav || d.favorite) && (!q || searchText(d).includes(q)));
    if (st.sort === 'rating') items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (st.sort === 'name') items.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    else items.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt);
    $('#list').innerHTML = items.length ? items.map(drinkItem).join('')
      : all.length ? '<div class="empty">Nada encontrado com esses filtros.</div>'
        : `<div class="empty"><div class="empty-icon">🍷🍺🥃</div><p>Nenhuma bebida registrada ainda.</p><a class="btn primary" href="#/drinks/new">Registrar a primeira</a></div>`;
    hydratePhotos($('#list'));
  };
  renderItems();
  $('#q').addEventListener('input', e => { st.q = e.target.value; renderItems(); });
  $('#sort').addEventListener('change', e => { st.sort = e.target.value; renderItems(); });
  viewEl.querySelector('.filter-chips')?.addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    if (b.hasAttribute('data-fav')) st.fav = !st.fav;
    else st.type = b.dataset.type;
    $$('.filter-chips .chip').forEach(c => c.classList.toggle('on', c.hasAttribute('data-fav') ? st.fav : c.dataset.type === st.type));
    renderItems();
  });
}

function drinkTypePicker() {
  setHeader('Nova bebida', '#/drinks');
  paint(`<p class="hint center">Que tipo de bebida você está provando?</p>
    <div class="type-grid">${DRINK_TYPES.map(t => `<a class="type-card" style="--c:${t.color}" href="#/drinks/new/${t.id}"><span class="type-icon">${t.icon}</span>${t.label}</a>`).join('')}</div>`);
}

async function drinkForm(id, typeId, again = false) {
  let d;
  if (id) {
    d = await db.get('drinks', id);
    if (!d) return notFound();
    if (again) {
      d = {
        ...structuredClone(d), id: db.uid(), date: today(), rating: 0, sensory: {}, aromas: [], notes: '',
        buyAgain: '', occasion: '', favorite: false, createdAt: Date.now(), updatedAt: Date.now(),
      };
    }
  } else {
    d = newDrink(typeId);
  }
  const t = typeById(d.type);
  const isNew = !id || again;
  setHeader(again ? 'Provar de novo' : isNew ? `Novo: ${t.label}` : 'Editar bebida', id ? `#/drinks/${id}` : '#/drinks/new');

  paint(`<form class="form" id="f" novalidate>
    <section class="card"><h3>Fotos</h3><p class="hint">Rótulo, garrafa, taça, momento…</p>${photoPicker('photos', d.photos)}</section>

    <section class="card"><h3>Identificação</h3>
      ${field('Nome *', textInput('name', d.name, 'required autocomplete="off"'), 'full')}
      <div class="grid2">
        ${field(t.producer, textInput('produtor', d.produtor))}
        ${field('País', comboInput('pais', COUNTRY_SUGGESTIONS, d.pais))}
        ${field('Região', textInput('regiao', d.regiao))}
        ${t.alcoholic ? field('Teor alcoólico (%)', numInput('abv', d.abv)) : ''}
        ${field('Volume (ml)', numInput('volume', d.volume))}
        ${field('Preço (R$)', numInput('price', d.price))}
        ${field('Data da prova', `<input type="date" name="date" value="${esc(d.date)}">`)}
        ${field('Onde comprou / provou', textInput('place', d.place))}
      </div>
      ${field('Ocasião / companhia', textInput('occasion', d.occasion), 'full')}
    </section>

    <section class="card"><h3>${t.icon} Detalhes – ${esc(t.label)}</h3>
      <div class="grid2">${t.fields.map(f => specField(f, d.spec?.[f.k])).join('')}</div>
    </section>

    <section class="card"><h3>Perfil sensorial</h3><p class="hint">Deixe em 0 o que não quiser avaliar.</p>
      <div class="senses">${t.sensory.map(a => sensoryInput(a, d.sensory?.[a.k])).join('')}</div>
    </section>

    <section class="card"><h3>Aromas e sabores</h3>${chipsInput('aromas', t.aromas, d.aromas || [])}</section>

    <section class="card"><h3>Avaliação</h3>
      <div class="field full"><span>Nota geral</span>${ratingInput('rating', d.rating)}</div>
      <div class="field full"><span>Compraria de novo?</span>${segInput('buyAgain', ['Sim', 'Talvez', 'Não'], d.buyAgain)}</div>
      ${field('Comentários / notas de prova', `<textarea name="notes" rows="4">${esc(d.notes)}</textarea>`, 'full')}
      ${field('Harmonização (com o que combinou)', textInput('pairing', d.pairing), 'full')}
      <label class="check"><input type="checkbox" name="favorite" ${d.favorite ? 'checked' : ''}> ♥ Favorita</label>
    </section>

    <div class="form-actions"><button type="button" class="btn ghost" data-cancel>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div>
  </form>`);

  const form = $('#f');
  bindForm(form);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = collectForm(form);
    if (!data.name) { toast('Informe o nome da bebida'); form.elements.namedItem('name').focus(); return; }
    const saved = { ...d, ...data, spec: data.spec || {}, sensory: data.sensory || {}, rating: data.rating || 0, updatedAt: Date.now() };
    await db.put('drinks', saved);
    if (!isNew) await deletePhotosIfUnused((d.photos || []).filter(p => !saved.photos.includes(p)));
    toast('Bebida salva');
    location.replace(`#/drinks/${saved.id}`);
  });
}

function specField(f, v) {
  const name = 'spec.' + f.k;
  if (f.type === 'tags') return `<div class="field full"><span>${esc(f.label)}</span>${tagInput(name, v || [], f.suggestions)}</div>`;
  const ph = f.placeholder ? `placeholder="${esc(f.placeholder)}"` : '';
  const inner = f.type === 'number' ? numInput(name, v, ph)
    : f.type === 'select' ? selectInput(name, f.options, v)
      : f.type === 'combo' ? comboInput(name, f.options, v, ph)
        : textInput(name, v, ph);
  return field(f.label, inner);
}

function factsList(rows) {
  const r = rows.filter(([, v]) => v !== '' && v != null && !(Array.isArray(v) && !v.length));
  if (!r.length) return '';
  return `<dl class="facts">${r.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(Array.isArray(v) ? v.join(', ') : v)}</dd></div>`).join('')}</dl>`;
}

function sensoryBars(t, sensory) {
  const rows = t.sensory.filter(a => sensory?.[a.k] > 0);
  if (!rows.length) return '';
  return `<div class="sbars">${rows.map(a => `<div class="sbar">
      <div class="sbar-head"><span>${esc(a.label)}</span><b>${sensory[a.k]}/5</b></div>
      <div class="bar"><i style="width:${sensory[a.k] * 20}%"></i></div>
      <div class="sense-ends"><span>${esc(a.low)}</span><span>${esc(a.high)}</span></div></div>`).join('')}</div>`;
}

async function drinkDetail(id) {
  const d = await db.get('drinks', id);
  if (!d) return notFound();
  const t = typeById(d.type);
  setHeader(t.label, '#/drinks');
  const [logs, recipes] = await Promise.all([db.getAll('logs'), db.getAll('recipes')]);
  const recipeById = new Map(recipes.map(r => [r.id, r]));
  const pairings = logs.filter(l => (l.drinks || []).includes(id)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const loc = [d.regiao, d.pais].filter(Boolean).join(', ');
  const specRows = t.fields.map(f => [f.label, f.type === 'number' ? fmtNum(d.spec?.[f.k]) : d.spec?.[f.k]]);

  paint(`${gallery(d.photos)}
    <div class="detail-head">
      <span class="badge" style="--c:${t.color}">${t.icon} ${t.label}</span>
      <h2>${d.favorite ? '<span class="fav">♥</span> ' : ''}${esc(d.name)}</h2>
      ${d.produtor || loc ? `<p class="muted">${esc([d.produtor, loc].filter(Boolean).join(' · '))}</p>` : ''}
      <div class="rating-line">${stars(d.rating, 'big')} <b>${fmtRating(d.rating)}</b>${d.buyAgain ? `<span class="pill">Compraria de novo: ${esc(d.buyAgain)}</span>` : ''}</div>
    </div>

    <section class="card"><h3>Ficha</h3>${factsList([
      ...specRows,
      ['Teor alcoólico', isNum(d.abv) ? `${fmtNum(d.abv)}%` : ''],
      ['Volume', isNum(d.volume) ? `${fmtNum(d.volume)} ml` : ''],
      ['Preço', fmtMoney(d.price)],
      ['Data da prova', fmtDate(d.date)],
      ['Onde', d.place],
      ['Ocasião', d.occasion],
    ]) || '<p class="muted">Sem detalhes preenchidos.</p>'}</section>

    ${sensoryBars(t, d.sensory) ? `<section class="card"><h3>Perfil sensorial</h3>${sensoryBars(t, d.sensory)}</section>` : ''}
    ${d.aromas?.length ? `<section class="card"><h3>Aromas e sabores</h3><div class="chips ro">${d.aromas.map(a => `<span class="chip on">${esc(a)}</span>`).join('')}</div></section>` : ''}
    ${d.notes ? `<section class="card"><h3>Notas de prova</h3><p class="pre">${esc(d.notes)}</p></section>` : ''}
    ${d.pairing ? `<section class="card"><h3>Harmonização</h3><p class="pre">${esc(d.pairing)}</p></section>` : ''}
    ${pairings.length ? `<section class="card"><h3>Acompanhou receitas</h3><div class="mini-list">${pairings.map(l => {
      const r = recipeById.get(l.recipeId);
      return r ? `<a href="#/recipes/${esc(r.id)}">🍳 ${esc(r.title)} <span class="muted">· ${fmtDate(l.date)}</span></a>` : '';
    }).join('')}</div></section>` : ''}

    <div class="actions">
      <a class="btn" href="#/drinks/${esc(id)}/edit">✏️ Editar</a>
      <a class="btn" href="#/drinks/${esc(id)}/again">🔁 Provar de novo</a>
      <button class="btn danger" id="del">🗑 Excluir</button>
    </div>`);

  $('#del').onclick = async () => {
    if (!confirm(`Excluir "${d.name}"? Essa ação não pode ser desfeita.`)) return;
    await db.del('drinks', id);
    const touched = logs.filter(l => (l.drinks || []).includes(id)).map(l => ({ ...l, drinks: l.drinks.filter(x => x !== id), updatedAt: Date.now() }));
    if (touched.length) await db.putMany('logs', touched);
    await deletePhotosIfUnused(d.photos);
    toast('Bebida excluída');
    location.replace('#/drinks');
  };
}

// ================= Receitas =================

let pendingDraft = null;

function newRecipe() {
  return {
    id: db.uid(), title: '', category: '', cuisine: '', servings: '', prepTime: '', totalTime: '', difficulty: '',
    ingredients: '', steps: '', utensils: [], pairing: '', source: '', tags: [], notes: '', photos: [],
    favorite: false, createdAt: Date.now(), updatedAt: Date.now(),
  };
}

function recipeStats(recipe, logs) {
  const mine = logs.filter(l => l.recipeId === recipe.id);
  const last = mine.map(l => l.date).sort().pop();
  return { count: mine.length, avg: avg(mine.map(l => l.rating)), last };
}

async function recipeList() {
  setHeader('Receitas');
  const [all, logs] = await Promise.all([db.getAll('recipes'), db.getAll('logs')]);
  const st = ui.recipes;
  const stats = new Map(all.map(r => [r.id, recipeStats(r, logs)]));
  const cats = RECIPE_CATEGORIES.filter(c => all.some(r => r.category === c));

  paint(`<div class="toolbar">
      <input type="search" id="q" placeholder="Buscar por nome, ingrediente, tag…" value="${esc(st.q)}">
      <select id="sort" aria-label="Ordenar">
        <option value="recent">Recentes</option><option value="cooked">Mais feitas</option><option value="rating">Melhor nota</option><option value="name">Nome</option>
      </select>
    </div>
    <div class="filter-chips">
      <a class="chip accent" href="#/recipes/import">📥 Importar de texto / Instagram</a>
      ${all.length ? `<button class="chip ${!st.cat ? 'on' : ''}" data-cat="">Todas (${all.length})</button>` : ''}
      ${cats.map(c => `<button class="chip ${st.cat === c ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
      ${all.length ? `<button class="chip ${st.fav ? 'on' : ''}" data-fav>♥ Favoritas</button>` : ''}
    </div>
    <div id="list" class="list"></div>
    <a class="fab" href="#/recipes/new" aria-label="Nova receita">＋</a>`);

  $('#sort').value = st.sort;
  const renderItems = () => {
    const q = norm(st.q);
    let items = all.filter(r => (!st.cat || r.category === st.cat) && (!st.fav || r.favorite)
      && (!q || norm([r.title, r.ingredients, r.cuisine, r.category, (r.tags || []).join(' ')].join(' ')).includes(q)));
    if (st.sort === 'cooked') items.sort((a, b) => stats.get(b.id).count - stats.get(a.id).count);
    else if (st.sort === 'rating') items.sort((a, b) => (stats.get(b.id).avg || 0) - (stats.get(a.id).avg || 0));
    else if (st.sort === 'name') items.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
    else items.sort((a, b) => b.updatedAt - a.updatedAt);
    $('#list').innerHTML = items.length ? items.map(r => {
      const s = stats.get(r.id);
      const thumb = r.photos?.[0] ? `<img class="thumb" data-photo="${esc(r.photos[0])}" alt="">` : '<div class="thumb empty" style="--c:#c0622b">🍳</div>';
      return `<a class="item" href="#/recipes/${esc(r.id)}">${thumb}<div class="item-body">
        <div class="item-title">${r.favorite ? '<span class="fav">♥</span> ' : ''}${esc(r.title)}</div>
        <div class="item-sub">${esc([r.category, fmtMinutes(r.totalTime), r.difficulty].filter(Boolean).join(' · '))}</div>
        <div class="item-meta">${s.count ? `${stars(s.avg)}<span>feita ${s.count}×</span>` : '<span class="muted">ainda não feita</span>'}</div>
      </div></a>`;
    }).join('')
      : all.length ? '<div class="empty">Nada encontrado com esses filtros.</div>'
        : `<div class="empty"><div class="empty-icon">📖</div><p>Seu livro de receitas está vazio.</p><a class="btn primary" href="#/recipes/new">Criar receita</a></div>`;
    hydratePhotos($('#list'));
  };
  renderItems();
  $('#q').addEventListener('input', e => { st.q = e.target.value; renderItems(); });
  $('#sort').addEventListener('change', e => { st.sort = e.target.value; renderItems(); });
  $('.filter-chips').addEventListener('click', e => {
    const b = e.target.closest('button.chip');
    if (!b) return;
    if (b.hasAttribute('data-fav')) st.fav = !st.fav;
    else st.cat = b.dataset.cat;
    $$('.filter-chips button.chip').forEach(c => c.classList.toggle('on', c.hasAttribute('data-fav') ? st.fav : c.dataset.cat === st.cat));
    renderItems();
  });
}

async function recipeForm(id, q) {
  let r;
  if (id) {
    r = await db.get('recipes', id);
    if (!r) return notFound();
  } else {
    r = newRecipe();
    if (q?.get('draft') && pendingDraft) { Object.assign(r, pendingDraft); pendingDraft = null; }
  }
  setHeader(id ? 'Editar receita' : 'Nova receita', id ? `#/recipes/${id}` : '#/recipes');

  paint(`<form class="form" id="f" novalidate>
    <section class="card"><h3>Fotos</h3>${photoPicker('photos', r.photos)}</section>

    <section class="card"><h3>Informações</h3>
      ${field('Nome da receita *', textInput('title', r.title, 'required autocomplete="off"'), 'full')}
      <div class="grid2">
        ${field('Categoria', selectInput('category', RECIPE_CATEGORIES, r.category))}
        ${field('Cozinha / origem', textInput('cuisine', r.cuisine, 'placeholder="Italiana, mineira…"'))}
        ${field('Rendimento (porções)', numInput('servings', r.servings))}
        ${field('Tempo de preparo (min)', numInput('prepTime', r.prepTime))}
        ${field('Tempo total (min)', numInput('totalTime', r.totalTime))}
      </div>
      <div class="field full"><span>Dificuldade</span>${segInput('difficulty', DIFFICULTIES, r.difficulty)}</div>
    </section>

    <section class="card"><h3>Ingredientes</h3>
      <p class="hint">Um por linha, começando pela quantidade (ex.: <i>2 xícaras de farinha</i>). Uma linha terminando em “:” vira seção (ex.: <i>Massa:</i>).</p>
      <textarea name="ingredients" rows="9" placeholder="Massa:&#10;2 xícaras de farinha de trigo&#10;3 ovos&#10;&#10;Recheio:&#10;200 g de queijo">${esc(r.ingredients)}</textarea>
    </section>

    <section class="card"><h3>Modo de preparo</h3>
      <p class="hint">Um passo por linha.</p>
      <textarea name="steps" rows="9">${esc(r.steps)}</textarea>
    </section>

    <section class="card"><h3>Utensílios recomendados</h3>${tagInput('utensils', r.utensils, UTENSILS)}</section>

    <section class="card"><h3>Mais</h3>
      ${field('Harmonização sugerida', textInput('pairing', r.pairing, 'placeholder="Vinho tinto leve, cerveja de trigo…"'), 'full')}
      ${field('Fonte (link, livro, pessoa)', textInput('source', r.source), 'full')}
      <div class="field full"><span>Tags</span>${tagInput('tags', r.tags, ['rápida', 'vegana', 'sem glúten', 'congelável', 'festa', 'econômica', 'fit', 'churrasco', 'natal'])}</div>
      ${field('Observações / dicas', `<textarea name="notes" rows="3">${esc(r.notes)}</textarea>`, 'full')}
      <label class="check"><input type="checkbox" name="favorite" ${r.favorite ? 'checked' : ''}> ♥ Favorita</label>
    </section>

    <div class="form-actions"><button type="button" class="btn ghost" data-cancel>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div>
  </form>`);

  const form = $('#f');
  bindForm(form);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = collectForm(form);
    if (!data.title) { toast('Informe o nome da receita'); form.elements.namedItem('title').focus(); return; }
    const saved = { ...r, ...data, updatedAt: Date.now() };
    await db.put('recipes', saved);
    if (id) await deletePhotosIfUnused((r.photos || []).filter(p => !saved.photos.includes(p)));
    toast('Receita salva');
    location.replace(`#/recipes/${saved.id}`);
  });
}

function ingredientsHTML(text, factor) {
  const lines = String(text || '').split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return '<p class="muted">Sem ingredientes cadastrados.</p>';
  return `<ul class="ing">${lines.map(l => isSectionLine(l)
    ? `<li class="ing-sec">${esc(sectionTitle(l))}</li>`
    : `<li><label><input type="checkbox"><span>${esc(scaleLine(l, factor))}</span></label></li>`).join('')}</ul>`;
}

let wakeLock = null;
async function releaseWakeLock() {
  document.body.classList.remove('cook-mode');
  if (wakeLock) { try { await wakeLock.release(); } catch { /* já liberado */ } wakeLock = null; }
}

async function recipeDetail(id) {
  const r = await db.get('recipes', id);
  if (!r) return notFound();
  setHeader('Receita', '#/recipes');
  const [logs, drinks] = await Promise.all([db.getAll('logs'), db.getAll('drinks')]);
  const mine = logs.filter(l => l.recipeId === id).sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt);
  const drinkById = new Map(drinks.map(d => [d.id, d]));
  const s = recipeStats(r, logs);
  const base = isNum(r.servings) && r.servings > 0 ? r.servings : null;
  let current = base || 1;
  const steps = String(r.steps || '').split('\n').map(l => l.trim()).filter(Boolean);
  const src = /^https?:\/\//i.test(r.source) ? `<a href="${esc(r.source)}" target="_blank" rel="noopener noreferrer">${esc(r.source)}</a>` : esc(r.source);

  paint(`${gallery(r.photos)}
    <div class="detail-head">
      ${r.category ? `<span class="badge" style="--c:#c0622b">${esc(r.category)}</span>` : ''}
      <h2>${r.favorite ? '<span class="fav">♥</span> ' : ''}${esc(r.title)}</h2>
      ${r.cuisine ? `<p class="muted">${esc(r.cuisine)}</p>` : ''}
      <div class="rating-line">${s.count ? `${stars(s.avg, 'big')} <b>${fmtRating(s.avg)}</b><span class="pill">Feita ${s.count}× · última em ${fmtDate(s.last)}</span>` : '<span class="pill">Ainda não registrada como feita</span>'}</div>
    </div>

    <div class="meta-row">
      ${r.prepTime ? `<div><small>Preparo</small><b>${fmtMinutes(r.prepTime)}</b></div>` : ''}
      ${r.totalTime ? `<div><small>Total</small><b>${fmtMinutes(r.totalTime)}</b></div>` : ''}
      ${r.difficulty ? `<div><small>Dificuldade</small><b>${esc(r.difficulty)}</b></div>` : ''}
      <div class="scaler"><small>${base ? 'Porções' : 'Quantidade'}</small>
        <div><button class="btn small" data-scale="-1" aria-label="Diminuir">−</button><b id="scale-v"></b><button class="btn small" data-scale="1" aria-label="Aumentar">+</button></div></div>
    </div>

    <div class="actions">
      <a class="btn primary" href="#/recipes/${esc(id)}/log">🍳 Registrar que fiz</a>
      <button class="btn" id="cook">🔆 Modo cozinha</button>
    </div>

    <section class="card"><h3>Ingredientes</h3><div id="ing"></div></section>
    ${r.utensils?.length ? `<section class="card"><h3>Utensílios</h3><div class="chips ro">${r.utensils.map(u => `<span class="chip">${esc(u)}</span>`).join('')}</div></section>` : ''}
    <section class="card"><h3>Modo de preparo</h3>${steps.length
      ? `<ol class="steps">${steps.map(st => `<li>${esc(st)}</li>`).join('')}</ol><p class="hint">Toque em um passo para marcá-lo como feito.</p>`
      : '<p class="muted">Sem passos cadastrados.</p>'}</section>
    ${r.pairing ? `<section class="card"><h3>Harmonização sugerida</h3><p class="pre">${esc(r.pairing)}</p></section>` : ''}
    ${r.notes ? `<section class="card"><h3>Observações</h3><p class="pre">${esc(r.notes)}</p></section>` : ''}
    ${r.source || r.tags?.length ? `<section class="card">${r.source ? `<p class="src">Fonte: ${src}</p>` : ''}${r.tags?.length ? `<div class="chips ro">${r.tags.map(t => `<span class="chip">#${esc(t)}</span>`).join('')}</div>` : ''}</section>` : ''}

    <section class="card"><h3>Histórico de preparos (${mine.length})</h3>
      ${mine.length ? mine.map(l => logCard(l, drinkById)).join('') : '<p class="muted">Quando fizer esta receita, registre aqui: fotos, ajustes, acompanhamentos e bebidas.</p>'}
    </section>

    <div class="actions">
      <a class="btn" href="#/recipes/${esc(id)}/edit">✏️ Editar</a>
      <button class="btn danger" id="del">🗑 Excluir</button>
    </div>`);

  const renderScale = () => {
    $('#scale-v').textContent = base ? current : `${formatNum(current)}×`;
    $('#ing').innerHTML = ingredientsHTML(r.ingredients, base ? current / base : current);
  };
  renderScale();
  $$('[data-scale]').forEach(b => b.onclick = () => {
    const step = Number(b.dataset.scale) * (base ? 1 : 0.5);
    current = Math.max(base ? 1 : 0.5, current + step);
    renderScale();
  });
  $('.steps')?.addEventListener('click', e => e.target.closest('li')?.classList.toggle('done'));

  $('#cook').onclick = async () => {
    if (document.body.classList.contains('cook-mode')) { await releaseWakeLock(); $('#cook').classList.remove('on'); return; }
    document.body.classList.add('cook-mode');
    $('#cook').classList.add('on');
    try {
      if ('wakeLock' in navigator) { wakeLock = await navigator.wakeLock.request('screen'); toast('Tela ficará acesa enquanto cozinha'); }
      else toast('Letras maiores ativadas (este aparelho não permite manter a tela acesa)');
    } catch { toast('Letras maiores ativadas'); }
  };

  $('#del').onclick = async () => {
    const extra = mine.length ? ` e ${mine.length} registro(s) de preparo` : '';
    if (!confirm(`Excluir a receita "${r.title}"${extra}? Essa ação não pode ser desfeita.`)) return;
    await db.del('recipes', id);
    await db.delMany('logs', mine.map(l => l.id));
    await deletePhotosIfUnused([...(r.photos || []), ...mine.flatMap(l => l.photos || [])]);
    toast('Receita excluída');
    location.replace('#/recipes');
  };
}

function logCard(l, drinkById) {
  const drinks = (l.drinks || []).map(id => drinkById.get(id)).filter(Boolean);
  return `<article class="log">
    <div class="log-head"><b>${fmtDate(l.date)}</b>${l.rating ? stars(l.rating) : ''}${isNum(l.servings) ? `<span class="muted">${l.servings} porções</span>` : ''}
      <a class="link" href="#/logs/${esc(l.id)}/edit">editar</a></div>
    ${l.photos?.length ? `<div class="log-photos">${l.photos.map(p => `<div class="log-ph"><img data-photo="${esc(p)}" data-zoom alt=""></div>`).join('')}</div>` : ''}
    ${l.adjustments ? `<p><small class="lbl">Ajustes</small><span class="pre">${esc(l.adjustments)}</span></p>` : ''}
    ${l.sides?.length ? `<p><small class="lbl">Acompanhamentos</small>${l.sides.map(esc).join(', ')}</p>` : ''}
    ${drinks.length ? `<p><small class="lbl">Bebidas</small></p><div class="mini-list">${drinks.map(d => `<a href="#/drinks/${esc(d.id)}">${typeById(d.type).icon} ${esc(d.name)} ${d.rating ? stars(d.rating) : '<span class="muted">· avaliar</span>'}</a>`).join('')}</div>` : ''}
    ${l.notes ? `<p><small class="lbl">Notas</small><span class="pre">${esc(l.notes)}</span></p>` : ''}
  </article>`;
}

// ---------- Registro de preparo ----------

function newLog(recipeId) {
  return { id: db.uid(), recipeId, date: today(), rating: 0, servings: '', adjustments: '', sides: [], drinks: [], notes: '', photos: [], createdAt: Date.now(), updatedAt: Date.now() };
}

async function logForm(logId, recipeId) {
  let l;
  if (logId) {
    l = await db.get('logs', logId);
    if (!l) return notFound();
    recipeId = l.recipeId;
  } else {
    l = newLog(recipeId);
  }
  const r = await db.get('recipes', recipeId);
  if (!r) return notFound();
  const drinks = (await db.getAll('drinks')).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const known = new Map(drinks.map(d => [d.id, d]));
  const quickNew = new Map(); // bebidas criadas aqui, só gravadas ao salvar
  const picked = new Set((l.drinks || []).filter(id => known.has(id)));
  setHeader(logId ? 'Editar preparo' : 'Registrar preparo', `#/recipes/${recipeId}`);

  paint(`<p class="hint center">🍳 ${esc(r.title)}</p>
  <form class="form" id="f" novalidate>
    <section class="card"><h3>Como foi</h3>
      <div class="grid2">
        ${field('Data', `<input type="date" name="date" value="${esc(l.date)}">`)}
        ${field('Porções feitas', numInput('servings', l.servings))}
      </div>
      <div class="field full"><span>Nota deste preparo</span>${ratingInput('rating', l.rating)}</div>
    </section>
    <section class="card"><h3>Fotos</h3>${photoPicker('photos', l.photos)}</section>
    <section class="card"><h3>Ajustes realizados</h3>
      <p class="hint">O que mudou em relação à receita: quantidades, substituições, tempo, temperatura…</p>
      <textarea name="adjustments" rows="4">${esc(l.adjustments)}</textarea>
    </section>
    <section class="card"><h3>Acompanhamentos</h3>${tagInput('sides', l.sides, SIDE_SUGGESTIONS, 'Ex.: arroz, salada…')}</section>
    <section class="card"><h3>Bebidas que acompanharam</h3>
      <div class="picked" id="picked"></div>
      ${drinks.length ? `<select id="dp-select"><option value="">+ Escolher bebida já registrada…</option>
        ${DRINK_TYPES.filter(t => drinks.some(d => d.type === t.id)).map(t => `<optgroup label="${t.icon} ${t.label}">${drinks.filter(d => d.type === t.id).map(d => `<option value="${esc(d.id)}">${esc(d.name)}${d.produtor ? ` – ${esc(d.produtor)}` : ''}</option>`).join('')}</optgroup>`).join('')}
      </select>` : ''}
      <details class="quick" ${drinks.length ? '' : 'open'}><summary>Registrar uma bebida nova</summary>
        <div class="grid2">
          ${field('Tipo', `<select id="dp-type">${DRINK_TYPES.map(t => `<option value="${t.id}">${t.icon} ${t.label}</option>`).join('')}</select>`)}
          ${field('Nome', '<input id="dp-name" autocomplete="off">')}
        </div>
        <div class="field full"><span>Nota (opcional)</span>${ratingInput('_quickRating', 0)}</div>
        <button type="button" class="btn small" id="dp-add">Adicionar bebida</button>
        <p class="hint">Ela será criada na aba Bebidas, onde você pode completar a avaliação depois.</p>
      </details>
    </section>
    <section class="card"><h3>Notas</h3><textarea name="notes" rows="3" placeholder="Quem comeu, ocasião, o que fazer diferente…">${esc(l.notes)}</textarea></section>
    <div class="form-actions">
      ${logId ? '<button type="button" class="btn danger" id="del">Excluir</button>' : ''}
      <button type="button" class="btn ghost" data-cancel>Cancelar</button><button class="btn primary" type="submit">Salvar</button>
    </div>
  </form>`);

  const form = $('#f');
  bindForm(form);
  const renderPicked = () => {
    $('#picked').innerHTML = [...picked].map(id => {
      const d = known.get(id) || quickNew.get(id);
      return `<span class="tag">${typeById(d.type).icon} ${esc(d.name)}${quickNew.has(id) ? ' <small>(nova)</small>' : ''}<button type="button" data-unpick="${esc(id)}" aria-label="Remover">×</button></span>`;
    }).join('') || '<p class="muted">Nenhuma bebida adicionada.</p>';
  };
  renderPicked();
  $('#picked').addEventListener('click', e => {
    const b = e.target.closest('[data-unpick]');
    if (!b) return;
    picked.delete(b.dataset.unpick);
    quickNew.delete(b.dataset.unpick);
    renderPicked();
  });
  $('#dp-select')?.addEventListener('change', e => { if (e.target.value) picked.add(e.target.value); e.target.value = ''; renderPicked(); });
  $('#dp-add').onclick = () => {
    const name = $('#dp-name').value.trim();
    if (!name) { toast('Digite o nome da bebida'); return; }
    const box = $('#dp-add').closest('details').querySelector('[data-rating]');
    const d = { ...newDrink($('#dp-type').value), name, rating: Number($('input', box).value) || 0, notes: `Registrada no preparo de "${r.title}".` };
    quickNew.set(d.id, d);
    picked.add(d.id);
    $('#dp-name').value = '';
    setRating(box, 0);
    renderPicked();
  };
  $('#del')?.addEventListener('click', async () => {
    if (!confirm('Excluir este registro de preparo?')) return;
    await db.del('logs', l.id);
    await deletePhotosIfUnused(l.photos);
    toast('Registro excluído');
    location.replace(`#/recipes/${recipeId}`);
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = collectForm(form);
    delete data._quickRating;
    const date = data.date || today();
    const newDrinks = [...quickNew.values()].filter(d => picked.has(d.id)).map(d => ({ ...d, date }));
    if (newDrinks.length) await db.putMany('drinks', newDrinks);
    const saved = { ...l, ...data, date, rating: data.rating || 0, drinks: [...picked], updatedAt: Date.now() };
    await db.put('logs', saved);
    if (logId) await deletePhotosIfUnused((l.photos || []).filter(p => !saved.photos.includes(p)));
    toast('Preparo registrado');
    location.replace(`#/recipes/${recipeId}`);
  });
}

// ---------- Importar de texto / Instagram ----------

let pendingImport = null;

function recipeImport() {
  setHeader('Importar receita', '#/recipes');
  const pre = pendingImport || { text: '', url: '' };
  pendingImport = null;
  paint(`<section class="card">
      <h3>Como importar do Instagram</h3>
      <ol class="howto">
        <li>No post/reels, toque na legenda para expandir, depois toque e segure → <b>Copiar</b>.</li>
        <li>Cole aqui embaixo. Se quiser guardar o link, use <b>··· → Copiar link</b>.</li>
        <li>Toque em <b>Analisar</b>. O app separa título, ingredientes, preparo e hashtags para você revisar.</li>
      </ol>
      <p class="hint">No Android, com o app instalado, você também pode usar <b>Compartilhar → Adega & Receitas</b> direto do Instagram. O link chega preenchido, e a legenda você cola aqui.</p>
    </section>
    <form class="form" id="f">
      <section class="card">
        ${field('Link do post (opcional)', textInput('url', pre.url, 'inputmode="url" placeholder="https://www.instagram.com/reel/…"'), 'full')}
        <div class="field full"><span>Legenda / texto da receita</span>
          <textarea name="text" rows="12" placeholder="Cole aqui a legenda com ingredientes e modo de preparo">${esc(pre.text)}</textarea></div>
        <div class="actions left">
          ${navigator.clipboard?.readText ? '<button type="button" class="btn" id="paste">📋 Colar</button>' : ''}
          <button class="btn primary" type="submit">Analisar e revisar →</button>
        </div>
      </section>
    </form>`);
  $('#paste')?.addEventListener('click', async () => {
    try { $('#f').text.value = await navigator.clipboard.readText(); } catch { toast('Não foi possível ler a área de transferência'); }
  });
  $('#f').addEventListener('submit', e => {
    e.preventDefault();
    const text = e.target.text.value;
    const url = e.target.url.value.trim();
    if (!text.trim() && !url) { toast('Cole o texto da receita'); return; }
    const parsed = parseRecipeText(text, url);
    if (/instagram\.com/i.test(url)) parsed.tags = [...new Set([...parsed.tags, 'instagram'])];
    pendingDraft = parsed;
    location.replace('#/recipes/new?draft=1');
  });
}

// ================= Estatísticas =================

function statValue(d, key) {
  const v = key in COMMON_LABELS ? d[key] : d.spec?.[key];
  if (Array.isArray(v)) return v;
  return v === '' || v == null ? [] : [String(v)];
}

function groupBy(items, getVals, getRating) {
  const m = new Map();
  for (const it of items) {
    for (const raw of getVals(it)) {
      const label = String(raw).trim();
      if (!label) continue;
      const k = norm(label);
      const g = m.get(k) || { label, n: 0, ratings: [] };
      g.n++;
      if (getRating) g.ratings.push(getRating(it));
      m.set(k, g);
    }
  }
  return [...m.values()].map(g => ({ ...g, avg: avg(g.ratings) })).sort((a, b) => b.n - a.n || (b.avg || 0) - (a.avg || 0));
}

function barList(rows, { limit = 8, showAvg = true } = {}) {
  if (!rows.length) return '<p class="muted">Sem dados ainda.</p>';
  const top = rows.slice(0, limit);
  const max = Math.max(...top.map(r => r.n));
  return `<div class="bars">${top.map(r => `<div class="bar-row">
      <span class="bar-label">${esc(r.label)}</span>
      <div class="bar"><i style="width:${(r.n / max) * 100}%"></i></div>
      <span class="bar-val">${r.n}${showAvg && r.avg ? ` · ★${fmtRating(r.avg)}` : ''}</span></div>`).join('')}</div>`;
}

function kpis(items) {
  return `<div class="kpis">${items.map(([label, value]) => `<div class="kpi"><b>${value}</b><small>${esc(label)}</small></div>`).join('')}</div>`;
}

function radar(axes, series) {
  const n = axes.length, R = 95, cx = 180, cy = 135;
  const pt = (i, v) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * R * (v / 5), cy + Math.sin(a) * R * (v / 5)];
  };
  const poly = vals => vals.map((v, i) => pt(i, v).map(x => x.toFixed(1)).join(',')).join(' ');
  const rings = [1, 2, 3, 4, 5].map(k => `<polygon points="${poly(axes.map(() => k))}" class="r-grid"/>`).join('');
  const spokes = axes.map((_, i) => { const [x, y] = pt(i, 5); return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" class="r-grid"/>`; }).join('');
  const labels = axes.map((a, i) => {
    const [x, y] = pt(i, 6.1);
    const c = Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / n);
    const anchor = Math.abs(c) < 0.3 ? 'middle' : c > 0 ? 'start' : 'end';
    return `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle" class="r-label">${esc(a.label)}</text>`;
  }).join('');
  const shapes = series.map(s => `<polygon points="${poly(s.values.map(v => v || 0))}" class="r-shape ${s.cls}"/>`).join('');
  return `<svg viewBox="0 0 360 270" class="radar" role="img" aria-label="Perfil sensorial médio">${rings}${spokes}${shapes}${labels}</svg>
    <div class="legend">${series.map(s => `<span><i class="${s.cls}"></i>${esc(s.label)}</span>`).join('')}</div>`;
}

function monthlyActivity(dates) {
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), n: 0 });
  }
  for (const dt of dates) { const m = months.find(x => dt?.startsWith(x.key)); if (m) m.n++; }
  const max = Math.max(1, ...months.map(m => m.n));
  return `<div class="cols">${months.map(m => `<div class="col" title="${m.n}"><span>${m.n || ''}</span><i style="height:${(m.n / max) * 100}%"></i><small>${m.label}</small></div>`).join('')}</div>`;
}

function topList(drinks, n = 5, worst = false) {
  const rated = drinks.filter(d => d.rating > 0).sort((a, b) => worst ? a.rating - b.rating : b.rating - a.rating).slice(0, n);
  if (!rated.length) return '<p class="muted">Avalie algumas bebidas para ver o ranking.</p>';
  return `<div class="mini-list">${rated.map((d, i) => `<a href="#/drinks/${esc(d.id)}"><span class="rank">${i + 1}</span>${typeById(d.type).icon} ${esc(d.name)} ${stars(d.rating)}</a>`).join('')}</div>`;
}

async function statsView(sub) {
  setHeader('Estatísticas');
  const [drinks, recipes, logs] = await Promise.all(['drinks', 'recipes', 'logs'].map(db.getAll));
  const usedTypes = DRINK_TYPES.filter(t => drinks.some(d => d.type === t.id));
  const tabs = `<div class="filter-chips">
    <a class="chip ${!sub ? 'on' : ''}" href="#/stats">Geral</a>
    ${usedTypes.map(t => `<a class="chip ${sub === t.id ? 'on' : ''}" href="#/stats/${t.id}">${t.icon} ${t.label}</a>`).join('')}
    <a class="chip ${sub === 'receitas' ? 'on' : ''}" href="#/stats/receitas">🍳 Receitas</a>
  </div>`;

  if (sub === 'receitas') return paint(tabs + recipeStatsHTML(recipes, logs, drinks));
  if (sub) {
    const t = typeById(sub);
    return paint(tabs + typeStatsHTML(t, drinks.filter(d => d.type === t.id)));
  }

  const spent = drinks.reduce((a, d) => a + (isNum(d.price) ? d.price : 0), 0);
  const byType = usedTypes.map(t => {
    const ds = drinks.filter(d => d.type === t.id);
    return { t, n: ds.length, avg: avg(ds.map(d => d.rating)) };
  });
  const maxN = Math.max(1, ...byType.map(x => x.n));
  paint(`${tabs}
    ${kpis([['bebidas registradas', drinks.length], ['nota média', fmtRating(avg(drinks.map(d => d.rating)))], ['receitas', recipes.length], ['vezes cozinhadas', logs.length]])}
    <section class="card"><h3>Por tipo de bebida</h3>
      ${byType.length ? `<div class="bars">${byType.map(x => `<a class="bar-row" href="#/stats/${x.t.id}">
        <span class="bar-label">${x.t.icon} ${x.t.label}</span><div class="bar"><i style="width:${(x.n / maxN) * 100}%;background:${x.t.color}"></i></div>
        <span class="bar-val">${x.n}${x.avg ? ` · ★${fmtRating(x.avg)}` : ''}</span></a>`).join('')}</div>` : '<p class="muted">Registre bebidas para ver estatísticas.</p>'}
    </section>
    <section class="card"><h3>Melhores avaliadas</h3>${topList(drinks)}</section>
    <section class="card"><h3>Atividade nos últimos 12 meses</h3>${monthlyActivity([...drinks.map(d => d.date), ...logs.map(l => l.date)])}
      <p class="hint">Bebidas provadas + receitas preparadas por mês.</p></section>
    ${spent ? `<section class="card"><h3>Gastos registrados</h3>${kpis([['total', fmtMoney(spent)], ['média por bebida', fmtMoney(spent / drinks.filter(d => isNum(d.price)).length)]])}</section>` : ''}`);
}

function typeStatsHTML(t, ds) {
  if (!ds.length) return '<div class="empty">Nenhum registro deste tipo.</div>';
  const buy = ds.filter(d => d.buyAgain);
  const priced = ds.filter(d => isNum(d.price));
  const abvs = ds.filter(d => isNum(d.abv));
  const fav = ds.filter(d => d.rating >= 4);

  const axisAvg = list => t.sensory.map(a => avg(list.map(d => d.sensory?.[a.k])) || 0);
  const allAvg = axisAvg(ds);
  const rated = allAvg.filter(v => v > 0).length;
  const series = [{ label: 'Média geral', values: allAvg, cls: 's1' }];
  if (fav.length && fav.length < ds.length) series.push({ label: 'Suas favoritas (nota ≥ 4)', values: axisAvg(fav), cls: 's2' });

  const keyLabel = k => COMMON_LABELS[k] || t.fields.find(f => f.k === k)?.label || k;
  const groups = t.stats.map(k => ({ k, rows: groupBy(ds, d => statValue(d, k), d => d.rating) })).filter(g => g.rows.length);
  const aromas = groupBy(ds, d => d.aromas || [], d => d.rating);
  const favAromas = groupBy(fav, d => d.aromas || []);
  const hist = [1, 2, 3, 4, 5].map(i => ({ label: '★'.repeat(i), n: ds.filter(d => d.rating > i - 1 && d.rating <= i).length }));

  return `${kpis([
    ['registros', ds.length],
    ['nota média', fmtRating(avg(ds.map(d => d.rating)))],
    ['comprariam de novo', buy.length ? `${Math.round((buy.filter(d => d.buyAgain === 'Sim').length / buy.length) * 100)}%` : '—'],
    ['preço médio', priced.length ? fmtMoney(priced.reduce((a, d) => a + d.price, 0) / priced.length) : '—'],
    ...(t.alcoholic && abvs.length ? [['teor médio', `${fmtNum(Math.round((abvs.reduce((a, d) => a + d.abv, 0) / abvs.length) * 10) / 10)}%`]] : []),
  ])}
    ${rated >= 3 ? `<section class="card"><h3>Perfil sensorial médio</h3>${radar(t.sensory, series)}
      ${series.length > 1 ? '<p class="hint">A diferença entre as formas mostra o perfil de que você mais gosta.</p>' : ''}</section>` : ''}
    <section class="card"><h3>Distribuição de notas</h3>${barList(hist.filter(h => h.n).reverse(), { showAvg: false })}</section>
    ${groups.map(g => `<section class="card"><h3>Por ${esc(keyLabel(g.k).toLowerCase())}</h3>${barList(g.rows)}<p class="hint">quantidade · nota média</p></section>`).join('')}
    ${aromas.length ? `<section class="card"><h3>Aromas mais frequentes</h3>${barList(aromas, { limit: 10 })}</section>` : ''}
    ${favAromas.length ? `<section class="card"><h3>Aromas das suas favoritas</h3>${barList(favAromas, { limit: 8, showAvg: false })}</section>` : ''}
    <section class="card"><h3>Top 5</h3>${topList(ds)}</section>
    ${ds.filter(d => d.rating > 0).length >= 6 ? `<section class="card"><h3>Menos apreciadas</h3>${topList(ds, 3, true)}</section>` : ''}`;
}

function recipeStatsHTML(recipes, logs, drinks) {
  if (!recipes.length) return '<div class="empty">Nenhuma receita cadastrada.</div>';
  const byRecipe = recipes.map(r => ({ r, ...recipeStats(r, logs) }));
  const cooked = byRecipe.filter(x => x.count).sort((a, b) => b.count - a.count);
  const best = byRecipe.filter(x => x.avg).sort((a, b) => b.avg - a.avg);
  const drinkById = new Map(drinks.map(d => [d.id, d]));
  const pairDrinks = groupBy(logs, l => (l.drinks || []).map(id => drinkById.get(id)).filter(Boolean).map(d => `${typeById(d.type).icon} ${d.name}`));
  const pairTypes = groupBy(logs, l => [...new Set((l.drinks || []).map(id => drinkById.get(id)).filter(Boolean).map(d => typeById(d.type).label))]);
  const link = x => `<a href="#/recipes/${esc(x.r.id)}">${esc(x.r.title)} <span class="muted">· ${x.count}× ${x.avg ? `· ★${fmtRating(x.avg)}` : ''}</span></a>`;

  return `${kpis([['receitas', recipes.length], ['preparos registrados', logs.length], ['nunca feitas', byRecipe.filter(x => !x.count).length], ['nota média dos preparos', fmtRating(avg(logs.map(l => l.rating)))]])}
    <section class="card"><h3>Mais feitas</h3>${cooked.length ? `<div class="mini-list">${cooked.slice(0, 8).map(link).join('')}</div>` : '<p class="muted">Registre seus preparos para ver aqui.</p>'}</section>
    <section class="card"><h3>Melhor avaliadas</h3>${best.length ? `<div class="mini-list">${best.slice(0, 8).map(link).join('')}</div>` : '<p class="muted">Dê notas aos preparos.</p>'}</section>
    <section class="card"><h3>Por categoria</h3>${barList(groupBy(recipes, r => r.category ? [r.category] : []), { showAvg: false })}</section>
    ${pairTypes.length ? `<section class="card"><h3>Bebidas nas refeições (por tipo)</h3>${barList(pairTypes, { showAvg: false })}</section>` : ''}
    ${pairDrinks.length ? `<section class="card"><h3>Bebidas mais usadas nas harmonizações</h3>${barList(pairDrinks, { showAvg: false })}</section>` : ''}
    <section class="card"><h3>Utensílios mais usados</h3>${barList(groupBy(recipes, r => r.utensils || []), { limit: 10, showAvg: false })}</section>
    <section class="card"><h3>Preparos por mês</h3>${monthlyActivity(logs.map(l => l.date))}</section>`;
}

// ================= Backup / Mais =================

let installPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; });

async function moreView() {
  setHeader('Backup e app');
  const [last, drinks, recipes, logs] = await Promise.all([db.getMeta('lastBackup', 0), db.getAll('drinks'), db.getAll('recipes'), db.getAll('logs')]);
  const est = navigator.storage?.estimate ? await navigator.storage.estimate() : null;
  const persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : false;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const mb = n => `${(n / 1048576).toFixed(1).replace('.', ',')} MB`;

  paint(`<section class="card"><h3>💾 Backup e transferência</h3>
      <p>Tudo fica salvo <b>só neste aparelho</b>. Para levar seus registros a outro celular ou PC, exporte um arquivo e importe no outro aparelho. O arquivo pode ir por Drive, e-mail, WhatsApp, cabo etc.</p>
      <p class="muted">Último backup: ${last ? new Date(last).toLocaleString('pt-BR') : 'nunca'}</p>
      <label class="check"><input type="checkbox" id="incPhotos" checked> Incluir fotos (arquivo maior)</label>
      <div class="actions left"><button class="btn primary" id="export">⬆️ Exportar backup</button></div>
      <hr>
      <h4>Importar backup</h4>
      <div class="seg">
        <label><input type="radio" name="mode" value="merge" checked><span>Mesclar</span></label>
        <label><input type="radio" name="mode" value="replace"><span>Substituir tudo</span></label>
      </div>
      <p class="hint">“Mesclar” junta os dados e mantém a versão mais recente de cada registro. “Substituir” apaga os dados deste aparelho e usa só os do arquivo.</p>
      <div class="actions left"><label class="btn">⬇️ Escolher arquivo…<input type="file" id="importFile" accept=".json,application/json" hidden></label></div>
    </section>

    <section class="card"><h3>📱 Instalar o app</h3>
      ${standalone ? '<p>✅ Você está usando o app instalado.</p>' : `
      ${installPrompt ? '<div class="actions left"><button class="btn primary" id="install">Instalar agora</button></div>' : ''}
      <ul class="howto">
        <li><b>iPhone/iPad (Safari):</b> botão Compartilhar → <i>Adicionar à Tela de Início</i>.</li>
        <li><b>Android (Chrome):</b> menu ⋮ → <i>Instalar app</i> ou <i>Adicionar à tela inicial</i>.</li>
        <li><b>PC (Chrome/Edge):</b> ícone de instalar na barra de endereço.</li>
      </ul>
      <p class="hint">Depois de instalado, funciona sem internet.</p>`}
    </section>

    <section class="card"><h3>🗄 Armazenamento</h3>
      ${kpis([['bebidas', drinks.length], ['receitas', recipes.length], ['preparos', logs.length], ['espaço usado', est ? mb(est.usage || 0) : '—']])}
      <p>${persisted ? '✅ Armazenamento persistente ativado. O navegador não vai apagar seus dados para liberar espaço.' : '⚠️ O navegador pode apagar os dados se faltar espaço no aparelho.'}</p>
      ${persisted ? '' : '<div class="actions left"><button class="btn" id="persist">Pedir armazenamento persistente</button></div>'}
      <div class="actions left"><button class="btn ghost" id="clean">Limpar fotos não usadas</button></div>
    </section>
    <p class="hint center">Adega & Receitas · v1.0 · funciona offline</p>`);

  $('#export').onclick = async () => {
    try {
      const r = await exportBackup({ includePhotos: $('#incPhotos').checked });
      if (r !== 'cancelled') { toast('Backup exportado'); moreView(); }
    } catch (e) { toast('Erro ao exportar: ' + e.message); }
  };
  $('#importFile').onchange = async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const mode = $('input[name=mode]:checked').value;
    if (mode === 'replace' && !confirm('Substituir TODOS os dados deste aparelho pelos do arquivo?')) return;
    try {
      const c = await importBackup(file, mode);
      alert(`Importação concluída:\n• ${c.drinks} bebidas\n• ${c.recipes} receitas\n• ${c.logs} preparos\n• ${c.photos} fotos`);
      moreView();
    } catch (err) { alert(err.message); }
  };
  $('#install')?.addEventListener('click', async () => { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; moreView(); });
  $('#persist')?.addEventListener('click', async () => {
    const ok = await navigator.storage.persist();
    toast(ok ? 'Armazenamento persistente ativado' : 'O navegador não concedeu. Instalar o app costuma resolver.');
    moreView();
  });
  $('#clean').onclick = async () => { const n = await cleanOrphanPhotos(); toast(`${n} foto(s) removida(s)`); moreView(); };
}

// ================= Roteador =================

function notFound() {
  setHeader('Não encontrado', '#/drinks');
  paint('<div class="empty">Este registro não existe mais.</div>');
}

async function router() {
  const raw = location.hash.slice(1) || '/drinks';
  const [path, qs] = raw.split('?');
  const [a, b, c] = path.split('/').filter(Boolean);
  const q = new URLSearchParams(qs || '');
  $$('#nav a').forEach(n => n.classList.toggle('on', n.dataset.section === (a === 'logs' ? 'recipes' : a)));
  window.scrollTo(0, 0);
  releaseWakeLock();
  try {
    if (a === 'drinks') {
      if (!b) return await drinkList();
      if (b === 'new') return c ? await drinkForm(null, c) : drinkTypePicker();
      if (c === 'edit') return await drinkForm(b);
      if (c === 'again') return await drinkForm(b, null, true);
      return await drinkDetail(b);
    }
    if (a === 'recipes') {
      if (!b) return await recipeList();
      if (b === 'new') return await recipeForm(null, q);
      if (b === 'import') return recipeImport();
      if (c === 'edit') return await recipeForm(b);
      if (c === 'log') return await logForm(null, b);
      return await recipeDetail(b);
    }
    if (a === 'logs' && c === 'edit') return await logForm(b);
    if (a === 'stats') return await statsView(b);
    if (a === 'more') return await moreView();
    location.replace('#/drinks');
  } catch (e) {
    console.error(e);
    paint(`<div class="empty">Algo deu errado: ${esc(e.message)}</div>`);
  }
}

// Lightbox de fotos
document.addEventListener('click', async e => {
  const img = e.target.closest('img[data-zoom]');
  if (!img) return;
  const p = await getPhoto(img.dataset.photo);
  if (!p) return;
  const lb = $('#lightbox');
  $('img', lb).src = p.data;
  lb.hidden = false;
});
$('#lightbox').addEventListener('click', () => { $('#lightbox').hidden = true; });
$('#back').addEventListener('click', () => go($('#back').dataset.target));

// Recebe conteúdo compartilhado (share target no Android)
function handleShare() {
  const p = new URLSearchParams(location.search);
  if (!p.has('text') && !p.has('url') && !p.has('title')) return;
  const text = [p.get('title'), p.get('text')].filter(Boolean).join('\n');
  const url = p.get('url') || (text.match(/https?:\/\/\S+/) || [''])[0];
  pendingImport = { text: text.replace(url, '').trim(), url };
  history.replaceState(null, '', location.pathname + '#/recipes/import');
}

window.addEventListener('hashchange', router);
window.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && document.body.classList.contains('cook-mode') && 'wakeLock' in navigator && !wakeLock) {
    try { wakeLock = await navigator.wakeLock.request('screen'); } catch { /* ignore */ }
  }
});

handleShare();
router();
cleanOrphanPhotos().catch(() => {});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW', err));
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) toast('App atualizado. Reabra para ver a nova versão.');
  });
}
