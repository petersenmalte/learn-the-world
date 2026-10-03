# Verification

## Offshore Landsat scene artifacts — 2026-10-03

- Fixed the reported rectangular ocean patches and clouds by clipping Landsat to Natural Earth's land polygons at every zoom. Ocean imagery now comes entirely from the underlying Blue Marble source, including inside otherwise valid Landsat frames.
- Production build and all 14 tests pass. New checks cover North Sea water exclusion, land retention in Britain/Norway/Jutland/Zealand, finite polar projection and XYZ bounding-box filtering.
- Production-preview browser check: searched North Sea, zoomed in and cleared the selection overlay. The reported scene strips/cloud rectangles are absent; coastline and island imagery remain visible. No warning/error console messages. The 1:10m coast mask does not resolve fine harbor details; inland source mosaic seams are not corrected by this change.

## Consistent overview and detail — 2026-10-03

- Removed the local December 2004 winter overview from the active style. The Landsat annual mosaic and its Blue Marble ocean/no-data background now render from zoom 0, with constant opacity and color treatment; only tile resolution changes when zooming.
- Production build and all 12 tests pass. Browser overview checked: the previous widespread Eurasian winter snow texture is no longer used; no imagery warnings/errors during the check. Imagery remains historical, as documented in `data/EARTH.md`, and is not represented as current.

## Progressive satellite detail — 2026-10-03

- Production build passes, as do all 12 tests. Additional tests cover no-data transparency (including preservation of colored dark water), invalid tile URLs and HTTP service errors. The existing MapLibre bundle-size warning remains.
- NASA production WMTS capabilities checked for the exact layer names, date, 256px tile sizes and maximum matrix levels (8 and 12). Sample Landsat imagery fetched successfully; JPEG black no-data requires explicit masking (even the service's PNG output was opaque).
- Browser checks on the local production preview under `/learn-the-world/`: search and fly to Mont Blanc, successive zoom steps into the Alps, sharper regional/detail imagery, preserved labels/highlights, no warning/error console messages. Checked desktop 1280 × 720 and phone 390 × 844; phone content width remained 390px. Attribution now has a dark backing to remain readable on detailed terrain.
- Error propagation is unit-tested; an end-to-end provider outage/retry and physical iPhone Safari have not been simulated. Real-world availability, coverage, image age and dark-pixel masking limitations are documented in `data/EARTH.md`.

## Natural Earth appearance — 2026-10-03

- Pulled `origin/main` at `28bee1b`; preserved the existing local phone globe-sizing change while resolving its overlap with the updated map options.
- `pnpm build` and all nine `pnpm test` cases pass. Production preview checked under `/learn-the-world/`, including the self-hosted NASA WebP tiles. Vite still reports the existing MapLibre bundle-size warning.
- Browser inspection at 1280 × 720 and 390 × 844: natural imagery, readable white labels, subtle borders, atmospheric rim and NASA attribution; no horizontal overflow on the phone viewport.
- Search for Japan, select/fly/highlight, mobile layer sheet, switching country/capital labels off and dragging to the Americas checked. Imagery remains visible independently of learning-layer visibility; halo follows the globe.
- No warning/error console messages during those checks. This is browser viewport testing, not a physical iPhone/Safari test.
- Imagery is a static cloud-free composite, enlarged beyond zoom 3. See [imagery limitations](data/EARTH.md); no live clouds or sunlight are simulated.

Checked 2026-10-02 against the production Vite preview at `/learn-the-world/`.

- `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm build`: pass. The nine test cases cover search normalization/ranking (including "Rhein" → Rhine), hidden labels, the curation limits (a few hundred rivers, lakes and mountains, not thousands) and coverage of famous features, source integrity, repository base paths, and failed/invalid data requests.
- `pnpm data:prepare` is deterministic: a second run produces byte-identical `places.json`, `countries.geojson` and `physical.geojson`.
- Desktop 1440 × 900 and phone 390 × 844 viewport inspection in Chromium (SwiftShader WebGL). No horizontal overflow; layer sheet opens and closes on the phone.
- Search selection (arrow keys / Enter), the fly-to and highlight, layer switches, zoom/reset controls and the data error/reload UI were checked interactively.
- Runtime console checked for rendering errors on every run.

## Monochrome redesign

- Interface reduced to search and layer switches; no logo, info button, mode badge, headings, hint texts or layer counters. Only error states keep explanatory text.
- Cursor latitude/longitude shows over the globe only, follows the cursor, stays correct while dragging and zooming under a resting cursor, and hides over the sidebar or the black background.

## Curated atlas, colour, resolution and zoom

- Physical features are limited to well-known ones (see [data/SOURCES.md](data/SOURCES.md)); the 2.09 million record catalogue is gone, so there is no catalogue worker or lazy detail loading any more.
- Vivid seven-colour country map on a saturated ocean, with white borders. Range and desert areas are light overlays with outlines so they do not hide country colours.
- Basemap at 1:10 million (10m) and the canvas renders at 2× pixel density on standard screens (3× maximum): checked canvas size 2280 × 1800 for a 1140 × 900 viewport. Zoom limit raised from 7 to 10.
- Labels that straddle the globe's horizon are cut at the edge by clipping the canvas to the visible disc (found and measured through MapLibre's globe projection).

Limits: viewport checks are not a physical iPhone/Safari device test; real-device GPU, memory and virtual-keyboard behaviour should receive a release smoke test. The country map is about 9 MB uncompressed (about 2.6 MB gzipped by GitHub Pages) and the start-up time on a slow mobile connection was not measured. In headless SwiftShader screenshots the selection card can leave a transient black ghost rectangle until the next repaint; it also occurred before the redesign and disappears on repaint. Country attribution of rivers, lakes and peaks near borders uses thinned polygons and can assign a feature to a neighbouring country.

## Learning area — 2026-10-03/04

- `pnpm test`: 29 tests pass, including all prior atlas tests. The new tests simulate complete games for every combination of country/capital × selection/elimination × world/seven continents (32 valid routes, 28 populated variants; Antarctica explicitly empty).
- Two-click confirmation, changing provisional targets, ignoring input during feedback, false-answer correction identities, exact-once shuffled selection, retries, removal only after correct answers, invalid routes, final-target completion and base-path/error handling are covered.
- All 196 country anchors were checked against every map unit: each is inside exactly its own polygon. All 199 capital coordinates and country associations match the frozen GeoNames evidence. All point pairs can be separated at the permitted maximum zoom. EU capital names match their frozen reference except explicitly documented cases.
- Full GEOS audit: 250 polygonal units, one source topology defect in Egypt repaired without material area change; zero invalid geometries or overlapping interiors after repair. The audit records 13 capital/outline offsets. Political tests check selected disputed-area assignments; this does not verify every border segment independently.
- `pnpm build`: production TypeScript/Vite build succeeds. The usual MapLibre bundle-size warning remains; games use local compressed geometry and no satellite tiles.
- In-app browser at desktop size and 390 × 844: overview links, selection change before confirmation, wrong-country answer (Argentina instead of Brazil), green correct-country highlighting, progress/Next, mute toggle retained between games, elimination error/retry (Brazil instead of Peru), correct Peru removal including shared outline, wrong-capital answer (Brasilia instead of Caracas), solution-focus button, and correct Port Vila marker removal were exercised.
- Europe mobile: ambiguous capital hits zoom without submitting; Rome and Vatican City become separate markers; Vatican City was selected and confirmed independently. Pacific framing crosses the antimeridian. Antarctica displays its explicit no-target explanation.
- Audio: separate short ascending/descending sine patterns, user-gesture playback, optional Web Audio failure, persisted mute and muted no-op behavior are implemented. Frequency/mute logic is tested; no physical-device loudness or listening certification is claimed.
- Atlas regression: returned from games to the globe, searched Berlin and opened its existing information card with country, coordinates and source link using Enter. Reserved a separate menu row above mobile search to prevent overlap; cleaned up late asynchronous callbacks on route changes.
- User refinement: restored the original black UI and reduced overview to flat rows, smaller typography and brief text. The map canvas remains white as originally requested. Geographic notes and sources remain available.

Detailed geographic evidence and limitations: [data/learning/README.md](data/learning/README.md).

## English text and restored layout — 2026-10-04

- Switched navigation, all game controls/states, accessibility labels, region names, country/capital names, capital functions, supplementary notes and the source documentation to English. Names now use the previously retrieved English EU Annex A5 snapshot; its URL and checksum are recorded in the manifest. The documented special cases remain explicit.
- At the user’s request, reversed the additional minimalist refinement: restored the card grid, bordered buttons, larger typography, introductory explanations and always-visible game instructions. Kept the dark theme, white map canvas, supplementary information and mobile atlas navigation spacing.
- All 29 tests pass; the existing EU-reference test now also checks English country names. Production build passes with the existing MapLibre chunk-size warning. Independent GEOS audit passes: 250 valid, non-overlapping polygons, 196 unique country anchors and the same 13 documented capital offsets.
- Compared the revised catalogue and generated geometry against the preceding commit: country/capital IDs, coordinates, continents, geometry assignments, all 250 polygon geometries and the presence of all 21 country notes are unchanged.
- Browser inspection at 1280 × 900 and 390 × 844: restored overview contains all 32 game links, with no horizontal overflow. English capital questions, country/function details, Russia’s supplementary note, mute/unmute controls and the 196-row source catalogue render correctly. Checked English notes for Switzerland, the Netherlands, Palestine and South Africa. These checks supplement the earlier gameplay tests; no gameplay logic changed.
