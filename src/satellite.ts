import { addProtocol } from 'maplibre-gl';

export const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
export const LANDSAT_PATH = 'Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual/default/2000-12-01/GoogleMapsCompatible_Level12';

/** GIBS serves this Landsat mosaic as JPEG, with black no-data areas.
 * Make only near-black pixels transparent, feathering JPEG edge artifacts.
 * Very dark water/shadows may also reveal the Blue Marble layer underneath.
 */
export function maskLandsatNoData(pixels: Uint8ClampedArray) {
  for (let i = 0; i < pixels.length; i += 4) {
    const brightness = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
    pixels[i + 3] = Math.round(pixels[i + 3] * Math.max(0, Math.min(1, (brightness - 8) / 12)));
  }
}

export function registerSatelliteProtocol() {
  addProtocol('landsat', loadLandsatTile);
}

export async function loadLandsatTile(request: { url: string }, controller: AbortController) {
  const path = request.url.replace(/^landsat:\/\//, '');
  if (!/^\d+\/\d+\/\d+$/.test(path)) throw new Error('Invalid satellite tile');
  // A timeout is a service failure, not MapLibre cancelling an offscreen tile.
  const download = new AbortController();
  const cancel = () => download.abort();
  controller.signal.addEventListener('abort', cancel, { once: true });
  if (controller.signal.aborted) cancel();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; download.abort(); }, 15000);
  try {
    const response = await fetch(`${GIBS}/${LANDSAT_PATH}/${path}.jpeg`, { signal: download.signal, credentials: 'omit' });
    if (!response.ok) throw new Error(`Satellite imagery unavailable (${response.status})`);
    const bitmap = await createImageBitmap(await response.blob());
    try {
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Satellite image decoding unavailable');
      context.drawImage(bitmap, 0, 0);
      const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height);
      maskLandsatNoData(pixels.data);
      context.putImageData(pixels, 0, 0);
      return { data: await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer() };
    } finally { bitmap.close(); }
  } catch (error) {
    if (timedOut) throw new Error('Satellite imagery request timed out');
    throw error;
  } finally {
    clearTimeout(timeout);
    controller.signal.removeEventListener('abort', cancel);
  }
}
