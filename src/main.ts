import './style.css';
import { categories, createSearch, type Place, type Category } from './search';
import { createGlobe } from './globe';
import { loadData } from './data';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const input = $<HTMLInputElement>('search');
const results = $('results');
const panel = $('search-panel');
const status = $('map-status');
const enabled = new Set<Category>(['countries', 'capitals']);
let atlas: ReturnType<typeof createGlobe> | undefined;
let search: ReturnType<typeof createSearch>;
let matches: Place[] = [];
let active = -1;
let ready = false;
let failed = false;
function showError(title: string, message: string) {
  failed = true; ready = false;
  status.replaceChildren();
  status.hidden = false;
  status.setAttribute('role', 'alert');
  const h = document.createElement('h2'); h.textContent = title;
  const p = document.createElement('p'); p.textContent = message;
  const button = document.createElement('button'); button.textContent = 'Reload atlas'; button.onclick = () => location.reload();
  status.append(h, p, button);
  input.disabled = true;
  ['zoom-in', 'zoom-out', 'reset'].forEach(id => { $<HTMLButtonElement>(id).disabled = true; });
  document.querySelectorAll<HTMLInputElement>('.layer input').forEach(el => { el.disabled = true; });
}
function closeSearch() { panel.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; }
function setActive(index: number) {
  active = index;
  [...results.children].forEach((el, i) => el.setAttribute('aria-selected', String(i === active)));
  if (index >= 0) { input.setAttribute('aria-activedescendant', `result-${index}`); results.children[index]?.scrollIntoView({ block: 'nearest' }); }
  else input.removeAttribute('aria-activedescendant');
}
function formatCoords([lng, lat]: [number, number]) { return `${Math.abs(lat).toFixed(1)}° ${lat < 0 ? 'S' : 'N'}  ·  ${Math.abs(lng).toFixed(1)}° ${lng < 0 ? 'W' : 'E'}`; }
function select(place: Place) {
  if (!atlas || !ready) return;
  closeSearch(); input.value = place.name; input.blur();
  const cat = categories.find(c => c.id === place.category)!;
  $('selection-category').textContent = cat.singular.toUpperCase() + (['countries', 'capitals'].includes(cat.id) ? '' : ' · SELECTED FEATURES');
  $('selection-name').textContent = place.name;
  $('selection-region').textContent = place.region;
  $('selection-coords').textContent = formatCoords(place.coordinates);
  const source = $<HTMLAnchorElement>('selection-source');
  source.textContent = `${place.source} ↗`;
  source.href = place.source === 'GeoNames' ? `https://www.geonames.org/${place.sourceId}/` : 'https://github.com/petersenmalte/learn-the-world/blob/main/data/SOURCES.md';
  $('selection').hidden = false;
  atlas.select(place);
}
function renderResults() {
  if (!ready) return;
  matches = search(input.value);
  results.replaceChildren();
  if (!input.value.trim()) { closeSearch(); return; }
  panel.hidden = false; input.setAttribute('aria-expanded', 'true');
  $('result-status').textContent = matches.length ? `${matches.length === 10 ? 'Top 10' : matches.length} results · all layers` : 'No places found. Try another name or spelling.';
  matches.forEach((p, index) => {
    const item = document.createElement('li'); item.id = `result-${index}`; item.setAttribute('role', 'option'); item.setAttribute('aria-selected', 'false');
    item.textContent = p.name;
    const meta = document.createElement('small'); meta.textContent = `${categories.find(c => c.id === p.category)!.singular} · ${p.region}`;
    item.append(meta); item.addEventListener('mousedown', e => e.preventDefault()); item.addEventListener('click', () => select(p)); results.append(item);
  });
  setActive(-1);
}
input.addEventListener('input', renderResults);
input.addEventListener('focus', renderResults);
input.addEventListener('keydown', event => {
  if (event.key === 'Escape') { closeSearch(); event.preventDefault(); }
  if (event.key === 'ArrowDown' && matches.length) { event.preventDefault(); if (panel.hidden) renderResults(); setActive((active + 1) % matches.length); }
  if (event.key === 'ArrowUp' && matches.length) { event.preventDefault(); setActive(active <= 0 ? matches.length - 1 : active - 1); }
  if (event.key === 'Enter' && matches.length && !panel.hidden) { event.preventDefault(); select(matches[Math.max(0, active)]); }
});
document.addEventListener('pointerdown', event => { if (!(event.target as Element).closest('.search-wrap')) closeSearch(); });
function closeLayers() { $('layers').classList.remove('open'); $('layers-toggle').setAttribute('aria-expanded', 'false'); }
$('layers-toggle').onclick = () => { const open = $('layers').classList.toggle('open'); $('layers-toggle').setAttribute('aria-expanded', String(open)); };
$('close-layers').onclick = () => { closeLayers(); $('layers-toggle').focus(); };
document.addEventListener('keydown', event => {
  if (event.key === '/' && event.target !== input && !$<HTMLDialogElement>('about').open) { event.preventDefault(); input.focus(); }
  if (event.key === 'Escape') closeLayers();
});
$('close-selection').onclick = () => { $('selection').hidden = true; atlas?.clear(); };
$('zoom-in').onclick = () => atlas?.map.zoomIn();
$('zoom-out').onclick = () => atlas?.map.zoomOut();
$('reset').onclick = () => { atlas?.reset(); atlas?.clear(); $('selection').hidden = true; input.value = ''; closeSearch(); };
$('about-button').onclick = () => $<HTMLDialogElement>('about').showModal();
$('close-about').onclick = () => $<HTMLDialogElement>('about').close();
$<HTMLDialogElement>('about').addEventListener('click', event => { if (event.target === event.currentTarget) { const rect = (event.currentTarget as HTMLElement).getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $<HTMLDialogElement>('about').close(); } });
async function boot() {
  // MapLibre v6 requires WebGL2. Release the probe context before creating the real map.
  const probe = document.createElement('canvas');
  const gl = probe.getContext('webgl2');
  if (!gl) { showError('This browser can’t display the globe', 'The atlas needs WebGL2 graphics. Try an up-to-date Safari, Chrome, Firefox, or Edge with hardware acceleration enabled.'); return; }
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  try {
    const data = await loadData(import.meta.env.BASE_URL);
    search = createSearch(data.places);
    for (const cat of categories) {
      const label = document.createElement('label'); label.className = 'layer'; label.style.setProperty('--layer-color', cat.color);
      const icon = document.createElement('span'); icon.className = 'layer-icon'; icon.textContent = cat.icon; icon.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span'); name.className = 'layer-name'; name.textContent = cat.name;
      const count = document.createElement('span'); count.className = 'layer-count'; count.textContent = String(data.places.filter(p => p.category === cat.id).length); count.setAttribute('aria-hidden', 'true');
      const check = document.createElement('input'); check.type = 'checkbox'; check.checked = enabled.has(cat.id); check.disabled = true; check.setAttribute('aria-label', cat.name);
      check.onchange = () => { if (!ready) return; check.checked ? enabled.add(cat.id) : enabled.delete(cat.id); atlas?.toggle(cat.id, check.checked); $('active-count').textContent = String(enabled.size); };
      label.append(icon, name, count, check); $(['countries', 'capitals'].includes(cat.id) ? 'political-layers' : 'natural-layers').append(label);
    }
    atlas = createGlobe(data, select, message => showError('A small detour', message));
    const timeout = window.setTimeout(() => { if (!ready) showError('The globe is taking too long', 'Check your connection, then reload the atlas.'); }, 30000);
    atlas.map.on('load', () => {
      clearTimeout(timeout);
      if (failed) return;
      ready = true; status.hidden = true; input.disabled = false;
      ['zoom-in', 'zoom-out', 'reset'].forEach(id => { $<HTMLButtonElement>(id).disabled = false; });
      document.querySelectorAll<HTMLInputElement>('.layer input').forEach(el => { el.disabled = false; });
    });
    atlas.map.on('moveend', () => { const c = atlas!.map.getCenter(); $('coordinates').textContent = formatCoords([((c.lng + 540) % 360) - 180, c.lat]); });
  } catch (error) { console.error(error); showError('We couldn’t open the atlas', error instanceof Error ? error.message : 'Check your connection and reload to try again.'); }
}
void boot();
