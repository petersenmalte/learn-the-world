# Earth surface imagery

The active map uses the same Landsat WELD annual mosaic at every zoom, with NASA GIBS Blue Marble underneath for oceans and missing data. Both use constant opacity/color settings across zoom levels. The former December 2004 local winter texture is no longer requested. Its archived assets/preparation notes below remain for reproducibility.

## Former local overview (unused)

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

The script reprojects latitude to Web Mercator and creates 512px XYZ WebP tiles at zoom levels 0–3 (85 tiles, 2,182,224 bytes using Pillow 11.3.0). These archived tiles remain under `public/earth/` but are no longer used by the renderer; ordinary builds do not run Python or fetch imagery. Learning overlays and country boundaries are independent sources.

## Limits

Web Mercator ends at ±85.0511°; MapLibre extends the edge raster over the polar caps, so the very poles are approximate. Bathymetric shading represents seabed relief and is not a literal photograph of ocean color. The atmospheric halo and edge shading are decorative and follow the visible globe disc, fading as the user zooms in. No live weather or day/night simulation is provided. Snow extent in a historical image reflects its acquisition season, not simply its age.

## On-demand NASA GIBS detail layers

Verified against the production [Web Mercator capabilities](https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml) on 2026-10-03:

| Map zoom | Dataset | WMTS matrix | Tile size |
| --- | --- | --- | --- |
| All zooms, beneath Landsat | `BlueMarble_ShadedRelief_Bathymetry` | `GoogleMapsCompatible_Level8` | 256 px |
| All zooms, fully opaque where data exists | `Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual`, time `2000-12-01` | `GoogleMapsCompatible_Level12` | 256 px |

WMTS tile order is `{z}/{y}/{x}`. Only visible tiles are requested, starting at map load. Source maximum zooms prevent requests beyond the published matrices. The map zoom limit remains 10. GIBS is a public NASA production imagery service, not a demo tile server. No keys, bulk downloads or paid services are used. With a service failure, the underlying map remains visible and Retry is offered. If both services fail, local plain land/ocean geometry remains usable. Raster tile resolution still changes during zoom; there is no deliberate switch of dataset or seasonal image at a zoom threshold.

Landsat WELD uses historical 30 m observations; the selected annual period starts December 2000. It has variable coverage, clouds and composite seams, and is not street-level or current imagery. Detail requests are limited to 60°S–80°N; outside that band Blue Marble remains visible. The JPEG service encodes missing data in black. `src/satellite.ts` turns pixels with all channels ≤8 transparent and feathers to full opacity at channel maximum 20. This can also make very dark water/shadows transparent; the imagery is for learning/context, not scientific measurement. Browser decoding uses `createImageBitmap` and `OffscreenCanvas`; unsupported decoding or network failures preserve the underlying map and show Retry. Tiles are processed individually and bitmap memory is released immediately.

NASA receives ordinary tile requests (including client IP and the viewed tile coordinates). Service availability and load times depend on the network. Credit NASA GIBS and Landsat/WELD in the map. Data usage: https://www.earthdata.nasa.gov/engage/open-data-services-software/data-use-policy . API: https://nasa-gibs.github.io/gibs-api-docs/access-basics/ . We acknowledge NASA's Global Imagery Browse Services (GIBS), part of EOSDIS, for access to this imagery.

### Coastal masking

Landsat frames also contain valid-looking ocean pixels and offshore clouds with visible rectangular scene edges. Black-pixel filtering alone cannot remove these. `src/land-mask.ts` projects the existing Natural Earth country polygons to Web Mercator once and clips each Landsat tile to the union of land polygons, preserving polygon holes and offshore islands. Blue Marble therefore supplies the entire ocean at every zoom, independent of Landsat scene footprints. This is a display mask at the same 1:10 million coastline scale as the map; fine harbor/coast details can differ from the satellite imagery. Inland scene seams, cloud cover and gaps in the original Landsat mosaic remain possible.
