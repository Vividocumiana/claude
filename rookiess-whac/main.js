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
    onStats: (s) => {
      const t = Object.values(s.tris).reduce((a, b) => a + b, 0);
      document.getElementById('stats').textContent =
        `mesh ${s.meshMs} ms · luce ${s.bakeMs} ms · ${Math.round(t / 1000)}k triangoli · bordi aperti: pelle ${s.open.skin}, beanie ${s.open.beanie}, maglia ${s.open.tee}`;
    },
  });
});
