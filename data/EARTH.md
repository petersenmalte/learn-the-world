# Earth surface imagery

- Dataset: NASA Blue Marble Next Generation, December 2004, with topography and bathymetry; a cloud-free monthly composite, not live satellite imagery.
- Credit: NASA Earth Observatory (Reto Stöckli).
- Dataset page: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/
- Original: https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg
- Retrieved: 2026-10-03; dimensions: 5400 × 2700, equirectangular.
- SHA256: `a9f0088972dee0254610af851c4d6838ca3f2cf79176987e0a5713e2c15ec042`.
- Usage: NASA imagery generally is not subject to US copyright. Credit NASA and do not imply endorsement. https://www.nasa.gov/nasa-brand-center/images-and-media/

## Preparation

With Python 3 and Pillow installed, download the source into the ignored `data/source/` directory, then run:

```sh
python3 scripts/prepare-earth.py data/source/world.topo.bathy.200412.3x5400x2700.jpg
```

The script reprojects latitude to Web Mercator and creates 512px XYZ WebP tiles at zoom levels 0–3 (85 tiles, 2,182,224 bytes using Pillow 11.3.0). Generated tiles are committed under `public/earth/`; ordinary builds do not run Python or fetch imagery. The renderer requests only the tiles needed for the current view, using the configured Vite base path. Raster colors are enhanced at render time, without altering geographic coordinates. Learning overlays and country boundaries are independent sources.

## Limits

The local texture is overview imagery. It remains underneath remotely fetched detail layers as a fallback. Web Mercator ends at ±85.0511°; MapLibre extends the edge raster over the polar caps, so the very poles are approximate. Bathymetric shading represents seabed relief and is not a literal photograph of ocean color. The atmospheric halo and edge shading are decorative and follow the visible globe disc, fading as the user zooms in. No live weather or day/night simulation is provided.

## On-demand NASA GIBS detail layers

Verified against the production [Web Mercator capabilities](https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml) on 2026-10-03:

| Map zoom | Dataset | WMTS matrix | Tile size |
| --- | --- | --- | --- |
| 3–4 transition | `BlueMarble_ShadedRelief_Bathymetry` | `GoogleMapsCompatible_Level8` | 256 px |
| 6–7 transition | `Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual`, time `2000-12-01` | `GoogleMapsCompatible_Level12` | 256 px |

WMTS tile order is `{z}/{y}/{x}`. Only visible tiles are requested, and layers below their minimum map zoom do not request imagery. Source maximum zooms prevent requests beyond the published matrices. The existing map zoom limit remains 10. GIBS is a public NASA production imagery service, not a demo tile server. No keys, bulk downloads or paid services are used. The local NASA layer remains available without GIBS.

Landsat WELD uses historical 30 m observations; the selected annual period starts December 2000. It has variable coverage, clouds and composite seams, and is not street-level or current imagery. Detail requests are limited to 60°S–80°N; outside that band Blue Marble remains visible. The JPEG service encodes missing data in black. `src/satellite.ts` turns pixels with all channels ≤8 transparent and feathers to full opacity at channel maximum 20. This can also make very dark water/shadows transparent; the imagery is for learning/context, not scientific measurement. Browser decoding uses `createImageBitmap` and `OffscreenCanvas`; unsupported decoding or network failures preserve the underlying map and show Retry. Tiles are processed individually and bitmap memory is released immediately.

NASA receives ordinary tile requests (including client IP and the viewed tile coordinates). Service availability and load times depend on the network. Credit NASA GIBS and Landsat/WELD in the map. Data usage: https://www.earthdata.nasa.gov/engage/open-data-services-software/data-use-policy . API: https://nasa-gibs.github.io/gibs-api-docs/access-basics/ . We acknowledge NASA's Global Imagery Browse Services (GIBS), part of EOSDIS, for access to this imagery.
