import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSearch, normalize, labelThreshold, categories, type Place } from '../src/search.ts';
import { loadData } from '../src/data.ts';
const places: Place[] = JSON.parse(readFileSync(new URL('../public/data/places.json', import.meta.url), 'utf8'));
const search = createSearch(places);
test('search ignores case, accents and common non-decomposing letters', () => {
  assert.equal(search('reYKJavik')[0].name, 'Reykjavík');
  assert.equal(search('BRASILIA')[0].name, 'Brasília');
  assert.equal(normalize('Tórshavn, Łódź / Straße'), 'torshavn lodz strasse');
});
test('hidden categories and low-priority labels remain searchable', () => {
  assert.ok(search('Aletsch').some(p => p.category === 'glaciers'));
  assert.ok(search('everest').some(p => p.category === 'mountains'));
  assert.ok(search('Sahara').some(p => p.category === 'deserts'));
  const p = places.find(p => p.category === 'capitals' && p.minZoom > 2)!;
  assert.ok(search(p.name).some(result => result.id === p.id));
  assert.ok(labelThreshold(p, 390) > labelThreshold(p, 1440));
});
test('search ranks exact names first and handles empty/unknown queries', () => {
  assert.equal(search('Berlin')[0].name, 'Berlin');
  assert.deepEqual(search('    '), []);
  assert.deepEqual(search('zzzxxyynotaplace'), []);
  assert.ok(search('a').length <= 10);
});
test('all ten categories contain traceable locations with unique IDs', () => {
  assert.equal(new Set(places.map(p => p.id)).size, places.length);
  for (const cat of categories) assert.ok(places.some(p => p.category === cat.id), cat.id);
  for (const p of places) {
    assert.ok(p.coordinates.every(Number.isFinite), p.name);
    assert.ok(Math.abs(p.coordinates[0]) <= 180 && Math.abs(p.coordinates[1]) <= 90, p.name);
    assert.ok(p.sourceId && ['GeoNames', 'Natural Earth'].includes(p.source));
  }
});
test('coverage follows the declared snapshots and every shape has a search entry', () => {
  assert.equal(places.filter(p => p.category === 'countries').length, 242);
  assert.equal(places.filter(p => p.category === 'capitals').length, 241);
  assert.ok(places.filter(p => p.category === 'capitals').every(p => p.featureCode === 'PPLC'));
  const ids = new Set(places.map(p => p.id));
  for (const file of ['countries.geojson', 'physical.geojson']) {
    const data = JSON.parse(readFileSync(new URL(`../public/data/${file}`, import.meta.url), 'utf8'));
    // The sharper 10m boundaries include a few tiny or disputed units that are drawn but not listed.
    for (const f of data.features) assert.ok(ids.has(f.properties.id) || f.properties.unlabelled, f.properties.id);
  }
});
test('the atlas keeps only the best-known rivers, lakes, mountains and other physical features', () => {
  const count = (cat: string) => places.filter(p => p.category === cat).length;
  // Per-country quotas plus world-famous features: a few hundred each, never thousands.
  for (const [cat, max] of Object.entries({ rivers: 400, lakes: 250, mountains: 450, ranges: 150, volcanoes: 80, glaciers: 60, deserts: 50, seas: 150 })) {
    assert.ok(count(cat) >= 15 && count(cat) <= max, `${cat}: ${count(cat)}`);
  }
  assert.ok(places.length < 2500, `${places.length} places`);
  for (const [query, category] of Object.entries({ Nile: 'rivers', Amazon: 'rivers', Danube: 'rivers', Rhine: 'rivers', Rhein: 'rivers', Mississippi: 'rivers', 'Lake Victoria': 'lakes', 'Lake Baikal': 'lakes', 'Lake Constance': 'lakes', 'Mount Everest': 'mountains', 'Mont Blanc': 'mountains', Zugspitze: 'mountains', Aconcagua: 'mountains', 'Mount Fuji': 'volcanoes', Vesuvius: 'volcanoes', Alps: 'ranges', Himalayas: 'ranges', Sahara: 'deserts', 'Pacific Ocean': 'seas' })) {
    assert.ok(search(query).some(p => p.category === category), `${query} should be a ${category} result`);
  }
  // Obscure local records from the old worldwide catalogue are gone.
  assert.deepEqual(search('Tretterbaach'), []);
});
test('selection thresholds keep labels progressive: famous features appear before local ones', () => {
  const zoom = (name: string) => places.find(p => p.name === name)!.minZoom;
  assert.ok(zoom('Nile') < zoom('Rhine'));
  assert.ok(zoom('Mount Everest') < zoom('Zugspitze'));
  for (const p of places) assert.ok(Number.isFinite(p.minZoom) && p.minZoom >= 0 && p.minZoom <= 6, p.name);
});
test('data loader resolves all assets under the repository base path', async () => {
  const urls: string[] = [];
  const fetcher: typeof fetch = async url => {
    urls.push(String(url));
    const file = String(url).split('/').pop();
    return new Response(readFileSync(new URL(`../public/data/${file}`, import.meta.url), 'utf8'));
  };
  const data = await loadData('/learn-the-world/', fetcher);
  assert.equal(data.places.length, places.length);
  assert.ok(urls.every(url => url.startsWith('/learn-the-world/data/')));
});
test('data loader rejects HTTP errors, malformed data and failed connections', async () => {
  await assert.rejects(loadData('/repo/', async () => new Response('', { status: 404 })), /404/);
  await assert.rejects(loadData('/repo/', async () => new Response('{}')), /invalid/);
  await assert.rejects(loadData('/repo/', async () => { throw new Error('Offline'); }), /Offline/);
});
