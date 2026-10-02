import type { Catalogue, Bounds } from './catalogue';
import type { Category, Place } from './search';
export function createCatalogueClient(catalogue: Catalogue, base: string) {
  const worker = new Worker(new URL('./catalogue.worker.ts', import.meta.url), { type: 'module' });
  worker.postMessage({ type: 'init', catalogue, base });
  let serial = 0;
  const pending = new Map<number, { resolve: (places: Place[]) => void; reject: (error: Error) => void; type: string; timer: ReturnType<typeof setTimeout> }>();
  worker.onmessage = event => {
    const request = pending.get(event.data.id); if (!request) return;
    clearTimeout(request.timer); pending.delete(event.data.id);
    event.data.error ? request.reject(new Error(event.data.error)) : request.resolve(event.data.places);
  };
  worker.onerror = () => { for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error('The catalogue worker could not start.')); } pending.clear(); };
  function request(type: string, data: object): Promise<Place[]> {
    for (const [oldId, old] of pending) if (old.type === type) { clearTimeout(old.timer); old.resolve([]); pending.delete(oldId); }
    const id = ++serial;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('Catalogue request timed out. Try again.')); }, 45000);
      pending.set(id, { resolve, reject, timer, type }); worker.postMessage({ id, type, ...data });
    });
  }
  return {
    search: (query: string) => request('search', { query }),
    map: (bounds: Bounds, categories: Category[], columns: number) => request('map', { bounds, categories, columns }),
  };
}
