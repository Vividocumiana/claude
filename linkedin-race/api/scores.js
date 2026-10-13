// Impression Race leaderboard.
// Each score is stored as a tiny Vercel Blob whose pathname encodes the entry,
// so reading the board is a single list() call and concurrent writes never collide.
import { put, list } from '@vercel/blob';

const PREFIX = 'scores/';
const CHARS = ['gabriel', 'nicolas', 'zeeshan'];
const MAX_SCORE = 1500;         // above a perfect run (~1100 with combo x4 and 2X)
const TOP = 10;

const cleanName = v => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);

function parse(pathname) {
  // scores/<9999-score>_<time*10>_<name>_<char>_<id>.txt
  const m = pathname.slice(PREFIX.length).match(/^(\d{4})_(\d{4})_([A-Z0-9]{2,10})_([a-z]+)_([a-z0-9]+)\.txt$/);
  if (!m) return null;
  return { score: 9999 - Number(m[1]), time: Number(m[2]) / 10, name: m[3], char: m[4], id: m[5], key: pathname };
}

async function allEntries() {
  const out = [];
  let cursor;
  do {
    const r = await list({ prefix: PREFIX, cursor, limit: 1000 });
    for (const b of r.blobs) { const e = parse(b.pathname); if (e) out.push(e); }
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor && out.length < 20000);
  // best entry per name: higher score first, then faster time
  out.sort((a, b) => b.score - a.score || a.time - b.time);
  const seen = new Set(), best = [];
  for (const e of out) { if (!seen.has(e.name)) { seen.add(e.name); best.push(e); } }
  return best;
}

const pub = e => ({ name: e.name, score: e.score, char: e.char, time: e.time, id: e.id });

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const best = await allEntries();
      return res.status(200).json({ top: best.slice(0, TOP).map(pub), total: best.length });
    }
    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const name = cleanName(b.name);
      const score = Math.floor(Number(b.score));
      const time = Number(b.time);
      const char = CHARS.includes(b.char) ? b.char : CHARS[0];
      if (name.length < 2 || !Number.isFinite(score) || score < 0 || score > MAX_SCORE || !(time >= 25 && time <= 300)) {
        return res.status(400).json({ error: 'invalid' });
      }
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const key = `${PREFIX}${String(9999 - score).padStart(4, '0')}_${String(Math.round(time * 10)).padStart(4, '0')}_${name}_${char}_${id}.txt`;
      await put(key, '1', { access: 'public', addRandomSuffix: false, contentType: 'text/plain' });
      const best = await allEntries();
      // the board shows each name's best run; report where this run would place
      const rank = best.filter(e => e.score > score || (e.score === score && e.time < time)).length + 1;
      return res.status(200).json({ top: best.slice(0, TOP).map(pub), total: best.length, rank, id });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server' });
  }
}
