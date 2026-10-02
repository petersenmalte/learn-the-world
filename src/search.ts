export const categories = [
  { id: 'countries', name: 'Countries', singular: 'Country / territory', icon: '⚑', color: '#b7d6b8' },
  { id: 'capitals', name: 'Capitals', singular: 'Capital city', icon: '◎', color: '#f5ce88' },
  { id: 'mountains', name: 'Mountains', singular: 'Mountain', icon: '△', color: '#d9c8a7' },
  { id: 'ranges', name: 'Mountain ranges', singular: 'Mountain range', icon: '⋀', color: '#c2b598' },
  { id: 'rivers', name: 'Rivers', singular: 'River', icon: '≋', color: '#80bfd2' },
  { id: 'seas', name: 'Seas', singular: 'Sea', icon: '≈', color: '#8fcdd8' },
  { id: 'lakes', name: 'Lakes', singular: 'Lake', icon: '◒', color: '#93becb' },
  { id: 'deserts', name: 'Deserts', singular: 'Desert', icon: '◠', color: '#e0bd7d' },
  { id: 'glaciers', name: 'Glaciers', singular: 'Glacier', icon: '◇', color: '#cfedf1' },
  { id: 'volcanoes', name: 'Volcanoes', singular: 'Volcano', icon: '♧', color: '#e69a7d' },
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
    return index.map(item => ({ ...item, score: item.name === q ? 0 : item.name.startsWith(q) ? 1 : item.names.some(n => n === q) ? 2 : item.names.some(n => n.startsWith(q)) ? 3 : item.names.some(n => n.includes(q)) ? 4 : 99 }))
      .filter(item => item.score < 99).sort((a, b) => a.score - b.score || a.place.rank - b.place.rank || a.place.name.localeCompare(b.place.name))
      .slice(0, limit).map(item => item.place);
  };
}
export function labelThreshold(place: Place, width: number) { return place.minZoom < 1 ? 0 : place.minZoom + (width < 600 ? 0.55 : 0); }
