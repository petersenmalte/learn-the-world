# Data provenance and preparation

Snapshot retrieved 2026-10-02. Natural Earth revision: `ca96624a56bd078437bca8184e78163e5039ad19` from [natural-earth-vector](https://github.com/nvkelso/natural-earth-vector/tree/ca96624a56bd078437bca8184e78163e5039ad19/geojson). Exact input SHA-256 hashes are in [manifest.json](../public/data/manifest.json).

| Output/category | Input and inclusion rule |
| --- | --- |
| Background/countries | `ne_50m_admin_0_countries`: all 242 map units. Names from NAME_EN; anchors LABEL_X/Y; rank from LABELRANK; zoom from MIN_LABEL. ISO/name aliases retained. |
| Capitals | [GeoNames cities500.zip](https://download.geonames.org/export/dump/cities500.zip): all 241 PPLC records. Name, ASCII/alternate names, coordinates, country code, population-based display rank and GeoNames ID extracted. Country labels from [countryInfo.txt](https://download.geonames.org/export/dump/countryInfo.txt). |
| Mountains | `ne_10m_geography_regions_elevation_points`, named `mountain` records; four selected volcanic mountains separated into volcanoes. Other volcanic mountains may remain in this source-defined mountain category. |
| Volcanoes | Editorial selection of Mount Kilimanjaro, Fuji, Monte Etna and Mauna Kea from the elevation points above. Volcano classification checked against [Smithsonian Global Volcanism Program](https://volcano.si.edu/) and [Geological Survey Ireland](https://www.gsi.ie/geoscience-topics/natural-hazards/volcanoes/); no Smithsonian dataset redistributed. |
| Mountain ranges / deserts | `ne_10m_geography_regions_polys`, classes Range/mtn and Desert. Regions are cartographic extents, not surveyed borders. |
| Rivers | All 13 named features of `ne_110m_rivers_lake_centerlines`. Chang and Yangtze are separate source segments of the same river. |
| Seas | `ne_110m_geography_marine_polys`, only feature class sea; oceans, bays and gulfs excluded. |
| Lakes | `ne_110m_lakes` plus class Lake in `ne_10m_geography_regions_polys`. |
| Glaciers | Eight GLCR points selected from GeoNames [CH.zip](https://download.geonames.org/export/dump/CH.zip) and [IS.zip](https://download.geonames.org/export/dump/IS.zip): Grosser Aletschgletscher 2660487; Gornergletscher 2660555; Rhonegletscher 2659056; Vadret da Morteratsch 2659576; Sólheimajökull 2626694; Breiðamerkurjökull 2632577; Falljökull 2631895; Skaftafellsjökull 2627078. These are location points, not outlines. |

Original GeoNames archive hashes and the frozen extract hash are recorded in `geonames-provenance.json`. The GeoNames extract is frozen in `geonames-snapshot.json`, with source IDs and feature codes. Original archives are not shipped. GeoNames records are available at `https://www.geonames.org/<sourceId>/`. Alternate names are limited to the first 60 unique values per entry. [GeoNames codes](https://www.geonames.org/export/codes.html) define PPLC and GLCR.

Preparation uses only Python 3's standard library. Natural Earth input files are fetched at the pinned commit if absent, unrelated attributes are removed, geometry coordinates rounded to 3 decimals and search coordinates to 4. At 50m/110m source scales this is appropriate for a lightweight world atlas, not fine navigation. No additional vertex-removal simplification is applied; coordinate rounding can still collapse the tiniest rings at this scale. Worker-side GeoJSON tolerance handles rendering detail. For physical polygons the anchor is the bounding-box center of the largest vertex-count component; rivers use a middle vertex. These approximate anchors may lie outside concave regions. Natural Earth IDs are not universally unique even within a category: physical IDs additionally include source file and record index to prevent unrelated features being highlighted together. Original IDs remain in `sourceId`.

All inputs, derived outputs and software are separate. `countries.geojson` is the self-hosted background; `physical.geojson` is the switchable learning geometry; `places.json` is the full learning/search index. Search never queries rendered labels.

Country and capital inclusion is defined by the sources, not by an assertion of statehood. Multiple-capital systems, disputed capitals, tiny settlements and source age are material limitations. See [INCLUDED.md](INCLUDED.md) for the exact shipped list.

Licenses: [Natural Earth public domain](https://www.naturalearthdata.com/about/terms-of-use/); [GeoNames terms/data](https://www.geonames.org/export/) and [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Attribution must remain with the adapted GeoNames data.
