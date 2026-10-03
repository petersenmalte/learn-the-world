import './style.css';
import './learning.css';
import { parseGameRoute } from './game-model';
import { mountOverview, mountGame, mountSources } from './learning';
const app = document.getElementById('app')!;
app.innerHTML = `<nav class="site-nav" aria-label="Hauptnavigation"><label class="sr-only" for="page-picker">Bereich auswählen</label><select id="page-picker"><option value="atlas">Atlas</option><option value="games">Lernen</option><option value="sources">Quellen & Regeln</option></select></nav><div id="page"></div>`;
const page = document.getElementById('page')!;
const picker = document.getElementById('page-picker') as HTMLSelectElement;
let dispose: (() => void) | undefined;
let generation = 0;
picker.onchange = () => { location.hash = `/${picker.value}`; };
async function route() {
  const current = ++generation;
  dispose?.(); dispose = undefined;
  const hash = location.hash;
  const atlas = !hash || hash === '#/atlas';
  document.body.classList.toggle('learning-page', !atlas);
  document.documentElement.lang = atlas ? 'en' : 'de';
  picker.value = atlas ? 'atlas' : hash === '#/sources' ? 'sources' : 'games';
  page.replaceChildren();
  document.title = `${atlas ? 'Atlas' : hash === '#/sources' ? 'Quellen & Regeln' : 'Lernen'} · Learn the World`;
  if (atlas) {
    page.innerHTML = '<p class="route-loading" role="status">Loading atlas…</p>';
    try {
      const [module, template] = await Promise.all([import('./atlas'), import('./atlas.html?raw')]);
      if (current !== generation) return;
      page.innerHTML = template.default;
      dispose = module.mountAtlas();
    } catch { if (current === generation) page.innerHTML = '<p class="route-loading" role="alert">Atlas unavailable. <a href="#/games">Open learning games</a> or reload.</p>'; }
  } else if (hash === '#/games') dispose = mountOverview(page);
  else if (hash === '#/sources') dispose = mountSources(page);
  else {
    const config = parseGameRoute(hash);
    if (config) dispose = mountGame(page, config);
    else page.innerHTML = '<main class="learning-content"><h1>Seite nicht gefunden</h1><a href="#/games">Zur Spielübersicht</a></main>';
  }
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', () => void route());
void route();
