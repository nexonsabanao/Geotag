import { MapType } from '../types';
import { lonToTileX, latToTileY } from './formatters';

interface MapRenderOptions {
  lat: number;
  lng: number;
  zoom?: number;
  width: number;
  height: number;
  mapType?: MapType;
}

// In-memory image tile cache
const tileImageCache = new Map<string, HTMLImageElement>();

function getTileUrl(x: number, y: number, z: number, mapType: MapType): string {
  if (mapType === 'satellite') {
    // Esri World Imagery (Satellite) - free, high-resolution global aerial tiles
    return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
  } else if (mapType === 'hybrid') {
    return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
  } else {
    // CartoDB Voyager / OSM Street
    const subdomains = ['a', 'b', 'c', 'd'];
    const s = subdomains[(x + y) % subdomains.length];
    return `https://${s}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
  }
}

function loadTileImage(url: string): Promise<HTMLImageElement> {
  if (tileImageCache.has(url)) {
    const cached = tileImageCache.get(url)!;
    if (cached.complete && cached.naturalWidth > 0) {
      return Promise.resolve(cached);
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      tileImageCache.set(url, img);
      resolve(img);
    };
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

/**
 * Draws the satellite/street map view centered at (lat, lng) with a red location pin
 */
export async function renderMapToCanvas(
  ctx: CanvasRenderingContext2D,
  options: MapRenderOptions
): Promise<void> {
  const { lat, lng, zoom = 16, width, height, mapType = 'satellite' } = options;

  const tileX = lonToTileX(lng, zoom);
  const tileY = latToTileY(lat, zoom);

  const centerTileX = Math.floor(tileX);
  const centerTileY = Math.floor(tileY);

  const fractionalX = (tileX - centerTileX) * 256;
  const fractionalY = (tileY - centerTileY) * 256;

  const centerCanvasX = width / 2;
  const centerCanvasY = height / 2;

  // Draw background fallback pattern in case tiles are downloading or fail
  drawFallbackMap(ctx, width, height, mapType, lat, lng);

  // Attempt to load and render 3x3 surrounding tiles
  const maxTile = Math.pow(2, zoom);
  const tilePromises: Promise<{ img: HTMLImageElement; dx: number; dy: number } | null>[] = [];

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const curX = (centerTileX + dx + maxTile) % maxTile;
      const curY = centerTileY + dy;
      if (curY < 0 || curY >= maxTile) continue;

      const url = getTileUrl(curX, curY, zoom, mapType);
      const drawX = centerCanvasX - fractionalX + dx * 256;
      const drawY = centerCanvasY - fractionalY + dy * 256;

      tilePromises.push(
        loadTileImage(url)
          .then((img) => ({ img, dx: drawX, dy: drawY }))
          .catch(() => null)
      );
    }
  }

  const loadedTiles = await Promise.all(tilePromises);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  for (const item of loadedTiles) {
    if (item && item.img.complete) {
      ctx.drawImage(item.img, Math.round(item.dx), Math.round(item.dy), 256, 256);
    }
  }

  // Draw satellite overlay vignette / border
  ctx.save();
  const vignetteH = Math.min(32, Math.round(height * 0.3));
  const grad = ctx.createLinearGradient(0, height - vignetteH, 0, height);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, height - vignetteH, width, vignetteH);

  // Draw miniature "Map" watermark badge in bottom left (matches reference image)
  const watermarkSize = Math.max(8, Math.min(10, Math.round(width * 0.08)));
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = `600 ${watermarkSize}px system-ui, sans-serif`;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 2;
  ctx.fillText('Map', 8, height - 7);

  ctx.restore();

  // Draw the red map pin in the exact center scaled to map dimensions
  const pinScale = Math.max(0.65, Math.min(1.15, width / 110));
  drawRedPin(ctx, centerCanvasX, centerCanvasY, pinScale);
}

/**
 * Draws the realistic red Google/GPS Map Camera pin with black center dot and ground shadow
 */
export function drawRedPin(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale = 1.0) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // 1. Soft pin shadow on the satellite ground
  ctx.beginPath();
  ctx.ellipse(1, 1, 8, 3.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fill();

  // 2. Pin body
  // Point is at (0, 0), bulb center is at (0, -18)
  const pinHeight = 24;
  const pinRadius = 8.5;
  const bulbCenterY = -pinHeight + pinRadius;

  // Outer red teardrop pin
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-pinRadius, -pinHeight * 0.5, -pinRadius, bulbCenterY - pinRadius, 0, bulbCenterY - pinRadius);
  ctx.bezierCurveTo(pinRadius, bulbCenterY - pinRadius, pinRadius, -pinHeight * 0.5, 0, 0);
  ctx.closePath();

  // Vibrant red gradient
  const pinGrad = ctx.createLinearGradient(-pinRadius, bulbCenterY - pinRadius, pinRadius, 0);
  pinGrad.addColorStop(0, '#FF453A');
  pinGrad.addColorStop(0.35, '#E02424');
  pinGrad.addColorStop(1, '#9B1C1C');
  ctx.fillStyle = pinGrad;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.fill();

  // Crisp pin outline
  ctx.strokeStyle = '#771D1D';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // 3. Center dot (authentic GPS camera marker has a dark circular center)
  ctx.shadowColor = 'transparent';
  ctx.beginPath();
  ctx.arc(0, bulbCenterY, pinRadius * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = '#111827';
  ctx.fill();

  // Tiny white inner specular reflection dot
  ctx.beginPath();
  ctx.arc(-1, bulbCenterY - 1, pinRadius * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  ctx.restore();
}

/**
 * Fallback vector map styling for instant loading
 */
function drawFallbackMap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mapType: MapType,
  lat: number,
  lng: number
) {
  ctx.save();
  if (mapType === 'satellite') {
    // Rich satellite earth tones (deep greens, warm soils, rooftops)
    ctx.fillStyle = '#2d3e28';
    ctx.fillRect(0, 0, width, height);

    // Varied agricultural / terrain blocks
    ctx.fillStyle = '#3a4e32';
    ctx.fillRect(10, 10, width * 0.4, height * 0.5);
    ctx.fillStyle = '#423326';
    ctx.fillRect(width * 0.45, 20, width * 0.5, height * 0.35);

    // Roof & structure shapes
    ctx.fillStyle = '#8f4f3c';
    ctx.fillRect(width * 0.45, height * 0.55, 36, 26);
    ctx.fillStyle = '#a68265';
    ctx.fillRect(20, height * 0.65, 30, 20);

    // Roads
    ctx.strokeStyle = '#4f4f4f';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.4);
    ctx.lineTo(width, height * 0.6);
    ctx.stroke();
  } else {
    // Clean street map palette
    ctx.fillStyle = '#E8ECE9';
    ctx.fillRect(0, 0, width, height);

    // Parks
    ctx.fillStyle = '#C8E6C9';
    ctx.fillRect(15, 15, width * 0.5, height * 0.4);

    // Secondary streets
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.45);
    ctx.lineTo(width, height * 0.5);
    ctx.moveTo(width * 0.5, 0);
    ctx.lineTo(width * 0.55, height);
    ctx.stroke();

    // Road outlines
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}
