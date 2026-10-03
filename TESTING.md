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
