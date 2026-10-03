import { Map, Point as ScreenPoint, setWorkerUrl, type FilterSpecification, type StyleSpecification, type GeoJSONSource, type RasterTileSource } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { FeatureCollection, Geometry, Point } from 'geojson';
import { categories, labelThreshold, type Place, type Category } from './search';
import type { AtlasData } from './data';
import { GIBS, registerSatelliteProtocol } from './satellite';
setWorkerUrl(workerUrl);
registerSatelliteProtocol();
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
      earth: { type: 'raster', tiles: [`${new URL(import.meta.env.BASE_URL, window.location.origin).href}earth/{z}/{x}/{y}.webp`], tileSize: 512, minzoom: 0, maxzoom: 3, attribution: 'NASA Blue Marble' },
      'earth-regional': { type: 'raster', tiles: [`${GIBS}/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg`], tileSize: 256, minzoom: 3, maxzoom: 8, attribution: 'NASA GIBS / Blue Marble' },
      'earth-detail': { type: 'raster', tiles: ['landsat://{z}/{y}/{x}'], tileSize: 256, minzoom: 6, maxzoom: 12, bounds: [-180, -60, 180, 80], attribution: 'NASA GIBS / Landsat WELD' },
      learning: { type: 'geojson', data: points },
      physical: { type: 'geojson', data: data.physical, tolerance: 0.6 },
      selected: { type: 'geojson', data: empty },
      'selected-shape': { type: 'geojson', data: empty },
    },
    layers: [
      { id: 'ocean', type: 'background', paint: { 'background-color': '#063273' } },
      { id: 'land', type: 'fill', source: 'basemap', paint: { 'fill-color': '#548864' } },
      { id: 'earth-surface', type: 'raster', source: 'earth', paint: { 'raster-saturation': 0.22, 'raster-brightness-min': 0.025, 'raster-brightness-max': 1, 'raster-contrast': 0.08, 'raster-fade-duration': 250 } },
      { id: 'earth-regional', type: 'raster', source: 'earth-regional', minzoom: 3, paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0, 4, 1], 'raster-saturation': 0.22, 'raster-contrast': 0.08, 'raster-brightness-min': 0.025, 'raster-fade-duration': 350 } },
      { id: 'earth-detail', type: 'raster', source: 'earth-detail', minzoom: 6, paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0, 7, 1], 'raster-saturation': 0.12, 'raster-brightness-min': 0.025, 'raster-fade-duration': 350 } },
      { id: 'borders', type: 'line', source: 'basemap', paint: { 'line-color': '#e2f5ff', 'line-width': ['interpolate', ['linear'], ['zoom'], 0, 0.35, 5, 0.8, 9, 1.4], 'line-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.18, 3, 0.35, 6, 0.6] } },
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
      }, paint: { 'text-color': '#ffffff', 'text-halo-color': '#102a3d', 'text-halo-width': cat.id === 'countries' ? 1.4 : 1.6, 'text-halo-blur': 0.5 },
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
  const home = () => {
    const container = document.querySelector('#map')!;
    const width = container.clientWidth;
    const diameter = Math.min(width * (width < 600 ? 0.57 : 0.84), container.clientHeight * 0.81);
    return { center: [15, 20] as [number, number], zoom: Math.max(-0.2, Math.min(2.6, Math.log2(diameter / 164))), bearing: 0, pitch: 0 };
  };
  const map = new Map({ container: 'map', style, ...home(), minZoom: -0.5, maxZoom: 10, maxPitch: 0, pixelRatio: Math.min(3, Math.max(2, window.devicePixelRatio || 1)), attributionControl: false, canvasContextAttributes: { antialias: true }, renderWorldCopies: false });
  const failedImagery = new Set<string>();
  const imageryStatus = document.createElement('p');
  imageryStatus.className = 'imagery-status';
  imageryStatus.setAttribute('role', 'status');
  imageryStatus.hidden = true;
  const retryImagery = document.createElement('button');
  retryImagery.textContent = 'Retry';
  retryImagery.onclick = () => {
    for (const source of failedImagery) {
      const raster = map.getSource(source) as RasterTileSource;
      raster.setTiles(raster.tiles);
      map.setLayoutProperty(source, 'visibility', 'visible');
    }
    failedImagery.clear();
    imageryStatus.hidden = true;
  };
  imageryStatus.append('Detailed imagery unavailable. Showing the underlying map. ', retryImagery);
  map.getContainer().after(imageryStatus);
  map.on('remove', () => imageryStatus.remove());
  map.on('error', event => {
    const sourceId = (event as typeof event & { sourceId?: string }).sourceId;
    if (sourceId === 'earth-regional' || sourceId === 'earth-detail') {
      failedImagery.add(sourceId);
      map.setLayoutProperty(sourceId, 'visibility', 'none');
      imageryStatus.hidden = false;
      return;
    }
    console.error(event.error); onError('The globe could not finish rendering. Reload to try again.');
  });
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
  // Keep the atmospheric rim outside the clipped canvas; follow the actual disc
  // during dragging, search flights and resize rather than using a fixed circle.
  const atmosphere = document.createElement('div');
  atmosphere.className = 'earth-atmosphere';
  atmosphere.setAttribute('aria-hidden', 'true');
  atmosphere.hidden = true;
  container.after(atmosphere);
  map.on('remove', () => atmosphere.remove());
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
        if (Number.isFinite(down + up)) {
          const radius = (down + up) / 2, cy = sy + (down - up) / 2;
          next = `circle(${radius + 0.5}px at ${cx}px ${cy}px)`;
          atmosphere.style.width = atmosphere.style.height = `${radius * 2}px`;
          atmosphere.style.left = `${cx - radius}px`;
          atmosphere.style.top = `${cy - radius}px`;
        }
      }
    }
    if (next !== clip) { clip = next; container.style.clipPath = next; }
    const glow = Math.max(0, Math.min(1, (5 - map.getZoom()) / 2));
    atmosphere.hidden = !next || glow === 0;
    atmosphere.style.opacity = String(glow);
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
