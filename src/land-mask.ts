import type { FeatureCollection, Position } from 'geojson';

export type LandPolygon = { rings: number[][][]; bounds: [number, number, number, number] };

/** Natural Earth's polygons are already split at the antimeridian. Project once
 * into normalized Web Mercator so imagery and coastlines share coordinates. */
export function projectLand(countries: FeatureCollection): LandPolygon[] {
  const project = ([longitude, latitude]: Position) => {
    const lat = Math.max(-85.05112878, Math.min(85.05112878, latitude)) * Math.PI / 180;
    return [(longitude + 180) / 360, (1 - Math.asinh(Math.tan(lat)) / Math.PI) / 2];
  };
  return countries.features.flatMap(feature => {
    const geometry = feature.geometry;
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
    return polygons.map(polygon => {
      const rings = polygon.map(ring => ring.map(project));
      const bounds: LandPolygon['bounds'] = [Infinity, Infinity, -Infinity, -Infinity];
      for (const [x, y] of rings[0]) {
        bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.min(bounds[1], y);
        bounds[2] = Math.max(bounds[2], x); bounds[3] = Math.max(bounds[3], y);
      }
      return { rings, bounds };
    });
  });
}

export function intersectsTile(bounds: LandPolygon['bounds'], z: number, x: number, y: number) {
  const scale = 2 ** z;
  return bounds[0] <= (x + 1) / scale && bounds[2] >= x / scale && bounds[1] <= (y + 1) / scale && bounds[3] >= y / scale;
}

export function createLandMask(countries: FeatureCollection) {
  const polygons = projectLand(countries).map(({ rings, bounds }) => {
    const path = new Path2D();
    for (const ring of rings) {
      ring.forEach(([x, y], index) => index === 0 ? path.moveTo(x, y) : path.lineTo(x, y));
      path.closePath();
    }
    return { path, bounds };
  });
  return (z: number, x: number, y: number, size: number) => {
    const mask = new OffscreenCanvas(size, size);
    const context = mask.getContext('2d');
    if (!context) throw new Error('Coastline mask unavailable');
    const scale = size * 2 ** z;
    context.setTransform(scale, 0, 0, scale, -x * size, -y * size);
    context.fillStyle = '#fff';
    // Fill polygons separately so neighboring/overlapping countries form a union.
    // Even-odd filling preserves inland-water holes and small offshore islands.
    for (const polygon of polygons) {
      if (intersectsTile(polygon.bounds, z, x, y)) context.fill(polygon.path, 'evenodd');
    }
    return mask;
  };
}
