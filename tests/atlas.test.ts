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
    for (const f of data.features) assert.ok(ids.has(f.properties.id), f.properties.id);
  }
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
