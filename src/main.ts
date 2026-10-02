import './style.css';
import { categories, createSearch, type Place, type Category } from './search';
import { createGlobe } from './globe';
import { loadData, loadShapes } from './data';
import { createCatalogueClient } from './catalogue-client';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const input = $<HTMLInputElement>('search');
const results = $('results');
const panel = $('search-panel');
const status = $('map-status');
const enabled = new Set<Category>(['countries', 'capitals']);
let atlas: ReturnType<typeof createGlobe> | undefined;
let search: ReturnType<typeof createSearch>;
let catalogue: ReturnType<typeof createCatalogueClient>;
let searchVersion = 0;
let detailVersion = 0;
let searchTimer: ReturnType<typeof setTimeout>;
let matches: Place[] = [];
let active = -1;
let ready = false;
let failed = false;
let shapeRequest: Promise<void> | undefined;
function ensureShapes() {
  if (!shapeRequest) shapeRequest = loadShapes(import.meta.env.BASE_URL).then(shapes => { atlas?.setPhysical(shapes); }).catch(() => {
    shapeRequest = undefined;
    $('detail-status').textContent = 'Some outlines could not load. Toggle a layer to retry.';
  });
  return shapeRequest;
}
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
function closeSearch() { searchVersion++; clearTimeout(searchTimer); panel.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; }
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
  $('selection-category').textContent = (['OCN', 'ocean'].includes(place.featureCode || '') ? 'OCEAN' : cat.singular.toUpperCase());
  $('selection-name').textContent = place.name;
  $('selection-region').textContent = place.region;
  $('selection-coords').textContent = formatCoords(place.coordinates);
  const source = $<HTMLAnchorElement>('selection-source');
  source.textContent = `${place.source} ↗`;
  source.href = place.source === 'GeoNames' ? `https://www.geonames.org/${place.sourceId}/` : 'https://github.com/petersenmalte/learn-the-world/blob/main/data/SOURCES.md';
  $('selection').hidden = false;
  atlas.select(place);
  if (place.source === 'Natural Earth' && place.category !== 'countries') void ensureShapes();
}
function renderResults() {
  if (!ready) return;
  clearTimeout(searchTimer);
  const version = ++searchVersion;
  const query = input.value;
  if (!query.trim()) { closeSearch(); return; }
  matches = search(query);
  panel.hidden = false; input.setAttribute('aria-expanded', 'true');
  paintResults('Searching worldwide…');
  searchTimer = setTimeout(async () => {
    try {
      const globalMatches = await catalogue.search(query);
      if (version !== searchVersion) return;
      const merged = new Map([...matches, ...globalMatches].map(p => [p.id, p]));
      matches = createSearch([...merged.values()])(query);
      // Worldwide word-prefix matching also handles omitted words such as "Mount".
      if (!matches.length) matches = globalMatches.slice(0, 10);
      paintResults(matches.length ? `${matches.length === 10 ? 'Top 10' : matches.length} results · worldwide` : 'No places found. Try the start of a place name or an alternate name.');
    } catch {
      if (version !== searchVersion) return;
      paintResults('Worldwide search unavailable. Showing overview matches. Type again to retry.');
    }
  }, 200);
}
function paintResults(message: string) {
  results.replaceChildren();
  $('result-status').textContent = message;
  matches.forEach((p, index) => {
    const item = document.createElement('li'); item.id = `result-${index}`; item.setAttribute('role', 'option'); item.setAttribute('aria-selected', 'false');
    item.textContent = p.name;
    const meta = document.createElement('small'); meta.textContent = `${categories.find(c => c.id === p.category)!.singular} · ${p.region}`;
    item.append(meta); item.addEventListener('mousedown', e => e.preventDefault()); item.addEventListener('click', () => select(p)); results.append(item);
  });
  setActive(-1);
}
async function refreshDetails() {
  if (!ready || !atlas) return;
  const version = ++detailVersion;
  const active = [...enabled].filter(cat => ['mountains', 'ranges', 'rivers', 'lakes'].includes(cat));
  if (atlas.map.getZoom() < 4 || !active.length) {
    atlas.setDetails([]);
    $('detail-status').textContent = active.length ? 'Zoom in for local names · every place is searchable' : '';
    return;
  }
  const b = atlas.map.getBounds();
  $('detail-status').textContent = 'Loading local names…';
  try {
    const places = await catalogue.map({ west: b.getWest(), east: b.getEast(), south: b.getSouth(), north: b.getNorth() }, active, innerWidth < 761 ? 14 : 22);
    if (version !== detailVersion) return;
    atlas.setDetails(places);
    $('detail-status').textContent = 'Local names loaded · zoom in to reveal more';
  } catch {
    if (version !== detailVersion) return;
    $('detail-status').textContent = 'Local names unavailable. Move or zoom to retry; search is still available.';
  }
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
  if (event.key === '/' && event.target !== input) { event.preventDefault(); input.focus(); }
  if (event.key === 'Escape') closeLayers();
});
$('close-selection').onclick = () => { $('selection').hidden = true; atlas?.clear(); };
$('zoom-in').onclick = () => atlas?.map.zoomIn();
$('zoom-out').onclick = () => atlas?.map.zoomOut();
$('reset').onclick = () => { atlas?.reset(); atlas?.clear(); $('selection').hidden = true; input.value = ''; closeSearch(); };
async function boot() {
  // MapLibre v6 requires WebGL2. Release the probe context before creating the real map.
  const probe = document.createElement('canvas');
  const gl = probe.getContext('webgl2');
  if (!gl) { showError('This browser can’t display the globe', 'The atlas needs WebGL2 graphics. Try an up-to-date Safari, Chrome, Firefox, or Edge with hardware acceleration enabled.'); return; }
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  try {
    const data = await loadData(import.meta.env.BASE_URL);
    search = createSearch(data.places);
    catalogue = createCatalogueClient(data.catalogue, import.meta.env.BASE_URL);
    for (const cat of categories) {
      const label = document.createElement('label'); label.className = 'layer';
      const icon = document.createElement('span'); icon.className = 'layer-icon'; icon.textContent = cat.icon; icon.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span'); name.className = 'layer-name'; name.textContent = cat.name;
      const count = document.createElement('span'); count.className = 'layer-count'; count.textContent = (data.catalogue.counts[cat.id] ?? data.places.filter(p => p.category === cat.id).length).toLocaleString(); count.setAttribute('aria-hidden', 'true'); count.title = 'GeoNames records where available; additional Natural Earth map features are also shown.';
      const check = document.createElement('input'); check.type = 'checkbox'; check.checked = enabled.has(cat.id); check.disabled = true; check.setAttribute('aria-label', cat.name);
      check.onchange = () => { if (!ready) return; check.checked ? enabled.add(cat.id) : enabled.delete(cat.id); atlas?.toggle(cat.id, check.checked); $('active-count').textContent = String(enabled.size); if (check.checked && ['ranges', 'rivers', 'seas', 'lakes', 'deserts'].includes(cat.id)) void ensureShapes(); void refreshDetails(); };
      label.append(icon, name, count, check); $(['countries', 'capitals'].includes(cat.id) ? 'political-layers' : 'natural-layers').append(label);
    }
    atlas = createGlobe(data, select, message => showError('A small detour', message));
    const coordinates = $('coordinates');
    atlas.map.on('mousemove', event => {
      if (!atlas!.map._camera.transform.isPointOnMapSurface(event.point)) { coordinates.hidden = true; return; }
      coordinates.textContent = formatCoords([((event.lngLat.lng + 540) % 360) - 180, event.lngLat.lat]);
      coordinates.hidden = false;
      const width = atlas!.map.getContainer().clientWidth;
      const height = atlas!.map.getContainer().clientHeight;
      coordinates.style.left = `${event.point.x + coordinates.offsetWidth + 28 > width ? event.point.x - coordinates.offsetWidth - 14 : event.point.x + 14}px`;
      coordinates.style.top = `${event.point.y + coordinates.offsetHeight + 28 > height ? event.point.y - coordinates.offsetHeight - 14 : event.point.y + 14}px`;
    });
    atlas.map.on('mouseout', () => { coordinates.hidden = true; });
    const timeout = window.setTimeout(() => { if (!ready) showError('The globe is taking too long', 'Check your connection, then reload the atlas.'); }, 30000);
    atlas.map.on('load', () => {
      clearTimeout(timeout);
      if (failed) return;
      ready = true; status.hidden = true; input.disabled = false;
      ['zoom-in', 'zoom-out', 'reset'].forEach(id => { $<HTMLButtonElement>(id).disabled = false; });
      document.querySelectorAll<HTMLInputElement>('.layer input').forEach(el => { el.disabled = false; });
    });
    atlas.map.on('moveend', () => { void refreshDetails(); });
  } catch (error) { console.error(error); showError('We couldn’t open the atlas', error instanceof Error ? error.message : 'Check your connection and reload to try again.'); }
}
void boot();
