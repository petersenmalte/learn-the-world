import type { FeatureCollection } from 'geojson';
import { categories, type Place } from './search';
export interface AtlasData { places: Place[]; countries: FeatureCollection; physical: FeatureCollection }
export async function loadData(base: string, fetcher: typeof fetch = fetch): Promise<AtlasData> {
  const files = ['places.json', 'countries.geojson'];
  const [places, countries] = await Promise.all(files.map(async file => {
    const response = await fetcher(`${base}data/${file}`, { signal: AbortSignal.timeout(25000) });
    if (!response.ok) throw new Error(`Atlas data could not be loaded (${response.status}). Check your connection and try again.`);
    return response.json();
  }));
  if (!Array.isArray(places) || !places.length || !places.every(p => p.id && p.name && categories.some(c => c.id === p.category) && Array.isArray(p.coordinates) && p.coordinates.length === 2 && p.coordinates.every(Number.isFinite) && Array.isArray(p.aliases)) || countries.type !== 'FeatureCollection' || !Array.isArray(countries.features)) throw new Error('The atlas data is invalid. Please reload or report the problem.');
  return { places, countries, physical: { type: 'FeatureCollection', features: [] } };
}

export async function loadShapes(base: string): Promise<FeatureCollection> {
  const response = await fetch(`${base}data/physical.geojson.gz`, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Geographic shapes unavailable (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const json = bytes[0] === 31 && bytes[1] === 139
    ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json()
    : JSON.parse(new TextDecoder().decode(bytes));
  if (json.type !== 'FeatureCollection' || !Array.isArray(json.features)) throw new Error('Invalid geographic shapes');
  return json;
}
