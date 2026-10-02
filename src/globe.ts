import { Map, Point as ScreenPoint, setWorkerUrl, type FilterSpecification, type StyleSpecification, type GeoJSONSource } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { FeatureCollection, Geometry, Point, LineString } from 'geojson';
import { categories, labelThreshold, type Place, type Category } from './search';
import type { AtlasData } from './data';
setWorkerUrl(workerUrl);
function graticule(): FeatureCollection<LineString> {
  const lines: number[][][] = [];
  for (let lng = -180; lng < 180; lng += 30) lines.push(Array.from({ length: 171 }, (_, i) => [lng, i - 85]));
  for (let lat = -60; lat <= 60; lat += 30) lines.push(Array.from({ length: 361 }, (_, i) => [i - 180, lat]));
  return { type: 'FeatureCollection', features: lines.map(coordinates => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } })) };
}
export function createGlobe(data: AtlasData, onSelect: (place: Place) => void, onError: (message: string) => void) {
  const width = document.querySelector('#map')!.clientWidth;
  const makePoints = (places: Place[]): FeatureCollection<Point> => ({ type: 'FeatureCollection', features: places.map(p => ({ type: 'Feature', properties: { id: p.id, name: p.name, category: p.category, rank: p.rank, minZoom: labelThreshold(p, document.querySelector('#map')!.clientWidth) }, geometry: { type: 'Point', coordinates: p.coordinates } })) });
  let physical = data.physical;
  let selectedPlace: Place | undefined;
  let points = makePoints(data.places);
  const empty: FeatureCollection<Geometry> = { type: 'FeatureCollection', features: [] };
  const style: StyleSpecification = {
    version: 8, projection: { type: 'globe' },
    sources: {
      // Background geometry is independent of all learning labels and category visibility.
      basemap: { type: 'geojson', data: data.countries, tolerance: 0.6 },
      graticule: { type: 'geojson', data: graticule() },
      learning: { type: 'geojson', data: points },
      physical: { type: 'geojson', data: data.physical, tolerance: 0.6 },
      selected: { type: 'geojson', data: empty },
      'selected-shape': { type: 'geojson', data: empty },
    },
    layers: [
      { id: 'ocean', type: 'background', paint: { 'background-color': '#0a56b3' } },
      { id: 'graticule', type: 'line', source: 'graticule', paint: { 'line-color': '#ffffff', 'line-width': 0.5, 'line-opacity': 0.22 } },
      { id: 'land', type: 'fill', source: 'basemap', paint: { 'fill-color': ['match', ['get', 'tone'], 1, '#7ccb5f', 2, '#f3d34c', 3, '#f59a4a', 4, '#ee7691', 5, '#a487e0', 6, '#42c4b8', '#c8e05a'], 'fill-opacity': 1 } },
      { id: 'borders', type: 'line', source: 'basemap', paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 5, 1.1, 9, 2], 'line-opacity': 0.9 } },
      { id: 'selection-fill', type: 'fill', source: 'selected-shape', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.4 } },
      { id: 'selection-outline', type: 'line', source: 'selected-shape', paint: { 'line-color': '#ffffff', 'line-width': 2.5 } },
    ],
  };
  for (const cat of categories) {
    const filter: FilterSpecification = ['==', ['get', 'category'], cat.id];
    const visibility = cat.id === 'countries' || cat.id === 'capitals' ? 'visible' : 'none';
    if (['ranges', 'deserts', 'lakes', 'seas', 'rivers'].includes(cat.id)) {
      style.layers.push({ id: `${cat.id}-area`, type: 'fill', source: 'physical', filter: ['all', filter, ['==', ['geometry-type'], 'Polygon']], layout: { visibility }, paint: { 'fill-color': cat.color, 'fill-opacity': cat.id === 'lakes' ? 0.95 : cat.id === 'seas' ? 0.1 : 0.14 } });
      style.layers.push({ id: `${cat.id}-line`, type: 'line', source: 'physical', filter, layout: { visibility }, paint: { 'line-color': cat.color, 'line-width': cat.id === 'rivers' ? ['interpolate', ['linear'], ['zoom'], 2, 1.4, 8, 3] : 1.4, 'line-opacity': cat.id === 'rivers' ? 1 : 0.9 } });
    }
    if (cat.id !== 'countries') style.layers.push({ id: `${cat.id}-dots`, type: 'circle', source: 'learning', minzoom: cat.id === 'capitals' ? 0 : 1.5, filter: ['all', filter, ['>=', ['zoom'], ['get', 'minZoom']]], layout: { visibility }, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 2, 5, 3.6, 9, 5], 'circle-color': cat.color, 'circle-stroke-color': cat.id === 'capitals' ? '#000000' : '#ffffff', 'circle-stroke-width': 1.3 } });
    style.layers.push({
      id: `${cat.id}-labels`, type: 'symbol', source: 'learning', filter: ['all', filter, ['>=', ['zoom'], ['get', 'minZoom']]], layout: {
        visibility, 'text-field': ['get', 'name'], 'text-font': ['Arial', 'Helvetica', 'sans-serif'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 0, cat.id === 'countries' ? 11 : 10, 5, cat.id === 'countries' ? 16 : 13, 9, cat.id === 'countries' ? 24 : 16],
        'text-transform': cat.id === 'countries' ? 'uppercase' : 'none', 'text-letter-spacing': cat.id === 'countries' ? 0.07 : 0,
        'text-max-width': 9, 'text-padding': width < 600 ? 9 : 5,
        'text-variable-anchor': cat.id === 'countries' ? ['center'] : ['top', 'bottom', 'left', 'right'], 'text-radial-offset': cat.id === 'countries' ? 0 : 0.65,
        'symbol-sort-key': ['get', 'rank'], 'text-allow-overlap': false,
      }, paint: { 'text-color': cat.id === 'countries' ? '#0c1f33' : '#ffffff', 'text-halo-color': cat.id === 'countries' ? 'rgba(255,255,255,0.7)' : '#0b2540', 'text-halo-width': cat.id === 'countries' ? 1 : 1.6, 'text-halo-blur': 0.3 },
    });
  }
  // Reserve space for country names before placing secondary labels.
  const countryLabels = style.layers.find(layer => layer.id === 'countries-labels')!;
  style.layers = style.layers.filter(layer => layer.id !== 'countries-labels');
  style.layers.push(countryLabels);
  style.layers.push(
    { id: 'selected-ring', type: 'circle', source: 'selected', paint: { 'circle-radius': 12, 'circle-color': '#ffffff', 'circle-opacity': 0.25, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2.5 } },
    { id: 'selected-dot', type: 'circle', source: 'selected', paint: { 'circle-radius': 4.5, 'circle-color': '#ffffff', 'circle-stroke-color': '#000000', 'circle-stroke-width': 1.5 } },
    { id: 'selected-label', type: 'symbol', source: 'selected', layout: { 'text-field': ['get', 'name'], 'text-font': ['Arial', 'Helvetica', 'sans-serif'], 'text-size': 15, 'text-anchor': 'bottom', 'text-offset': [0, -1.1], 'text-allow-overlap': true }, paint: { 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 2 } },
  );
  const home = () => ({ center: [15, 20] as [number, number], zoom: Math.max(-0.2, Math.min(2.6, Math.log2(Math.min(document.querySelector('#map')!.clientWidth * 0.84, document.querySelector('#map')!.clientHeight * 0.81) / 164))), bearing: 0, pitch: 0 });
  const map = new Map({ container: 'map', style, ...home(), minZoom: -0.5, maxZoom: 10, maxPitch: 0, pixelRatio: Math.min(3, Math.max(2, window.devicePixelRatio || 1)), attributionControl: false, canvasContextAttributes: { antialias: true }, renderWorldCopies: false });
  map.on('error', event => { console.error(event.error); onError('The globe could not finish rendering. Reload to try again.'); });
  map.on('webglcontextlost', () => onError('The browser paused the globe’s graphics. Reload to restore the atlas.'));
  const byId = new globalThis.Map(data.places.map(p => [p.id, p]));
  map.on('click', event => {
    const features = map.queryRenderedFeatures(event.point, { layers: categories.flatMap(c => [`${c.id}-labels`, ...(c.id === 'countries' ? [] : [`${c.id}-dots`])]) });
    const place = byId.get(features[0]?.properties.id);
    if (place) onSelect(place);
  });
  map.on('mousemove', event => {
    map.getCanvas().style.cursor = map.queryRenderedFeatures(event.point, { layers: categories.map(c => `${c.id}-labels`) }).length ? 'pointer' : '';
  });
  // Labels near the horizon would spill onto the black page. Clip the canvas to the visible disc so they run out at the edge, like on a real sphere.
  const container = map.getContainer();
  const onSurface = (x: number, y: number) => map._camera.transform.isPointOnMapSurface(new ScreenPoint(x, y));
  const reach = (x: number, y: number, dx: number, dy: number, max: number) => {
    if (onSurface(x + dx * max, y + dy * max)) return Infinity;
    let near = 0, far = max;
    for (let i = 0; i < 14; i++) { const mid = (near + far) / 2; if (onSurface(x + dx * mid, y + dy * mid)) near = mid; else far = mid; }
    return near;
  };
  let clip = '';
  const fitLimb = () => {
    const w = container.clientWidth, h = container.clientHeight, sx = w / 2, sy = h / 2, max = Math.hypot(w, h) * 2;
    let next = '';
    if (onSurface(sx, sy)) {
      const right = reach(sx, sy, 1, 0, max), left = reach(sx, sy, -1, 0, max);
      if (Number.isFinite(right + left)) {
        const cx = sx + (right - left) / 2, down = reach(cx, sy, 0, 1, max), up = reach(cx, sy, 0, -1, max);
        if (Number.isFinite(down + up)) next = `circle(${(down + up) / 2 + 0.5}px at ${cx}px ${sy + (down - up) / 2}px)`;
      }
    }
    if (next !== clip) { clip = next; container.style.clipPath = next; }
  };
  map.on('render', fitLimb);
  let narrow = width < 600;
  map.on('resize', () => {
    const next = map.getContainer().clientWidth < 600;
    if (next === narrow) return;
    narrow = next;
    points = makePoints(data.places);
    (map.getSource('learning') as GeoJSONSource).setData(points);
    categories.forEach(c => map.setLayoutProperty(`${c.id}-labels`, 'text-padding', next ? 9 : 5));
  });
  return {
    map,
    setPhysical(shapes: FeatureCollection) {
      physical = shapes;
      (map.getSource('physical') as GeoJSONSource).setData(physical);
      if (selectedPlace) (map.getSource('selected-shape') as GeoJSONSource).setData({ type: 'FeatureCollection', features: [...data.countries.features, ...physical.features].filter(f => f.properties?.id === selectedPlace!.id) });
    },
    toggle(category: Category, enabled: boolean) {
      for (const suffix of ['area', 'line', 'dots', 'labels']) if (map.getLayer(`${category}-${suffix}`)) map.setLayoutProperty(`${category}-${suffix}`, 'visibility', enabled ? 'visible' : 'none');
      // Country borders and land remain part of the independent basemap.
    },
    select(place: Place) {
      selectedPlace = place;
      (map.getSource('selected') as GeoJSONSource).setData({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: place.name }, geometry: { type: 'Point', coordinates: place.coordinates } }] });
      const shapes = [...data.countries.features, ...physical.features].filter(f => f.properties?.id === place.id);
      (map.getSource('selected-shape') as GeoJSONSource).setData({ type: 'FeatureCollection', features: shapes });
      map.flyTo({ center: place.coordinates, zoom: place.category === 'countries' ? 3.5 : ['seas', 'ranges', 'deserts', 'rivers'].includes(place.category) ? 4.2 : ['lakes', 'glaciers'].includes(place.category) ? 5.5 : 6.5, duration: 1600, offset: [0, -45], essential: false });
    },
    clear() { selectedPlace = undefined; (map.getSource('selected') as GeoJSONSource).setData(empty); (map.getSource('selected-shape') as GeoJSONSource).setData(empty); },
    reset() { map.flyTo({ ...home(), offset: [0, 0], duration: 1200 }); },
  };
}
