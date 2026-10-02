export const categories = [
  { id: 'countries', name: 'Countries', singular: 'Country / territory', color: '#ffffff' },
  { id: 'capitals', name: 'Capitals', singular: 'Capital city', color: '#ffffff' },
  { id: 'mountains', name: 'Mountains', singular: 'Mountain', color: '#8b4a1c' },
  { id: 'ranges', name: 'Mountain ranges', singular: 'Mountain range', color: '#a8642b' },
  { id: 'rivers', name: 'Rivers', singular: 'River', color: '#00c8ff' },
  { id: 'seas', name: 'Seas & oceans', singular: 'Sea / ocean', color: '#b8ecff' },
  { id: 'lakes', name: 'Lakes', singular: 'Lake', color: '#1aa3ff' },
  { id: 'deserts', name: 'Deserts', singular: 'Desert', color: '#ffb02e' },
  { id: 'glaciers', name: 'Glaciers', singular: 'Glacier', color: '#e6fbff' },
  { id: 'volcanoes', name: 'Volcanoes', singular: 'Volcano', color: '#ff3b30' },
] as const;
export type Category = typeof categories[number]['id'];
export interface Place { id: string; name: string; category: Category; coordinates: [number, number]; aliases: string[]; region: string; rank: number; source: string; sourceId: string; minZoom: number; featureCode?: string }
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ß/g, 'ss').replace(/ø/g, 'o').replace(/ł/g, 'l').replace(/æ/g, 'ae').replace(/œ/g, 'oe').replace(/ð/g, 'd').replace(/þ/g, 'th').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
export function createSearch(places: Place[]) {
  const index = places.map(place => ({ place, name: normalize(place.name), names: [place.name, ...place.aliases].map(normalize) }));
  return (query: string, limit = 10): Place[] => {
    const q = normalize(query);
    if (!q) return [];
    const found: {place: Place; score: number}[] = [];
    for (const item of index) {
      const score = item.name === q ? 0 : item.name.startsWith(q) ? 1 : item.names.some(n => n === q) ? 2 : item.names.some(n => n.startsWith(q)) ? 3 : item.names.some(n => n.includes(q) || q.split(' ').every(t => n.split(' ').some(w => w.startsWith(t)))) ? 4 : 99;
      if (score < 99) found.push({ place: item.place, score });
    }
    return found.sort((a, b) => a.score - b.score || a.place.rank - b.place.rank || a.place.name.localeCompare(b.place.name)).slice(0, limit).map(item => item.place);
  };
}
export function labelThreshold(place: Place, width: number) { return place.minZoom < 1 ? 0 : place.minZoom + (width < 600 ? 0.55 : 0); }
