import { Map as LibreMap, NavigationControl, setWorkerUrl, type GeoJSONSource, type ExpressionSpecification } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { FeatureCollection, Point } from 'geojson';
import { regions, type GameConfig, type LearningData, type Target, type Game } from './game-model';
setWorkerUrl(workerUrl);
const empty: FeatureCollection = { type: 'FeatureCollection', features: [] };
export function createGameMap(container: HTMLElement, data: LearningData, targets: Target[], config: GameConfig, onPick: (id: string) => void, onHint: (text: string) => void, onReady: () => void, onError: () => void) {
  const eligible = new Set(targets.map(t => t.countryId));
  const polygons = { ...data.geometry, features: data.geometry.features.filter(f => eligible.has(f.properties!.id)) };
  const context = { ...data.geometry, features: data.geometry.features.filter(f => !eligible.has(f.properties!.id)) };
  const points: FeatureCollection<Point> = { type: 'FeatureCollection', features: targets.map(t => ({ type: 'Feature', id: t.id, properties: { id: t.id }, geometry: { type: 'Point', coordinates: t.coordinates } })) };
  const map = new LibreMap({ container, center: [0, 20], zoom: 0, minZoom: 0, maxZoom: 15, attributionControl: false,
    dragRotate: false, pitchWithRotate: false, touchPitch: false, doubleClickZoom: false, renderWorldCopies: true,
    style: { version: 8, sources: {
      countries: { type: 'geojson', data: polygons, tolerance: 0, maxzoom: 14 },
      context: { type: 'geojson', data: context, tolerance: 0.3 },
      targets: { type: 'geojson', data: points, tolerance: 0 },
      removed: { type: 'geojson', data: empty, tolerance: 0, maxzoom: 14 },
    }, layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#fff' } },
      { id: 'context', type: 'fill', source: 'context', paint: { 'fill-color': '#f4f4f2', 'fill-antialias': false } },
      { id: 'countries', type: 'fill', source: 'countries', paint: { 'fill-color': '#e7e8e5', 'fill-antialias': false } },
      { id: 'outlines', type: 'line', source: 'countries', paint: { 'line-color': '#899087', 'line-width': 0.8 } },
      // White source-derived masks also erase the shared outline drawn by a neighbour.
      { id: 'removed-fill', type: 'fill', source: 'removed', paint: { 'fill-color': '#fff', 'fill-antialias': false } },
      { id: 'removed-outline', type: 'line', source: 'removed', paint: { 'line-color': '#fff', 'line-width': 2 } },
      { id: 'targets', type: 'circle', source: 'targets', paint: { 'circle-radius': config.kind === 'capitals' ? 5 : 3.5, 'circle-color': '#68756d', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 } },
    ] },
  });
  let loaded = false;
  let disposed = false;
  let visible = new Set(targets.map(t => t.id));
  map.touchZoomRotate.disableRotation();
  map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
  const canvas = map.getCanvas();
  canvas.setAttribute('aria-label', 'Spielkarte. Pfeiltasten verschieben, Plus und Minus zoomen. Enter wählt das Ziel im Fadenkreuz; erneut Enter bestätigt.');
  const reset = () => {
    const r = regions.find(r => r.id === config.region)!;
    map.fitBounds([[r.bounds[0], r.bounds[1]], [r.bounds[2], r.bounds[3]]], { padding: 35, duration: 0 });
  };
  const pick = (point: { x: number; y: number }) => {
    if (!loaded) return;
    const near = map.queryRenderedFeatures([[point.x - 7, point.y - 7], [point.x + 7, point.y + 7]], { layers: ['targets'] });
    const ids = [...new Set(near.map(f => String(f.properties.id)).filter(id => visible.has(id)))];
    if (ids.length > 1) {
      // Never arbitrarily choose a stacked capital or a tiny neighbouring country.
      const candidate = targets.find(t => t.id === ids[0])!;
      const lng = candidate.coordinates[0] + 360 * Math.round((map.getCenter().lng - candidate.coordinates[0]) / 360);
      map.easeTo({ center: [lng, candidate.coordinates[1]], zoom: Math.min(15, map.getZoom() + 2), duration: 250 });
      onHint('Die Ziele liegen dicht zusammen. Die Karte zoomt näher heran; bitte erneut auswählen.');
      return;
    }
    if (ids.length === 1) { onPick(ids[0]); return; }
    if (config.kind === 'countries') {
      const features = map.queryRenderedFeatures([point.x, point.y], { layers: ['countries'] });
      const id = features.map(f => String(f.properties.id)).find(id => visible.has(id));
      if (id) onPick(id);
    }
  };
  map.on('click', event => pick(event.point));
  canvas.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.repeat) { event.preventDefault(); pick({ x: container.clientWidth / 2, y: container.clientHeight / 2 }); }
  });
  map.on('mousemove', event => {
    canvas.style.cursor = loaded && map.queryRenderedFeatures(event.point, { layers: config.kind === 'countries' ? ['countries','targets'] : ['targets'] }).length ? 'pointer' : '';
  });
  const timeout = window.setTimeout(() => { if (!loaded && !disposed) onError(); }, 30000);
  map.on('error', () => { if (!disposed) onError(); });
  map.on('load', () => { if (disposed) return; loaded = true; clearTimeout(timeout); reset(); onReady(); });
  return {
    reset,
    update(game: Game) {
      if (!loaded) return;
      visible = new Set(targets.filter(t => !game.removed.has(t.id)).map(t => t.id));
      const activeFilter: import('maplibre-gl').FilterSpecification = ['in', ['get', 'id'], ['literal', [...visible]]];
      map.setFilter('targets', activeFilter);
      if (config.kind === 'countries') {
        map.setFilter('countries', activeFilter); map.setFilter('outlines', activeFilter);
        (map.getSource('removed') as GeoJSONSource).setData({ type: 'FeatureCollection', features: polygons.features.filter(f => game.removed.has(f.properties!.id)) });
      }
      const feedback = game.feedback;
      const right = feedback && (feedback.correct || config.mode === 'selection') ? feedback.expected.id : '';
      const wrong = feedback && !feedback.correct ? feedback.selected.id : '';
      const color = (base: string): ExpressionSpecification => ['case',
        ['==', ['get', 'id'], right], '#26814c',
        ['==', ['get', 'id'], wrong], '#bf4141',
        ['==', ['get', 'id'], game.provisional ?? ''], '#9cafa2', base];
      map.setPaintProperty('targets', 'circle-color', color('#68756d'));
      map.setPaintProperty('targets', 'circle-radius', ['case', ['any', ['==',['get','id'],right], ['==',['get','id'],wrong], ['==',['get','id'],game.provisional ?? '']], 8, config.kind === 'capitals' ? 5 : 3.5]);
      if (config.kind === 'countries') map.setPaintProperty('countries', 'fill-color', color('#e7e8e5'));
    },
    focus(target: Target) {
      const lng = target.coordinates[0] + 360 * Math.round((map.getCenter().lng - target.coordinates[0]) / 360);
      map.easeTo({ center: [lng, target.coordinates[1]], zoom: config.kind === 'capitals' ? 7 : 4, duration: 300 });
    },
    destroy() { disposed = true; clearTimeout(timeout); map.remove(); },
  };
}
