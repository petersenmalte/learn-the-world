# Geographic data and coverage

The atlas teaches what everyone should know, so it ships a curated selection rather than every record on Earth. Everything is served from this repository; no paid API, tile server, or secret is used.

## Natural Earth: globe, rankings and shapes

Pinned revision: `ca96624a56bd078437bca8184e78163e5039ad19` from [natural-earth-vector](https://github.com/nvkelso/natural-earth-vector/tree/ca96624a56bd078437bca8184e78163e5039ad19/geojson). [manifest.json](../public/data/manifest.json) records every file's URL and SHA-256.

- **Countries.** The 242 labelled map units come from `ne_50m_admin_0_countries` (names, label anchors, ranks). They are drawn with the sharper `ne_10m_admin_0_countries` boundaries, rounded to three decimals (about 110 m). Sixteen tiny or disputed 10m units without a 50m counterpart are drawn but not listed (`unlabelled` in the data). Seven fill colours come from the `MAPCOLOR7` field, which guarantees that neighbours differ.
- **Rivers.** `ne_10m_rivers_lake_centerlines` plus the Europe and North America supplements. Segments are merged by name and proximity; length is computed from geometry and attributed to countries by sampling points against the 10m country polygons.
- **Lakes.** `ne_10m_lakes` plus the Europe and North America supplements; area is computed from geometry. Reservoirs only when ranked among the world's largest.
- **Peaks.** Named `mountain` points in `ne_10m_geography_regions_elevation_points`, with elevation. Names with "Volcán", "Volcano" and a few well-known volcanoes (Fuji, Etna, Mauna Kea, Erebus, Teide, Klyuchevskaya Sopka) are listed as volcanoes.
- **Ranges, deserts.** Classes `Range/mtn` and `Desert` of `ne_10m_geography_regions_polys`.
- **Seas and oceans.** Sea, ocean, gulf, bay, strait, sound and channel features of `ne_10m_geography_marine_polys`. The two halves of the Pacific and Atlantic carry the same name in the source and are shown as North/South.
- **Ice masses.** Named features of `ne_10m_glaciated_areas` of the highest rank (ice sheets and a few ice caps), shown as points.

### Selection rules

Natural Earth's `scalerank` (0/1 = most important) is the importance signal. The constants live at the top of [prepare-data.py](../scripts/prepare-data.py) and are recorded in the manifest.

| Layer | Rule |
| --- | --- |
| Rivers | Top 3 per country by length inside that country (river ≥ 150 km, ≥ 40 km in the country), plus rivers with `scalerank` ≤ 3 that are ≥ 800 km long |
| Lakes | Top 3 per country by area share (lake ≥ 60 km²), plus `scalerank` ≤ 2 |
| Mountains | Top 3 per country by elevation, plus `scalerank` ≤ 4 (Everest, K2, Aconcagua …) |
| Ranges / deserts / seas | `scalerank` ≤ 3 (seas also all oceans) |
| Glaciers | `scalerank` ≤ 1 from Natural Earth |

Labels appear at zoom levels derived from the ranking: world-famous features first, then each country's best, then the rest of its quota. The country attribution uses thinned outer rings, so features near borders can be assigned to a neighbour; it is a ranking aid, not a survey.

### Editorial corrections

Natural Earth names are inconsistent (the Rhine appears as both "Rhein" and "Rhine", Chinese headwater reaches of the Yangtze as separate rivers, some names have lost diacritics). [prepare-data.py](../scripts/prepare-data.py) therefore contains small, visible tables: `RIVER_RENAME` (common English names; the original name is kept as a search alias), `RIVER_EXCLUDE` and `RIVER_NOISE` (headwater reaches, delta arms and side channels listed as separate rivers, plus entries with broken names), `LAKE_RENAME`, `LAKE_EXCLUDE`, `DESERT_EXCLUDE` and `GLACIER_KEEP`. All-caps names are title-cased and abbreviations such as "Mts." are expanded.

## GeoNames: capitals and gap fillers

GeoNames data is © GeoNames contributors, **CC BY 4.0**; the visible credit and license link must remain. Source files and hashes are in [geonames-provenance.json](geonames-provenance.json).

- **Capitals** (`geonames-snapshot.json`): all 241 `PPLC` records of `cities500.zip`, retrieved 2026-10-02. Includes capitals of dependent territories; can omit secondary seats. [INCLUDED.md](INCLUDED.md) lists the exact entries.
- **Curated subset** (`geonames-curated.json`): volcanoes (`VLC`), glaciers (`GLCR`, `CAPG`), deserts (`DSRT`), seas and oceans (`SEA`, `OCN`) and mountains (`MT`, `PK`, `PKS`) from the full GeoNames extract of 2026-10-02 (`allCountries.zip`, SHA-256 in the git history of `public/data/catalogue.json` at commit `8f94e2e`), keeping only the most widely known records. GeoNames has no size or elevation in that extract, so prominence is the number of alternate-language names (rank 2 = most, 8 = fewest). Volcanoes are kept up to rank 2, glaciers up to rank 3 (plus Aletsch and Pasterze), deserts and seas up to rank 3, and mountains up to rank 3, used only as the best-known peak of countries without a Natural Earth peak. [extract-geonames-curated.py](../scripts/extract-geonames-curated.py) documents the selection; it reads the old catalogue shards from commit `8f94e2e`.

The previous worldwide catalogue (2,092,870 records in 1,301 static files, search shards and a worker) was removed on purpose: it listed every creek and hill. Check out `8f94e2e` to restore it.

Natural Earth is [public domain](https://www.naturalearthdata.com/about/terms-of-use/). Boundary display follows the source and implies no position on sovereignty.

## Preparation and performance

`pnpm data:prepare` runs one Python 3 standard-library script (about 20 seconds). It downloads missing Natural Earth files into `data/source/` (ignored by Git) and writes `places.json`, `countries.geojson`, `physical.geojson` (and a `.gz` copy), `manifest.json` and [INCLUDED.md](INCLUDED.md). Checked-in outputs need no data download during a normal app build.

- `places.json` (~0.6 MB) and `countries.geojson` (~9 MB; ~2.6 MB gzipped on GitHub Pages) load at startup. Search runs in the browser over `places.json`.
- `physical.geojson` (~3 MB; a gzip copy is fetched) loads when a shape layer or a search result needs river, lake, range, desert or sea geometry.
- Natural Earth shapes are rounded to three decimals (rivers, lakes) or two decimals (ranges, deserts, seas). The 1:10 million source resolution stays the limit when zooming in.
