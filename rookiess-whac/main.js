import { mount } from './personaggio.js';
window.__app = mount(document.getElementById('c'), {
  hit: document.querySelector('.hit'),
  bg: [...document.querySelectorAll('[data-bg]')],
});
