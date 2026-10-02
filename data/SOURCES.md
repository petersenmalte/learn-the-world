# Geographic data and coverage

The atlas combines a global GeoNames point catalogue with Natural Earth overview labels, boundaries and physical shapes. Everything is served from this repository; no paid API, tile server, or secret is used.

## GeoNames worldwide catalogue

Source: [allCountries.zip](https://download.geonames.org/export/dump/allCountries.zip), retrieved 2026-10-02. Exact archive SHA-256, feature-code counts and exclusions are recorded in [manifest.json](../public/data/manifest.json) and [catalogue.json](../public/data/catalogue.json). All named, valid-coordinate records with the following feature codes are included, without a country or prominence cutoff:

| Layer | Included GeoNames feature codes | Records |
| --- | --- | ---: |
| Mountains | MT, PK, PKS — mountains, peaks and groups of peaks | 475,937 |
| Mountain ranges | MTS — ranges / groups of mountains | 29,654 |
| Volcanoes | VLC | 793 |
| Glaciers | GLCR, CAPG — glaciers and icecaps | 8,353 |
| Seas & oceans | SEA, OCN | 252 |
| Rivers | STM, STMS, STMI — rivers/streams, groups and intermittent streams | 1,253,320 |
| Lakes | LK, LKS, LKI, LKSI — lakes, groups and intermittent lakes | 324,213 |
| Deserts | DSRT | 348 |
| **Total** | | **2,092,870** |

These are **source records**, not a count of unique features on Earth. GeoNames coverage, names and classifications vary by country and can contain duplicates or errors. Not every volcanic mountain is tagged VLC; some are MT. Rivers include small streams; lakes and mountain groups can be grouped records. OCN includes ocean subdivisions and regional names, so 16 ocean records do not mean 16 globally recognized oceans. The interface also includes Natural Earth overview features in these layers. It does not claim complete worldwide coverage.

Each record retains its GeoNames ID and feature code, with a source link `https://www.geonames.org/<id>/`. Coordinates are rounded to four decimals. Up to twelve alternate/ASCII names per physical record are retained. Country names use [countryInfo.txt](https://download.geonames.org/export/dump/countryInfo.txt). GeoNames is **CC BY 4.0**; the visible credit/license link and redistribution notice must remain. See [format documentation](https://download.geonames.org/export/dump/readme.txt) and [feature-code definitions](https://www.geonames.org/export/codes.html).

## Natural Earth geometry and overview

Pinned revision: `ca96624a56bd078437bca8184e78163e5039ad19` from [natural-earth-vector](https://github.com/nvkelso/natural-earth-vector/tree/ca96624a56bd078437bca8184e78163e5039ad19/geojson). The manifest records each file's URL and hash.

- Background/countries: all 242 features in `ne_50m_admin_0_countries`. Includes dependencies, Antarctica and disputed units; not 242 sovereign states. Names, label anchors and rank come from the source.
- Mountain overview: named mountain points in `ne_10m_geography_regions_elevation_points`. Four previously selected volcanic mountains remain supplementary overview entries (Kilimanjaro, Fuji, Etna, Mauna Kea).
- Ranges/deserts: classes Range/mtn and Desert in `ne_10m_geography_regions_polys`.
- Rivers: named River and Lake Centerline features of **`ne_10m_rivers_lake_centerlines`**; replaces the original 110m/13-segment layer.
- Lakes: named Lake, Alkaline Lake and Reservoir features of **`ne_10m_lakes`**, plus the Lake regions dataset.
- Seas & oceans: sea, ocean, gulf, bay, strait, sound and channel features of **`ne_10m_geography_marine_polys`**. Oceans are now included. Marine boundaries are cartographic regions, not surveyed coastlines or jurisdictions.

Unnamed/empty Natural Earth features are omitted from the learning geometry. Shapes are rounded to three decimal places; their original generalized scale remains a limitation. Ocean anchors use wrapped longitude for features crossing the date line. Other polygon anchors use the bounding-box center of the largest vertex-count component; river anchors use a middle vertex. Anchors can lie outside a concave feature and are approximate. Natural Earth IDs can repeat: IDs include the source file and index so unrelated shapes are not highlighted together.

**Point versus shape:** every GeoNames record can be searched and selected as a point. Detailed river courses, lake polygons, ranges and marine extents are drawn only where Natural Earth provides geometry. A million river records does not mean a million traced river courses. Glacier and volcano records are points, not current ice outlines or terrain. Natural Earth and GeoNames can describe the same place separately; no unreliable cross-source merge is claimed.

Natural Earth is [public domain](https://www.naturalearthdata.com/about/terms-of-use/). Boundary display follows the source and implies no position on sovereignty.

## Countries and capitals

Country/capital inclusion is unchanged. Capitals are all 241 PPLC records in the frozen GeoNames cities500 snapshot retrieved 2026-10-02. This includes territories and can omit secondary seats or small settlements; it is not a complete list of all capital functions. [INCLUDED.md](INCLUDED.md) lists the exact entries. The original capital extract and download hashes remain in `geonames-snapshot.json` and `geonames-provenance.json`.

## Preparation and performance

`pnpm data:prepare` runs two Python 3 standard-library scripts. `prepare-data.py` fetches missing Natural Earth files at the pinned revision and creates the overview and shapes. `expand-catalogue.py` streams the local `data/source/allCountries.zip`, extracts all matching feature codes, and builds deterministic compressed shards. Download that world archive and countryInfo.txt into `data/source/` before regenerating. The public source archive changes daily; compare its hash with the recorded snapshot to reproduce this version. The checked-in outputs need no data download during a normal app build.

The ~166 MB compressed catalogue is split into **1,301 files**, not downloaded at startup:

- Search shards route on normalized three-character word prefixes, hashed into 256 buckets. Search considers names and retained aliases, with case/diacritic normalization. Multiword queries use the smallest relevant bucket. Empty buckets need no network request. An exact very short name is also indexed; for general prefix search type at least three letters. Arbitrary infix matching across the whole catalogue and typo correction are not provided.
- Regional point shards use 15° longitude/latitude cells and categories. At zoom 4+, enabled layers fetch only intersecting populated cells, with four concurrent requests, a bounded cache, and sampling across screen space. This intentionally limits drawn labels; all included records remain searchable.
- Gzip decoding, global search and regional sampling run in a worker. Stale replies are discarded. Request failures leave the globe usable, show a message, and allow retry.
- Base country geometry and the overview load initially. The ~8 MB uncompressed Natural Earth physical geometry loads as a gzip file only when a shape layer or relevant search result is requested.

The original tiny selections remain documented in Git history. Current layer counters show GeoNames records, except the fixed country/capital lists. Additional Natural Earth overview entries are not added to the GeoNames counters.
