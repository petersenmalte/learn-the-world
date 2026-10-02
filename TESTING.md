# Verification

Checked 2026-10-02 against the production Vite preview at `/learn-the-world/`.

- `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm build`: pass. Seven test cases cover search normalization/ranking, hidden labels, source integrity, inclusion, repository base paths and failed/invalid data requests.
- Desktop 1440 × 960 and phone 390 × 844 / 375 × 667 viewport inspection using the in-app Chromium browser. No horizontal overflow. Sidebar scrolls on shorter desktop screens; phone controls use a layer sheet.
- Keyboard search selection (arrow keys / Enter), accent-insensitive Reykjavík search, a capital found with Capitals switched off, glacier search and Fuji selection/fly-to/highlight checked interactively.
- Layer switches, zoom/reset controls, attribution, loading state, and the explicit data error/reload UI (simulated HTTP 503 on a separate local test server) checked.
- Runtime console checked for rendering errors. Bundled worker and same-origin GeoJSON assets load from the repository subpath.

Issues found and fixed: duplicate Natural Earth IDs could select unrelated shapes; globe initially framed too small; initial mobile zoom hid too many labels; esbuild install-script policy prevented the documented pnpm commands. Physical record IDs now include the source/index, the framing adapts to available space, the highest-priority labels survive the initial mobile zoom, and pnpm allows esbuild's install step.

Limits: viewport checks are not a physical iPhone/Safari device test. Touch gestures are provided by MapLibre; real-device GPU and virtual-keyboard behavior should receive a release smoke test. WebGL2 absence is handled explicitly; an actual unsupported device was not available. The build reports a large renderer chunk (MapLibre, about 280 KB gzip plus its worker); expected for this 3D rendering dependency.
