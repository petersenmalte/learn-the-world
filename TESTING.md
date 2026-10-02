# Verification

Checked 2026-10-02 against the production Vite preview at `/learn-the-world/`.

- `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm build`: pass. Thirteen test cases cover search normalization/ranking, hidden labels, source integrity, inclusion, repository base paths and failed/invalid data requests. Catalogue tests verify every map shard against the advertised totals, look up newly covered volcanoes/glaciers/rivers/mountains/oceans, validate gzip loading and test date-line regional sampling.
- Desktop 1440 × 960 and phone 390 × 844 / 375 × 667 viewport inspection using the in-app Chromium browser. No horizontal overflow. Sidebar scrolls on shorter desktop screens; phone controls use a layer sheet.
- Keyboard search selection (arrow keys / Enter), accent-insensitive Reykjavík search, a capital found with Capitals switched off, glacier search and Fuji selection/fly-to/highlight checked interactively.
- Layer switches, zoom/reset controls, attribution, loading state, and the explicit data error/reload UI (simulated HTTP 503 on a separate local test server) checked.
- Runtime console checked for rendering errors. Bundled worker and same-origin GeoJSON assets load from the repository subpath.

Issues found and fixed: duplicate Natural Earth IDs could select unrelated shapes; globe initially framed too small; initial mobile zoom hid too many labels; esbuild install-script policy prevented the documented pnpm commands. Physical record IDs now include the source/index, the framing adapts to available space, the highest-priority labels survive the initial mobile zoom, and pnpm allows esbuild's install step.

Limits: viewport checks are not a physical iPhone/Safari device test. Touch gestures are provided by MapLibre; real-device GPU and virtual-keyboard behavior should receive a release smoke test. WebGL2 absence is handled explicitly; an actual unsupported device was not available. The build reports a large renderer chunk (MapLibre, about 280 KB gzip plus its worker); expected for this 3D rendering dependency.


## Worldwide catalogue update

- Replaced small selections with 2,092,870 matching records from the full GeoNames dump. Verified the sum of records across all regional shards equals the counters for every physical category.
- Search regressions: Krakatau, Vatnajökull (without accents), Thames, Zugspitze, Pacific Ocean and Southern Ocean. Search records are fetched independently of visible map layers.
- Detailed Natural Earth 10m river/lake/marine data is loaded on demand. Invalid empty source geometries are skipped during preparation.
- Worldwide search, gzip decoding and map sampling run in a dedicated worker. The deployment contains approximately 166 MB of compressed catalogue shards; those files are requested individually, not as one startup download.

- Desktop browser: a worldwide-only Panke river search returned German and other matching records, selected correctly, flew to the location, and loaded surrounding local river labels. Runtime console had no errors.
- Phone viewport 390 × 844: expanded seven-digit counters fit the layer sheet without horizontal overflow; sea/ocean toggle and ocean search checked. This remains viewport testing, not a physical iPhone test.

## Monochrome redesign

- Interface reduced to search and layer switches; no logo, info button, mode badge, headings, hint texts or layer counters. Only error states keep explanatory text.
- Desktop 1440 × 900 (Chromium, SwiftShader WebGL): cursor latitude/longitude shows over the globe only, follows the cursor, stays correct while dragging, and hides over the sidebar or the black background. Search, layer switches, selection card and fly-to checked.
- Phone 390 × 844: no horizontal overflow; layer sheet opens and closes.
- Known: labels of places near the globe's horizon can extend slightly past the globe's edge (MapLibre globe behaviour). In headless SwiftShader screenshots the selection card can leave a transient black ghost rectangle until the next repaint; it also occurred before the redesign and disappears on repaint.
