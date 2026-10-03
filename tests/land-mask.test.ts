import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { projectLand, intersectsTile } from '../src/land-mask';
import type { FeatureCollection } from 'geojson';

const countries: FeatureCollection = JSON.parse(readFileSync(new URL('../public/data/countries.geojson', import.meta.url), 'utf8'));
const land = projectLand(countries);
const projectedPoint = (longitude: number, latitude: number) => [(longitude + 180) / 360, (1 - Math.asinh(Math.tan(latitude * Math.PI / 180)) / Math.PI) / 2];
function onLand(longitude: number, latitude: number) {
  const [x, y] = projectedPoint(longitude, latitude);
  return land.some(({ rings }) => {
    let inside = false;
    for (const ring of rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [ax, ay] = ring[i], [bx, by] = ring[j];
        if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
      }
    }
    return inside;
  });
}

test('North Sea scene strips are masked while Denmark, Britain and Norway remain visible', () => {
  for (const point of [[3, 56], [0, 58], [7, 57.5]]) assert.equal(onLand(...point as [number, number]), false);
  // Use inland points: generalized 1:10m coastlines do not resolve city harbors.
  for (const point of [[9, 56], [-2, 54], [10.75, 59.91], [12, 55.5]]) assert.equal(onLand(...point as [number, number]), true, `Expected land at ${point}`);
});

test('coastline projection stays finite at the poles and tile filtering matches XYZ coordinates', () => {
  assert.ok(land.every(p => p.rings.every(r => r.every(c => c.every(Number.isFinite)))));
  assert.equal(intersectsTile([0.1, 0.1, 0.2, 0.2], 1, 0, 0), true);
  assert.equal(intersectsTile([0.1, 0.1, 0.2, 0.2], 1, 1, 1), false);
});
