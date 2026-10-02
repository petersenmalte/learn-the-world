import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { searchBucket, queryRows, fetchRows, visibleCells, sampleVisible, type Catalogue, type CompactPlace } from '../src/catalogue.ts';
const root = new URL('../public/data/', import.meta.url);
const catalogue: Catalogue = JSON.parse(readFileSync(new URL('catalogue.json', root), 'utf8'));
function lookup(query: string) {
  const text = gunzipSync(readFileSync(new URL(`catalogue/search/${searchBucket(query)}.ndjson.gz`, root))).toString();
  return queryRows(text.trim().split('\n').map(line => JSON.parse(line)), query, catalogue);
}
test('global catalogue substantially expands every physical category', () => {
  for (const [cat, min] of Object.entries({ mountains: 400000, ranges: 25000, volcanoes: 700, glaciers: 8000, seas: 200, rivers: 1000000, lakes: 300000, deserts: 300 })) {
    assert.ok(catalogue.counts[cat as keyof typeof catalogue.counts]! > min, `${cat} coverage regressed`);
  }
  assert.equal(Object.values(catalogue.counts).reduce((a, b) => a + b!, 0), catalogue.total);
});
test('all regional shards together contain exactly the advertised record counts', () => {
  const counts: Record<string, number> = {};
  for (const key of Object.keys(catalogue.files).filter(k => k.startsWith('map/'))) {
    const text = gunzipSync(readFileSync(new URL(`catalogue/${key}.ndjson.gz`, root))).toString();
    const count = text.split('\n').length - 1;
    const cat = key.split('/')[1].split('-')[0];
    counts[cat] = (counts[cat] || 0) + count;
  }
  assert.deepEqual(counts, catalogue.counts);
});
test('worldwide search finds features beyond the initial curated selection', () => {
  assert.ok(lookup('Krakatau').some(p => p.category === 'volcanoes'));
  assert.ok(lookup('Vatnajokull').some(p => p.category === 'glaciers'));
  assert.ok(lookup('Thames').some(p => p.category === 'rivers'));
  assert.ok(lookup('Zugspitze').some(p => p.category === 'mountains'));
  for (const ocean of ['Pacific', 'Atlantic', 'Indian', 'Arctic', 'Southern']) assert.ok(lookup(`${ocean} Ocean`).some(p => p.category === 'seas' && p.featureCode === 'OCN'), ocean);
});
test('prefix routing is case/diacritic tolerant and handles non-Latin characters', () => {
  assert.equal(searchBucket('VAtnajökull'), searchBucket('vatnajokull'));
  assert.equal(searchBucket('ßtest'), searchBucket('sstest'));
  assert.equal(searchBucket('  '), null);
  assert.equal(searchBucket('東京'), searchBucket('東京'));
  assert.ok(lookup('Atlantic Ocean').length > 0);
});
test('gzip loader supports compressed and server-decoded responses and propagates failures', async () => {
  const row: CompactPlace = [1, 'Test peak', 11, 47, 'AT', 'PK', 3, []];
  const encoded = JSON.stringify(row) + '\n';
  assert.deepEqual(await fetchRows('/data.gz', async () => new Response(gzipSync(encoded))), [row]);
  assert.deepEqual(await fetchRows('/data.gz', async () => new Response(encoded)), [row]);
  await assert.rejects(fetchRows('/data.gz', async () => new Response('', { status: 503 })), /503/);
  await assert.rejects(fetchRows('/data.gz', async () => new Response('[]')), /Invalid/);
});
test('regional detail wraps the dateline and samples labels without losing country metadata', () => {
  const bounds = { west: 170, east: 190, south: -10, north: 10 };
  const cells = visibleCells(bounds);
  assert.ok(cells.includes('23-5') && cells.includes('0-5'));
  const rows: CompactPlace[] = [[1, 'East', 175, 0, 'NZ', 'MT', 2, []], [2, 'West', -175, 0, 'NZ', 'MT', 3, []], [3, 'Outside', 0, 0, 'NZ', 'MT', 2, []]];
  const places = sampleVisible(rows, bounds, catalogue, 14);
  assert.equal(places.length, 2);
  assert.ok(places.every(p => p.region === catalogue.countries.NZ));
});
