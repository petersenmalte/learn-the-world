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

- A rotatable, zoomable 3D globe (zoom up to level 10), touch gestures, keyboard map navigation, zoom buttons and reset.
- A flat black-and-white interface with the globe in the centre and search plus layer switches beside it; only the globe carries colour. Latitude and longitude appear, dimmed, next to the cursor whenever it is over the globe.
- Countries and capitals enabled initially; independent switches for all ten categories.
- A deliberately small, well-known selection: for rivers, lakes and mountains the few longest, largest and highest of each country plus the world-famous ones; the best-known ranges, deserts, seas, volcanoes and glaciers. About 1,500 learning points instead of millions of local records.
- Local search across names and aliases (including common local names such as "Rhein" for the Rhine), insensitive to case and diacritics, with keyboard result selection. Hidden layers and collision-hidden labels remain searchable. Search highlights the selected location and available geometry without changing your layer preferences.
- Ranked labels that appear progressively with zoom, collision detection and extra mobile spacing. A phone-sized layer sheet, safe-area spacing, reduced-motion support, loading/failure messages and a WebGL2 compatibility message.
- A natural Earth surface from NASA Blue Marble, with vivid oceans, vegetation, deserts and ice, subtle country borders and a blue atmospheric rim. Self-hosted WebP tiles (85 files, 2.2 MB total) load on demand; no external tile, font or geocoding requests at runtime. Natural Earth boundaries at 1:10 million and all learning layers remain separate from the imagery. See [imagery source and preparation](data/EARTH.md).

## Geographic scope and licenses

**242 countries/map units**: every feature in Natural Earth's 50m admin-0 countries list at the pinned revision, drawn with the 10m boundaries (a few extra tiny or disputed 10m units are drawn but not listed). Includes dependencies, Antarctica and disputed units; **not 242 sovereign states**. Boundaries follow Natural Earth's worldview and imply no position on sovereignty.

**241 capital records**: every `PPLC` record in the GeoNames `cities500` download retrieved 2026-10-02. Includes capitals of dependencies. This source rule can omit small settlements and secondary/legislative seats; it is not a complete list of all national capital functions. See the [exact included names](data/INCLUDED.md).

**Physical geography is curated, not complete.** Selection rules (see [data/SOURCES.md](data/SOURCES.md)):

| Layer | Included |
| --- | --- |
| Rivers (≈300) | The 3 longest per country (rivers of at least 150 km with at least 40 km inside the country) plus top-ranked world rivers over 800 km |
| Lakes (≈150) | The 3 largest per country (lakes of at least 60 km²) plus the world's top-ranked lakes |
| Mountains (≈350) | The 3 highest per country (Natural Earth peaks) plus the world's best known; one well-known GeoNames peak for countries without one |
| Ranges, deserts, seas | Natural Earth's higher-ranked regions (≈75 / ≈25 / ≈90) |
| Volcanoes, glaciers | The best-known GeoNames records and the largest ice masses (≈35 / ≈20) |

The full worldwide GeoNames catalogue of 2.09 million records (commit `8f94e2e`) was removed because it buried the features everyone should know. Most features are points; river courses, lake outlines, ranges and marine regions are drawn where Natural Earth provides shapes.

Natural Earth data is **public domain**. GeoNames data is **CC BY 4.0**, adapted by selecting records, trimming aliases and rounding coordinates. Keep the visible GeoNames credit and license link, and the source notices when redistributing. MapLibre is BSD-3-Clause; other software retains its own package license. See [sources, preparation and limitations](data/SOURCES.md) and [third-party notices](THIRD_PARTY_NOTICES.md).

The NASA Blue Marble imagery is a historical, cloud-free December 2004 composite with topography and bathymetry, credited to NASA Earth Observatory. Saturation and contrast are enhanced in the renderer. The atmospheric rim and gentle edge shading are decorative, not live sunlight or weather. Imagery is intended for the global view; zooming beyond tile level 3 magnifies it, while borders and labels stay sharp. No satellite service or API key is required.

Data is checked in (about 14 MB). Startup loads the country map (≈9 MB raw, ≈2.6 MB gzipped by GitHub Pages) and the places list; physical shapes (≈3 MB) load on demand when a shape layer or a search result needs them.

To regenerate: run `pnpm data:prepare` with Python 3. It downloads the pinned Natural Earth files into ignored `data/source/` and applies the selection rules to them and to the frozen GeoNames subsets in `data/` (`geonames-snapshot.json` for capitals, `geonames-curated.json` for the rest, produced by `scripts/extract-geonames-curated.py`). Ordinary builds use the committed files and do not download geographic datasets.

## GitHub Pages

1. Push this project to `main` in `petersenmalte/learn-the-world`.
2. In **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
3. Run **Deploy atlas to GitHub Pages** (or push a commit). The workflow installs locked dependencies, runs tests, builds and uploads `dist/`, then deploys with Pages/OIDC permissions.
4. The site is served at **https://petersenmalte.github.io/learn-the-world/** after a successful deployment. Pull requests run build/tests without publishing.

The workflow derives `BASE_PATH` from the repository name. For a user/organization root site or custom domain, change it to `/`. The repository must be public for free GitHub Pages on a free account; no secrets are needed.

## Validation and limits

`pnpm test` exercises accent/alias search, ranking, hidden-category search, the curation limits and famous-feature coverage, coordinate/ID integrity, shape-to-place references, repository-path asset loading and network/data failures. See [verification notes](TESTING.md) for browser checks.

MapLibre v6 requires **WebGL2**. Current iPhone Safari is a target; physical-device and older-device behavior depends on GPU/memory support. The atlas is country/region scale: the 1:10 million basemap stays clean up to zoom 10 but is not a street map and shows no local detail beyond the curated places. English display names and selected aliases are used; this is not a fully localized gazetteer. Search uses names and aliases with prefix and substring matching, without spelling correction. Data reflects its snapshot, not live political or geographic updates. MapLibre's renderer is the main JavaScript payload (~280 KB gzip plus its worker).
