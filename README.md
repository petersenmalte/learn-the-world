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
- A flat black-and-white interface with the globe in the centre and search plus layer switches beside it; only the globe carries colour. Latitude and longitude appear, dimmed, next to the cursor whenever it is over the globe.
- Countries and capitals enabled initially; independent switches for all ten categories.
- Local search across names and aliases, insensitive to case and diacritics, with keyboard result selection. Hidden layers and collision-hidden labels remain searchable. Search highlights the selected location and available geometry without changing your layer preferences.
- Ranked labels, zoom thresholds, collision detection and extra mobile spacing. A phone-sized layer sheet, safe-area spacing, reduced-motion support, loading/failure messages and a WebGL2 compatibility message.
- A self-hosted, generalized Natural Earth basemap. No external tile, font or geocoding requests at runtime. Learning points and physical shapes are separate sources from the basemap; country borders remain visible when country labels are off.

## Geographic scope and licenses

**242 countries/map units**: every feature in Natural Earth's 50m admin-0 countries dataset at the pinned revision. Includes dependencies, Antarctica and disputed units; **not 242 sovereign states**. Boundaries follow Natural Earth's worldview and imply no position on sovereignty.

**241 capital records**: every `PPLC` record in the GeoNames `cities500` download retrieved 2026-10-02. Includes capitals of dependencies. This source rule can omit small settlements and secondary/legislative seats; it is not a complete list of all national capital functions. See the [exact included names](data/INCLUDED.md).

Physical geography now includes **2,092,870 GeoNames records worldwide**: 793 volcanoes; 8,353 glaciers/icecaps; 475,937 mountains/peaks; 29,654 ranges; 1,253,320 rivers/streams (including intermittent streams); 324,213 lakes; 348 deserts; and 252 seas/oceans. All five main oceans are searchable. Counts are source records, not a guarantee of every feature on Earth. GeoNames classifications and regional coverage are imperfect; Natural Earth adds supplementary overview labels and detailed 10m river/lake/marine shapes. Most global records are points, not traced outlines. See [exact feature-code rules and limitations](data/SOURCES.md).

Natural Earth data is **public domain**. GeoNames data is **CC BY 4.0**, adapted by selecting records, trimming aliases and rounding coordinates. Keep the visible GeoNames credit and license link, and the source notices when redistributing. MapLibre is BSD-3-Clause; other software retains its own package license. See [sources, preparation and limitations](data/SOURCES.md) and [third-party notices](THIRD_PARTY_NOTICES.md).

Data is checked in. The 166 MB compressed global catalogue is split into 1,301 static files. Startup loads only the country map, overview and catalogue metadata. A worker fetches small search shards on demand; enabled layers load nearby point data at zoom 4+. Labels are sampled and collision-managed to keep phones responsive. Physical shapes load separately on demand. Search uses names/aliases and word prefixes (normally 3+ letters), independently of label visibility.

To regenerate: download GeoNames `allCountries.zip` and `countryInfo.txt` into ignored `data/source/`, then run `pnpm data:prepare` with Python 3. Input/output details and the source hash are in [data/SOURCES.md](data/SOURCES.md). Ordinary builds use the committed files and do not download geographic datasets.

## GitHub Pages

1. Push this project to `main` in `petersenmalte/learn-the-world`.
2. In **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
3. Run **Deploy atlas to GitHub Pages** (or push a commit). The workflow installs locked dependencies, runs tests, builds and uploads `dist/`, then deploys with Pages/OIDC permissions.
4. The site is served at **https://petersenmalte.github.io/learn-the-world/** after a successful deployment. Pull requests run build/tests without publishing.

The workflow derives `BASE_PATH` from the repository name. For a user/organization root site or custom domain, change it to `/`. The repository must be public for free GitHub Pages on a free account; no secrets are needed.

## Validation and limits

`pnpm test` exercises accent/alias search, ranking, hidden-category search, coordinate/ID integrity, coverage, shape-to-place references, repository-path asset loading and network/data failures. See [verification notes](TESTING.md) for browser checks.

MapLibre v6 requires **WebGL2**; the compressed catalogue also needs a modern browser with `DecompressionStream` support. Current iPhone Safari is a target; physical-device and older-device behavior depends on GPU/memory support. The atlas is country/region scale (zoom capped at 7; nearby named features appear when zoomed in), not a street map. English display names and selected aliases are used; this is not a fully localized gazetteer. The overview also supports substring matches; worldwide search uses word prefixes and retained aliases, without arbitrary spelling correction. Data reflects its snapshot, not live political or geographic updates. MapLibre's renderer is the main JavaScript payload (~280 KB gzip plus its worker).
