# Learn the World

A responsive, interactive globe for exploring geography. Built with Vite 8, TypeScript and MapLibre GL JS 6. No accounts, games, API keys, tracking, or paid services.

## Develop

Use Node.js **24 LTS** (Vite requires Node 20.19+ or 22.12+; this project supports 22.12+). Install pnpm 11.19.0, then:

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
pnpm preview
```

Open the printed URL ending in `/learn-the-world/`. All geographic assets and the bundled MapLibre worker use Vite's base path. Set `BASE_PATH=/` for a root-domain deployment. Production files are in `dist/`; no backend is needed.

## Features

- A rotatable, zoomable 3D globe, touch gestures, keyboard map navigation, zoom buttons and reset.
- Countries and capitals enabled initially; independent switches for all ten categories.
- Local search across names and aliases, insensitive to case and diacritics, with keyboard result selection. Hidden layers and collision-hidden labels remain searchable. Search highlights the selected location and available geometry without changing your layer preferences.
- Ranked labels, zoom thresholds, collision detection and extra mobile spacing. A phone-sized layer sheet, safe-area spacing, reduced-motion support, loading/failure messages and a WebGL2 compatibility message.
- A self-hosted, generalized Natural Earth basemap. No external tile, font or geocoding requests at runtime. Learning points and physical shapes are separate sources from the basemap; country borders remain visible when country labels are off.

## Geographic scope and licenses

**242 countries/map units**: every feature in Natural Earth's 50m admin-0 countries dataset at the pinned revision. Includes dependencies, Antarctica and disputed units; **not 242 sovereign states**. Boundaries follow Natural Earth's worldview and imply no position on sovereignty.

**241 capital records**: every `PPLC` record in the GeoNames `cities500` download retrieved 2026-10-02. Includes capitals of dependencies. This source rule can omit small settlements and secondary/legislative seats; it is not a complete list of all national capital functions. See the [exact included names](data/INCLUDED.md).

Physical geography contains **curated/source-selected features**, not exhaustive categories: 628 mountain points, 222 mountain-range regions, 13 river segments, 16 seas, 27 lake features, 58 deserts, 8 glacier points and 4 volcano points. Shapes and label anchors are generalized or approximate. Counts refer to records; a river or range can have multiple named segments. No terrain heights or up-to-date ice extents are rendered.

Natural Earth data is **public domain**. GeoNames data is **CC BY 4.0**, adapted by selecting records, trimming aliases and rounding coordinates. Keep the visible GeoNames credit and license link, and the source notices when redistributing. MapLibre is BSD-3-Clause; other software retains its own package license. See [sources, preparation and limitations](data/SOURCES.md) and [third-party notices](THIRD_PARTY_NOTICES.md).

Data is checked in, about 2.8 MB uncompressed total, with stripped properties and rounded coordinates. Worker-side GeoJSON tiling provides level of detail; loading does not depend on geographic service availability. `python3 scripts/prepare-data.py` regenerates outputs from the frozen GeoNames extract and pinned Natural Earth files (downloads missing files). No data download is required to build/deploy. Input URLs, revision, SHA-256 hashes and category counts are recorded in `public/data/manifest.json`.

## GitHub Pages

1. Push this project to `main` in `petersenmalte/learn-the-world`.
2. In **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
3. Run **Deploy atlas to GitHub Pages** (or push a commit). The workflow installs locked dependencies, runs tests, builds and uploads `dist/`, then deploys with Pages/OIDC permissions.
4. The site is served at **https://petersenmalte.github.io/learn-the-world/** after a successful deployment. Pull requests run build/tests without publishing.

The workflow derives `BASE_PATH` from the repository name. For a user/organization root site or custom domain, change it to `/`. The repository must be public for free GitHub Pages on a free account; no secrets are needed.

## Validation and limits

`pnpm test` exercises accent/alias search, ranking, hidden-category search, coordinate/ID integrity, coverage, shape-to-place references, repository-path asset loading and network/data failures. See [verification notes](TESTING.md) for browser checks.

MapLibre v6 requires **WebGL2**. Current iPhone Safari is a target; physical-device and older-device behavior depends on GPU/memory support. The atlas is country/region scale (zoom capped at 7), not a street map. English display names and selected aliases are used; this is not a fully localized gazetteer. Search supports substring matches, not arbitrary spelling corrections. Data reflects its snapshot, not live political or geographic updates. MapLibre's renderer is the main JavaScript payload (~280 KB gzip plus its worker).
