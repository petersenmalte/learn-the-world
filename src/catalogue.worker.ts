/// <reference lib="webworker" />
import { fetchRows, queryRows, sampleVisible, sampleVisibleRows, bestSearchBucket, visibleCells, type Catalogue, type CompactPlace, type Bounds } from './catalogue';
import type { Category } from './search';
let catalogue: Catalogue;
let base = '';
const searchCache = new Map<string, Promise<CompactPlace[]>>();
const mapCache = new Map<string, Promise<CompactPlace[]>>();
function load(key: string, cache: Map<string, Promise<CompactPlace[]>>, capacity: number) {
  let promise = cache.get(key);
  if (promise) { cache.delete(key); cache.set(key, promise); return promise; }
  promise = fetchRows(`${base}data/catalogue/${key}.ndjson.gz`).catch(error => { cache.delete(key); throw error; });
  cache.set(key, promise);
  while (cache.size > capacity) cache.delete(cache.keys().next().value!);
  return promise;
}
let latestMap = 0;
self.onmessage = async (event: MessageEvent) => {
  const message = event.data;
  if (message.type === 'init') { catalogue = message.catalogue; base = message.base; return; }
  const { id, type } = message;
  try {
    if (type === 'search') {
      const key = `search/${bestSearchBucket(message.query, catalogue)}`;
      const rows = catalogue.files[key] ? await load(key, searchCache, 2) : [];
      self.postMessage({ type, id, places: queryRows(rows, message.query, catalogue) });
    } else if (type === 'map') {
      latestMap = id;
      const bounds = message.bounds as Bounds;
      const keys = (message.categories as Category[]).flatMap(cat => visibleCells(bounds).map(cell => `map/${cat}-${cell}`)).filter(key => catalogue.files[key]);
      const rows: CompactPlace[] = [];
      // Bounded parallelism and cancellation between batches avoid saturating phones on rapid pans.
      for (let i = 0; i < keys.length; i += 4) {
        if (latestMap !== id) return;
        const chunks = await Promise.all(keys.slice(i, i + 4).map(key => load(key, mapCache, 24)));
        for (const chunk of chunks) rows.push(...sampleVisibleRows(chunk, bounds, catalogue, message.columns));
      }
      if (latestMap !== id) return;
      self.postMessage({ type, id, places: sampleVisible(rows, bounds, catalogue, message.columns) });
    } else if (type === 'cancel-map') latestMap = id;
  } catch (error) { self.postMessage({ type, id, error: error instanceof Error ? error.message : 'Catalogue unavailable' }); }
};
