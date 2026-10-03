import type { FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson';
export type Kind = 'countries' | 'capitals';
export type Mode = 'selection' | 'elimination';
export const regions = [
  { id: 'world', name: 'Weltweit', bounds: [-180, -58, 180, 82] },
  { id: 'europe', name: 'Europa', bounds: [-25, 33, 60, 72] },
  { id: 'africa', name: 'Afrika', bounds: [-26, -37, 64, 39] },
  { id: 'asia', name: 'Asien', bounds: [24, -12, 150, 61] },
  { id: 'north-america', name: 'Nordamerika', bounds: [-170, 5, -48, 75] },
  { id: 'south-america', name: 'Südamerika', bounds: [-84, -57, -32, 14] },
  { id: 'oceania', name: 'Australien & Ozeanien', bounds: [110, -49, 210, 23] },
  { id: 'antarctica', name: 'Antarktika', bounds: [-180, -85, 180, -60] },
] as const;
export type Region = typeof regions[number]['id'];
export interface Capital { id: string; name: string; coordinates: [number, number]; geonamesId: string; role: string }
export interface Country { id: string; name: string; continent: Region; anchor: [number, number]; geometryId: string; note: string; capitals: Capital[]; euCapital: string | null }
export interface Target { id: string; countryId: string; name: string; coordinates: [number, number]; detail: string; note: string }
export interface GameConfig { kind: Kind; mode: Mode; region: Region }
export interface LearningData { countries: Country[]; geometry: FeatureCollection<Polygon | MultiPolygon> }
export function parseGameRoute(hash: string): GameConfig | undefined {
  const match = /^#\/play\/(countries|capitals)\/(selection|elimination)\/([^/]+)$/.exec(hash);
  if (!match || !regions.some(r => r.id === match[3])) return;
  return { kind: match[1] as Kind, mode: match[2] as Mode, region: match[3] as Region };
}
export function targetsFor(countries: Country[], config: GameConfig): Target[] {
  return countries.filter(c => config.region === 'world' || c.continent === config.region).flatMap(c => config.kind === 'countries'
    ? [{ id: c.id, countryId: c.id, name: c.name, coordinates: c.anchor, detail: '', note: c.note }]
    : c.capitals.map(cap => ({ id: cap.id, countryId: c.id, name: cap.name, coordinates: cap.coordinates, detail: `${c.name} · ${cap.role}`, note: c.note })));
}
export function shuffle<T>(values: readonly T[], random = Math.random): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
export interface Feedback { correct: boolean; selected: Target; expected: Target }
export class Game {
  readonly order: Target[];
  readonly removed = new Set<string>();
  index = 0;
  correct = 0;
  attempts = 0;
  provisional?: string;
  feedback?: Feedback;
  constructor(readonly targets: Target[], readonly mode: Mode, random = Math.random) {
    if (new Set(targets.map(t => t.id)).size !== targets.length) throw new Error('Doppelte Spielziele');
    this.order = shuffle(targets, random);
  }
  get current() { return this.order[this.index] as Target | undefined; }
  get complete() { return this.index === this.order.length || (this.mode === 'elimination' && this.removed.size === this.targets.length); }
  get completed() { return this.mode === 'elimination' ? this.removed.size : this.index; }
  choose(id: string): 'ignored' | 'selected' | 'answered' {
    if (this.feedback || this.complete || this.removed.has(id)) return 'ignored';
    const selected = this.targets.find(t => t.id === id);
    if (!selected) return 'ignored';
    if (this.provisional !== id) { this.provisional = id; return 'selected'; }
    const expected = this.current!;
    this.feedback = { correct: selected.id === expected.id, selected, expected };
    this.attempts++;
    if (this.feedback.correct) {
      this.correct++;
      if (this.mode === 'elimination') this.removed.add(id);
    }
    this.provisional = undefined;
    return 'answered';
  }
  next() {
    if (!this.feedback) return;
    if (this.mode === 'selection' || this.feedback.correct) this.index++;
    this.feedback = undefined;
    this.provisional = undefined;
  }
}
export function pointInGeometry(point: Position, geometry: Polygon | MultiPolygon): boolean {
  const [x, y] = point;
  const inRing = (ring: Position[]) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [ax, ay] = ring[i], [bx, by] = ring[j];
      if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
    }
    return inside;
  };
  return (geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates).some(p => inRing(p[0]) && !p.slice(1).some(inRing));
}
export function validateLearningData(data: LearningData) {
  if (!Array.isArray(data.countries) || !data.countries.length || data.geometry?.type !== 'FeatureCollection' || !Array.isArray(data.geometry.features)) throw new Error('Lerndaten unvollständig.');
  const ids = new Set<string>();
  const positions: string[] = [];
  for (const c of data.countries) {
    if (!c.id || !c.name || ids.has(c.id) || !regions.some(r => r.id === c.continent && !['world','antarctica'].includes(r.id)) || !Array.isArray(c.capitals) || !c.capitals.length) throw new Error('Ungültiger Ländereintrag.');
    ids.add(c.id);
    const geometry = data.geometry.features.filter(f => f.properties?.id === c.id);
    if (geometry.length !== 1 || !pointInGeometry(c.anchor, geometry[0].geometry)) throw new Error(`Keine eindeutige Kartenfläche: ${c.name}`);
    positions.push(`country:${c.anchor.join(',')}`);
    for (const cap of c.capitals) {
      if (!cap.id || !cap.name || ids.has(cap.id) || !Array.isArray(cap.coordinates) || cap.coordinates.length !== 2 || !cap.coordinates.every(Number.isFinite) || Math.abs(cap.coordinates[0]) > 180 || Math.abs(cap.coordinates[1]) > 85) throw new Error(`Ungültige Hauptstadt: ${c.name}`);
      ids.add(cap.id); positions.push(`capital:${cap.coordinates.join(',')}`);
    }
  }
  if (new Set(positions).size !== positions.length) throw new Error('Kartenpunkte sind nicht eindeutig.');
}
export async function loadLearningData(base: string, signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<LearningData> {
  const [countries, geometry] = await Promise.all(['catalogue.json', 'countries.geojson.gz'].map(async name => {
    const response = await fetcher(`${base}data/learning/${name}`, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Lerndaten konnten nicht geladen werden (${response.status}).`);
    if (!name.endsWith('.gz')) return response.json();
    const bytes = new Uint8Array(await response.arrayBuffer());
    return bytes[0] === 31 && bytes[1] === 139
      ? new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json()
      : JSON.parse(new TextDecoder().decode(bytes));
  }));
  const data = { countries, geometry };
  validateLearningData(data);
  return data;
}
