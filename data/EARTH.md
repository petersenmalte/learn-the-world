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

This is overview imagery, not a high-resolution satellite service. At zoom levels above 3 it is enlarged; vector borders and labels retain their resolution. Web Mercator ends at ±85.0511°; MapLibre extends the edge raster over the polar caps, so the very poles are approximate. Bathymetric shading represents seabed relief and is not a literal photograph of ocean color. The atmospheric halo and edge shading are decorative and follow the visible globe disc, fading as the user zooms in. No live weather, clouds or day/night simulation is provided.
