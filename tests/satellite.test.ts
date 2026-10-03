import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maskLandsatNoData, loadLandsatTile } from '../src/satellite';

test('Landsat no-data pixels reveal the underlying map without masking colored dark water', () => {
  const pixels = new Uint8ClampedArray([0, 0, 0, 255, 8, 7, 6, 255, 14, 12, 10, 255, 0, 10, 40, 255, 65, 120, 50, 255]);
  maskLandsatNoData(pixels);
  assert.deepEqual([...pixels], [0, 0, 0, 0, 8, 7, 6, 0, 14, 12, 10, 128, 0, 10, 40, 255, 65, 120, 50, 255]);
});

test('Landsat loading rejects malformed paths without a network request', async () => {
  await assert.rejects(loadLandsatTile({ url: 'landsat://unexpected/path' }, new AbortController()), /Invalid satellite tile/);
});

test('Landsat service errors are propagated for the map fallback and retry', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('unavailable', { status: 503 }));
  await assert.rejects(loadLandsatTile({ url: 'landsat://9/171/267' }, new AbortController()), /503/);
});
