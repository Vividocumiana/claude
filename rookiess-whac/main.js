import { mount } from './scena.js';
const $ = (s) => [...document.querySelectorAll(s)];
const press = (group, b) => { group.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); };
const modes = $('[data-mode]'), dbg = $('[data-debug]');
modes.forEach((b) => b.addEventListener('click', () => { press(modes, b); document.body.dataset.mode = b.dataset.mode; }));
dbg.forEach((b) => b.addEventListener('click', () => press(dbg, b)));
const ref = document.getElementById('ref');
document.getElementById('ovr').addEventListener('input', (e) => { ref.style.opacity = e.target.value / 100; });
requestAnimationFrame(() => {
  window.__app = mount(document.getElementById('c'), {
    mode: modes, debug: dbg,
    labels: document.getElementById('labels'),
    onScore: (v) => { document.getElementById('score').textContent = v; },
    blur: document.getElementById('blur'),
    workerSrc: document.getElementById('worker-src')?.textContent,
    onStats: (all, done, total) => {
      document.getElementById('stats').textContent = (done < total ? `Preparo i personaggi… ${done}/${total}\n` : '') +
        Object.entries(all).map(([k, s]) =>
          `${k}: mesh ${s.meshMs} ms · luce ${s.bakeMs} ms · ${Math.round(s.tris / 1000)}k tri · bordi aperti ${Object.entries(s.open).map(([n, v]) => n + ' ' + v).join(', ')}`).join('\n');
    },
  });
});
