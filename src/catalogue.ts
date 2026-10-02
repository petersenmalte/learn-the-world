import { normalize, type Category, type Place } from './search';
export interface Catalogue {
  version: number; total: number; counts: Partial<Record<Category, number>>;
  codes: Record<string, Category>; minZoom: Record<Category, number>;
  countries: Record<string, string>; files: Record<string, number>;
  compressedBytes: number; source: string; sourceSha256: string;
}
export type CompactPlace = [number, string, number, number, string, string, number, string[]];
export interface Bounds { west: number; east: number; south: number; north: number }
export function searchBucket(query: string): string | null {
  const words = normalize(query).split(' ').filter(Boolean);
  const word = words.find(w => [...w].length >= 3) ?? words[0];
  if (!word) return null;
  const prefix = [...word].slice(0, 3).join('');
  let hash = 2166136261;
  for (const byte of new TextEncoder().encode(prefix)) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
  return (hash & 255).toString(16).padStart(2, '0');
}
export function bestSearchBucket(query: string, catalogue: Catalogue): string | null {
  const words = normalize(query).split(' ').filter(w => [...w].length >= 3);
  const candidates = (words.length ? words : [query]).map(searchBucket).filter((key): key is string => key !== null);
  return candidates.sort((a, b) => (catalogue.files[`search/${a}`] || 0) - (catalogue.files[`search/${b}`] || 0))[0] ?? null;
}
export function expandPlace(row: CompactPlace, catalogue: Catalogue): Place {
  const category = catalogue.codes[row[5]];
  return { id: `${category}-gn-${row[0]}`, name: row[1], category, coordinates: [row[2], row[3]],
    aliases: row[7], region: catalogue.countries[row[4]] || 'International waters / polar regions',
    rank: row[6], source: 'GeoNames', sourceId: String(row[0]), minZoom: catalogue.minZoom[category], featureCode: row[5] };
}
export async function fetchRows(url: string, fetcher: typeof fetch = fetch): Promise<CompactPlace[]> {
  const response = await fetcher(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Catalogue request failed (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  // Pages serves .gz as a file; also tolerate hosts that decode it via Content-Encoding.
  const text = bytes[0] === 0x1f && bytes[1] === 0x8b
    ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()
    : new TextDecoder().decode(bytes);
  return text.trim().split('\n').filter(Boolean).map(line => {
    const row = JSON.parse(line) as CompactPlace;
    if (row.length !== 8 || !Number.isFinite(row[0]) || typeof row[1] !== 'string' || !Array.isArray(row[7])) throw new Error('Invalid catalogue record');
    return row;
  });
}
export function queryRows(rows: CompactPlace[], query: string, catalogue: Catalogue, limit = 12): Place[] {
  const q = normalize(query); if (!q) return [];
  const tokens = q.split(' ');
  const best: { row: CompactPlace; score: number }[] = [];
  for (const row of rows) {
    const name = normalize(row[1]);
    const names = [name, ...row[7].map(normalize)];
    const score = name === q ? 0 : name.startsWith(q) ? 1 : names.some(n => n === q) ? 2
      : names.some(n => n.startsWith(q)) ? 3
      : names.some(n => tokens.every(t => n.split(' ').some(w => w.startsWith(t)))) ? 4 : 99;
    if (score === 99) continue;
    best.push({ row, score });
    best.sort((a, b) => a.score - b.score || a.row[6] - b.row[6] || a.row[1].localeCompare(b.row[1]));
    if (best.length > limit) best.pop();
  }
  return best.map(({ row }) => expandPlace(row, catalogue));
}
export function longitudeInBounds(lng: number, bounds: Bounds): number | null {
  for (const shift of [0, -360, 360]) if (lng + shift >= bounds.west && lng + shift <= bounds.east) return lng + shift;
  return null;
}
export function visibleCells(bounds: Bounds): string[] {
  const cells = new Set<string>();
  const south = Math.max(0, Math.floor((bounds.south + 90) / 15));
  const north = Math.min(11, Math.floor((bounds.north + 90) / 15));
  const west = Math.floor((bounds.west + 180) / 15);
  const east = Math.floor((bounds.east + 180) / 15);
  for (let x = west; x <= Math.min(east, west + 24); x++) for (let y = south; y <= north; y++) cells.add(`${((x % 24) + 24) % 24}-${y}`);
  return [...cells];
}
export function sampleVisibleRows(rows: CompactPlace[], bounds: Bounds, catalogue: Catalogue, columns: number): CompactPlace[] {
  const grid = new Map<string, CompactPlace>();
  for (const row of rows) {
    if (row[3] < bounds.south || row[3] > bounds.north) continue;
    const lng = longitudeInBounds(row[2], bounds); if (lng === null) continue;
    const x = Math.floor((lng - bounds.west) / Math.max(1, bounds.east - bounds.west) * columns);
    const y = Math.floor((row[3] - bounds.south) / Math.max(1, bounds.north - bounds.south) * columns);
    const key = `${row[5]}-${x}-${y}`;
    const prev = grid.get(key);
    if (!prev || row[6] < prev[6] || (row[6] === prev[6] && row[0] < prev[0])) grid.set(key, row);
  }
  return [...grid.values()];
}

export function sampleVisible(rows: CompactPlace[], bounds: Bounds, catalogue: Catalogue, columns: number): Place[] {
  return sampleVisibleRows(rows, bounds, catalogue, columns).map(row => expandPlace(row, catalogue));
}
