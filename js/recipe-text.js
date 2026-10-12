// Utilidades de texto para receitas: interpretar uma legenda colada
// (ex.: do Instagram) e escalar quantidades de ingredientes.

const ING_HEAD = /^(ingredientes?|ingredients?|voc[eê] vai precisar|vai precisar|lista de compras|o que usar)\b/i;
const STEP_HEAD = /^(modo de preparo|preparo|modo de fazer|como fazer|passo a passo|instru[cç][oõ]es|preparation|method|directions|montagem|execu[cç][aã]o)\b/i;
const NOTE_HEAD = /^(dicas?|observa[cç][aãoõ]es|obs\.?|notas?|tips?)\b/i;
const HASHTAG = /#[\p{L}\p{N}_]+/gu;
const LEAD_SYMBOLS = /^[\s\p{Extended_Pictographic}⃣️‍•\-*▪▫◦●○·–—>✓✔☑]+/u;
const QTY_START = /^(\d|[½⅓⅔¼¾⅛]|uma?\s|meia\s|duas\s|tr[eê]s\s|pitada|a gosto|q\.?b\.?)/i;

function cleanLine(line) {
  return line.replace(HASHTAG, '').replace(LEAD_SYMBOLS, '').replace(/\s+/g, ' ').trim();
}

function stripStepNumber(line) {
  return line.replace(/^(passo\s*)?\d{1,2}\s*[.)º°:\-–]\s*/i, '').trim();
}

function headerRest(line) {
  const i = line.indexOf(':');
  return i >= 0 ? line.slice(i + 1).trim() : '';
}

export function parseRecipeText(text, sourceUrl = '') {
  const rawLines = String(text || '').replace(/\r/g, '').split('\n');
  const tags = [...new Set([...String(text || '').matchAll(HASHTAG)].map(m => m[0].slice(1)))].slice(0, 15);

  const intro = [], ings = [], steps = [], notes = [];
  let mode = 'intro';
  for (const raw of rawLines) {
    const line = cleanLine(raw);
    if (!line) continue;
    // Cabeçalho pode vir sozinho ("Modo de preparo") ou com texto após ":" ("Dica: …")
    const head = (line.includes(':') ? line.split(':')[0] : line).toLowerCase().trim();
    if (head.length < 45 && ING_HEAD.test(head)) {
      mode = 'ing';
      // "Ingredientes da massa:" vira uma seção; "Ingredientes: 2 ovos" mantém o item
      const label = line.split(':')[0].trim();
      if (label.split(/\s+/).length > 1) ings.push(`${label}:`);
      const r = headerRest(line);
      if (r) ings.push(r);
      continue;
    }
    if (head.length < 45 && STEP_HEAD.test(head)) { mode = 'steps'; const r = headerRest(line); if (r) steps.push(stripStepNumber(r)); continue; }
    if (head.length < 30 && NOTE_HEAD.test(head)) { mode = 'notes'; const r = headerRest(line); if (r) notes.push(r); continue; }
    if (mode === 'ing') ings.push(line);
    else if (mode === 'steps') steps.push(stripStepNumber(line));
    else if (mode === 'notes') notes.push(line);
    else intro.push(line);
  }

  // Sem cabeçalhos: separa por heurística (linhas que começam com quantidade = ingrediente)
  if (!ings.length && !steps.length && intro.length > 1) {
    const rest = intro.splice(1);
    for (const l of rest) (QTY_START.test(l) && l.length < 80 ? ings : steps).push(stripStepNumber(l));
  }

  const title = (intro.shift() || 'Receita importada').replace(/[.!:]+$/, '').slice(0, 90);
  const all = String(text || '');
  const serv = all.match(/(?:rende|serve|porç(?:ões|oes)|yield)\D{0,15}(\d{1,3})/i);
  const time = all.match(/(\d{1,3})\s*(min(?:utos)?|h(?:oras?)?)\b/i);
  let totalTime = '';
  if (time) totalTime = /^h/i.test(time[2]) ? Number(time[1]) * 60 : Number(time[1]);

  return {
    title,
    ingredients: ings.join('\n'),
    steps: steps.join('\n'),
    notes: [...intro, ...notes].join('\n'),
    tags,
    source: sourceUrl,
    servings: serv ? Number(serv[1]) : '',
    totalTime,
  };
}

// ---------- Escala de ingredientes ----------

const UNICODE_FRAC = { '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅛': 0.125 };
const NUM = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?(?:\s*[½⅓⅔¼¾⅛])?|[½⅓⅔¼¾⅛])`;
const QTY_RE = new RegExp(String.raw`^(${NUM})(\s*(?:-|a|até)\s*(${NUM}))?(?=\s|[a-zA-Z]|$)`);

function parseNum(s) {
  s = s.trim();
  let total = 0;
  for (const [ch, v] of Object.entries(UNICODE_FRAC)) if (s.includes(ch)) { total += v; s = s.replace(ch, '').trim(); }
  if (!s) return total;
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return total + Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return total + Number(frac[1]) / Number(frac[2]);
  return total + Number(s.replace(',', '.'));
}

export function formatNum(n) {
  if (!isFinite(n)) return '';
  const whole = Math.floor(n + 1e-9);
  const rest = n - whole;
  const fracs = [[0, ''], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'], [1, '']];
  if (n < 20) {
    for (const [v, sym] of fracs) {
      if (Math.abs(rest - v) < 0.04) {
        const w = v === 1 ? whole + 1 : whole;
        if (!sym) return String(w);
        return w ? `${w} ${sym}` : sym;
      }
    }
  }
  const r = n >= 10 ? Math.round(n) : Math.round(n * 10) / 10;
  return String(r).replace('.', ',');
}

export function scaleLine(line, factor) {
  if (factor === 1) return line;
  const m = line.match(QTY_RE);
  if (!m) return line;
  const a = formatNum(parseNum(m[1]) * factor);
  const b = m[3] ? formatNum(parseNum(m[3]) * factor) : null;
  return (b ? `${a}–${b}` : a) + line.slice(m[0].length);
}

export const isSectionLine = l => /:\s*$/.test(l) || /^#{1,3}\s/.test(l);
export const sectionTitle = l => l.replace(/^#{1,3}\s*/, '').replace(/:\s*$/, '');
