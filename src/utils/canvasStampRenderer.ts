import { GeotagData, StampConfig } from '../types';
import { formatCoordinates } from './formatters';
import { renderMapToCanvas } from './mapRenderer';

/**
 * Draws the complete photo with the geotag location stamp onto an HTML canvas.
 * Can render at any resolution (from UI preview to full camera original megapixel size).
 */
export async function renderStampedPhoto(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  data: GeotagData,
  config: StampConfig,
  renderWidth?: number,
  renderHeight?: number
): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const targetWidth = renderWidth || image.naturalWidth || image.width || 1200;
  const targetHeight = renderHeight || image.naturalHeight || image.height || 900;

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  // Enable highest-quality image smoothing to prevent interpolation blur
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Draw the base photo cleanly
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  // 2. Compute proportional scaling based on photo width with an adaptive legibility floor
  // Baseline is 1000px width.
  // For small images (<1000px), linear downscaling previously caused fonts to shrink
  // to 4px-7px where canvas raster antialiasing smears letter glyphs.
  // We apply a non-linear curve with an absolute readability scale floor of 0.70x.
  let baseScale = (targetWidth / 1000) * config.scale;
  if (targetWidth < 1000) {
    const compressionCurve = Math.pow(targetWidth / 1000, 0.42);
    baseScale = Math.max(0.70, compressionCurve) * config.scale;
  }

  // Render the stamp overlay
  await renderStampBadge(ctx, image, targetWidth, targetHeight, data, config, baseScale);
}

async function renderStampBadge(
  ctx: CanvasRenderingContext2D,
  baseImage: HTMLImageElement | HTMLCanvasElement | null,
  photoWidth: number,
  photoHeight: number,
  data: GeotagData,
  config: StampConfig,
  scale: number
): Promise<void> {
  const marginX = Math.round(20 * scale);
  const marginY = Math.round(20 * scale);

  // Typography metrics with strict readability floors
  // Never let title font shrink below 13px or body below 10px to guarantee crisp letterforms
  const titleFontSize = Math.max(13, Math.round(18 * scale));
  const bodyFontSize = Math.max(10, Math.round(12 * scale));
  const lineHeight = Math.max(bodyFontSize + 4, Math.round(15.5 * scale));
  const paddingX = Math.max(10, Math.round(14 * scale));
  const paddingY = Math.max(7, Math.round(10 * scale));

  ctx.save();

  // Measure content lines
  const textLines: { text: string; isTitle?: boolean }[] = [];
  if (config.showTitle && data.title) {
    textLines.push({ text: data.title, isTitle: true });
  }

  if (config.showAddress && data.address) {
    // Wrap long address into multiple lines matching reference width
    const maxTextWidth = Math.max(260 * scale, photoWidth * 0.44);
    ctx.font = `400 ${bodyFontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
    const wrapped = wrapText(ctx, data.address, maxTextWidth);
    wrapped.forEach((line) => textLines.push({ text: line }));
  }

  if (config.showCoordinates) {
    textLines.push({
      text: formatCoordinates(data.latitude, data.longitude),
    });
  }

  if (config.showDateTime && data.dateTime) {
    textLines.push({ text: data.dateTime });
  }

  // Telemetry (Altitude, Compass, Weather)
  const telemetryParts: string[] = [];
  if (config.showAltitude && data.altitude !== undefined) {
    telemetryParts.push(`Alt ${data.altitude}m MSL`);
  }
  if (config.showCompass && data.bearing !== undefined) {
    const dir = data.compassDirection || 'SE';
    telemetryParts.push(`${data.bearing}° ${dir}`);
  }
  if (config.showWeather && data.weather) {
    telemetryParts.push(data.weather);
  }
  if (telemetryParts.length > 0) {
    textLines.push({ text: telemetryParts.join('   •   ') });
  }

  if (config.showProjectName && data.projectName) {
    textLines.push({ text: `Project: ${data.projectName}` });
  }

  if (config.showInspector && data.inspectorName) {
    textLines.push({ text: `Inspector: ${data.inspectorName}` });
  }

  if (config.showNotes && data.notes) {
    const maxTextWidth = Math.max(260 * scale, photoWidth * 0.44);
    ctx.font = `400 ${bodyFontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
    const wrappedNotes = wrapText(ctx, `Note: ${data.notes}`, maxTextWidth);
    wrappedNotes.forEach((line) => textLines.push({ text: line }));
  }

  // Calculate maximum text width
  let maxLineWidth = 200 * scale;
  textLines.forEach((item) => {
    ctx.font = item.isTitle
      ? `700 ${titleFontSize}px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`
      : `400 ${bodyFontSize}px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;
    const w = ctx.measureText(item.text).width;
    if (w > maxLineWidth) maxLineWidth = w;
  });

  // Balanced compact height: fits all lines with professional margins
  const computedTextHeight = paddingY * 2 + titleFontSize + 4 * scale + (textLines.length - 1) * lineHeight;
  const minUnifiedHeight = Math.max(76, Math.round(110 * scale));
  const unifiedHeight = Math.max(minUnifiedHeight, Math.round(computedTextHeight));

  const isFullBanner = config.template === 'full-banner';
  const bannerPaddingY = isFullBanner ? Math.max(10, Math.round(14 * scale)) : 0;
  const bannerHeight = isFullBanner ? unifiedHeight + bannerPaddingY * 2 : unifiedHeight;

  const mapSize = config.showMap ? unifiedHeight : 0;
  const mapGap = config.showMap ? Math.max(8, Math.round(12 * scale)) : 0;

  const textBlockWidth = Math.round(
    isFullBanner ? photoWidth - mapSize - mapGap - marginX * 2 : maxLineWidth + paddingX * 2
  );
  const totalStampWidth = isFullBanner ? photoWidth : mapSize + mapGap + textBlockWidth;
  const totalStampHeight = bannerHeight;

  // Position calculation (pixel-aligned)
  let startX = marginX;
  let startY = photoHeight - totalStampHeight - marginY;

  if (isFullBanner) {
    startX = 0;
    startY = config.position?.startsWith('top') ? 0 : photoHeight - bannerHeight;
  } else if (config.position === 'bottom-right') {
    startX = photoWidth - totalStampWidth - marginX;
    startY = photoHeight - totalStampHeight - marginY;
  } else if (config.position === 'top-left') {
    startX = marginX;
    startY = marginY;
  } else if (config.position === 'top-right') {
    startX = photoWidth - totalStampWidth - marginX;
    startY = marginY;
  } else if (config.position === 'bottom-center') {
    startX = Math.round((photoWidth - totalStampWidth) / 2);
    startY = photoHeight - totalStampHeight - marginY;
  }

  const mapX = Math.round(isFullBanner ? marginX : startX);
  const mapY = Math.round(isFullBanner ? startY + (bannerHeight - mapSize) / 2 : startY);
  const textX = Math.round(isFullBanner ? marginX + (config.showMap ? mapSize + mapGap : 0) : startX + mapSize + mapGap);
  const textY = Math.round(startY);

  // 1. Draw Unified Background Card or Full Banner
  const cardInset = isFullBanner ? 0 : Math.round(5 * scale);
  const cardCornerRadius = Math.round(isFullBanner ? 0 : Math.max(8, 12 * scale));
  const bgStartY = isFullBanner ? startY : startY - cardInset;
  const bgHeight = isFullBanner ? bannerHeight : unifiedHeight + cardInset * 2;
  const bgStartX = isFullBanner ? 0 : startX - cardInset;
  const bgWidth = isFullBanner ? photoWidth : totalStampWidth + cardInset * 2;

  ctx.save();

  // Background style based on theme
  const alpha = Math.max(0.15, Math.min(1, config.badgeOpacity / 100));
  let cardFill: string | CanvasGradient;
  let cardStroke: string | CanvasGradient;
  let textColor: string;
  let subTextColor: string;
  let textShadowColor: string;
  let textShadowBlur = bodyFontSize <= 11 ? 1 : Math.round(1.8 * scale);

  if (config.badgeTheme === 'light') {
    // Pure Architectural Light Card: Crisp white with subtle soft slate tint
    const lightGrad = ctx.createLinearGradient(bgStartX, bgStartY, bgStartX, bgStartY + bgHeight);
    lightGrad.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, alpha * 1.02)})`);
    lightGrad.addColorStop(1, `rgba(241, 245, 249, ${Math.min(1, alpha * 0.98)})`);
    cardFill = lightGrad;
    cardStroke = `rgba(15, 23, 42, ${Math.max(0.16, alpha * 0.22)})`;
    textColor = '#0f172a';
    subTextColor = '#334155';
    textShadowColor = 'transparent'; // No dark smudge on light backgrounds
    textShadowBlur = 0;
  } else if (config.badgeTheme === 'solid-black') {
    // 100% Solid Pitch Black - classic rugged GPS camera high-contrast look
    const solidAlpha = Math.max(0.92, alpha);
    cardFill = `rgba(0, 0, 0, ${solidAlpha})`;
    cardStroke = 'rgba(255, 255, 255, 0.32)';
    textColor = '#FFFFFF';
    subTextColor = '#FFFFFF';
    textShadowColor = 'rgba(0, 0, 0, 0.95)';
    textShadowBlur = bodyFontSize <= 11 ? 1 : Math.round(2 * scale);
  } else if (config.badgeTheme === 'glass') {
    // True Frosted Glassmorphism: Multi-stop prismatic specular border with crystal reflections
    const glassStrokeGrad = ctx.createLinearGradient(
      bgStartX,
      bgStartY,
      bgStartX + bgWidth,
      bgStartY + bgHeight
    );
    glassStrokeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.92)'); // Bright specular top-left edge
    glassStrokeGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.45)');
    glassStrokeGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.18)');
    glassStrokeGrad.addColorStop(1, 'rgba(255, 255, 255, 0.10)'); // Soft bottom-right edge
    cardFill = 'transparent';
    cardStroke = glassStrokeGrad;
    textColor = '#FFFFFF';
    subTextColor = '#FFFFFF';
    textShadowColor = 'rgba(0, 0, 0, 0.75)';
    textShadowBlur = bodyFontSize <= 11 ? 1 : Math.round(1.5 * scale);
  } else {
    // 'dark' - Dark Frosted Card
    const darkGrad = ctx.createLinearGradient(bgStartX, bgStartY, bgStartX, bgStartY + bgHeight);
    darkGrad.addColorStop(0, `rgba(36, 44, 58, ${alpha * 0.88})`);
    darkGrad.addColorStop(1, `rgba(15, 23, 42, ${alpha * 0.96})`);
    cardFill = darkGrad;
    cardStroke = `rgba(255, 255, 255, ${0.16 * alpha})`;
    textColor = '#FFFFFF';
    subTextColor = 'rgba(255, 255, 255, 0.95)';
    textShadowColor = 'rgba(0, 0, 0, 0.85)';
    textShadowBlur = bodyFontSize <= 11 ? 1 : Math.round(1.8 * scale);
  }

  // Card shadow
  if (config.badgeTheme === 'light') {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
    ctx.shadowBlur = Math.round(10 * scale);
    ctx.shadowOffsetY = Math.max(1, Math.round(3 * scale));
  } else if (config.badgeTheme === 'glass') {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = Math.round(16 * scale);
    ctx.shadowOffsetY = Math.max(2, Math.round(4 * scale));
  } else {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = Math.round(8 * scale);
    ctx.shadowOffsetY = Math.max(1, Math.round(3 * scale));
  }

  // 1. For Glass theme: Multi-layer authentic frosted crystal glass optics
  if (config.badgeTheme === 'glass') {
    ctx.save();
    ctx.beginPath();
    if (isFullBanner) {
      ctx.rect(0, startY, photoWidth, bannerHeight);
    } else {
      roundRect(ctx, bgStartX, bgStartY, bgWidth, bgHeight, cardCornerRadius);
    }
    ctx.clip();

    // 1a. Hardware-accelerated Gaussian backdrop blur of the underlying photo
    if (baseImage) {
      try {
        const blurRadius = Math.max(12, Math.round(18 * scale));
        ctx.filter = `blur(${blurRadius}px)`;
        // Slightly expand draw area to avoid edge transparency bleeding inside the clipped glass
        const bleed = Math.round(8 * scale);
        ctx.drawImage(
          baseImage,
          -bleed,
          -bleed,
          photoWidth + bleed * 2,
          photoHeight + bleed * 2
        );
        ctx.filter = 'none';
      } catch {
        // Fallback if filter not supported
      }
    }

    // 1b. Deep Obsidian Neutral Glass Tint:
    // Pure neutral smoke prevents muddy discoloration over colorful photos,
    // while allowing blurred photo shapes, lights, and colors to glow softly through.
    const deepGlassTint = ctx.createLinearGradient(bgStartX, bgStartY, bgStartX, bgStartY + bgHeight);
    const darkAlphaTop = Math.min(0.92, 0.48 + alpha * 0.38);
    const darkAlphaBottom = Math.min(0.96, 0.62 + alpha * 0.32);
    deepGlassTint.addColorStop(0, `rgba(15, 20, 32, ${darkAlphaTop})`);
    deepGlassTint.addColorStop(1, `rgba(10, 14, 22, ${darkAlphaBottom})`);
    ctx.fillStyle = deepGlassTint;
    ctx.fill();

    // 1c. Specular Top Glare Reflection (Ambient overhead light bouncing off top beveled curvature)
    const topGlareHeight = Math.max(14, Math.round(bgHeight * 0.35));
    const topGlare = ctx.createLinearGradient(bgStartX, bgStartY, bgStartX, bgStartY + topGlareHeight);
    topGlare.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
    topGlare.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)');
    topGlare.addColorStop(1, 'rgba(255, 255, 255, 0.00)');
    ctx.fillStyle = topGlare;
    ctx.fill();

    // 1d. Diagonal Subtle Glass Gloss (The authentic light sheen of polished glass)
    const diagGlare = ctx.createLinearGradient(
      bgStartX,
      bgStartY,
      bgStartX + bgWidth * 0.4,
      bgStartY + bgHeight
    );
    diagGlare.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    diagGlare.addColorStop(0.3, 'rgba(255, 255, 255, 0.02)');
    diagGlare.addColorStop(1, 'rgba(255, 255, 255, 0.00)');
    ctx.fillStyle = diagGlare;
    ctx.fill();

    // 1e. Inner Beveled Glass Lip (Simulates 3D physical glass thickness with light refracting through top edge)
    if (!isFullBanner) {
      const lipY = bgStartY + Math.max(1, Math.round(1.5 * scale));
      const lipGrad = ctx.createLinearGradient(bgStartX, lipY, bgStartX + bgWidth, lipY);
      lipGrad.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
      lipGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.55)');
      lipGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0.35)');
      lipGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
      ctx.strokeStyle = lipGrad;
      ctx.lineWidth = Math.max(1, Math.round(1 * scale));
      ctx.beginPath();
      ctx.moveTo(bgStartX + cardCornerRadius, lipY);
      ctx.lineTo(bgStartX + bgWidth - cardCornerRadius, lipY);
      ctx.stroke();
    }

    ctx.restore();
  }

  if (config.badgeTheme !== 'glass') {
    ctx.fillStyle = cardFill;
    ctx.beginPath();
    if (isFullBanner) {
      // Draw full-width banner background first
      ctx.fillRect(0, startY, photoWidth, bannerHeight);
    } else {
      roundRect(ctx, bgStartX, bgStartY, bgWidth, bgHeight, cardCornerRadius);
      ctx.fill();
    }
  }

  // Reset shadow for stroke
  ctx.shadowColor = 'transparent';

  if (!isFullBanner) {
    ctx.strokeStyle = cardStroke;
    ctx.lineWidth = config.badgeTheme === 'glass' ? Math.max(1.5, Math.round(1.5 * scale)) : 1;
    ctx.beginPath();
    roundRect(ctx, bgStartX, bgStartY, bgWidth, bgHeight, cardCornerRadius);
    ctx.stroke();
  } else {
    // Border line separating full banner from photo
    ctx.strokeStyle = cardStroke;
    ctx.lineWidth = config.badgeTheme === 'glass' ? Math.max(1.5, Math.round(1.5 * scale)) : 1;
    ctx.beginPath();
    const borderY = config.position?.startsWith('top') ? startY + bannerHeight : startY;
    ctx.moveTo(0, borderY);
    ctx.lineTo(photoWidth, borderY);
    ctx.stroke();
  }
  ctx.restore();

  // 2. Draw Map Thumbnail ON TOP of banner (100% full opacity, vibrant and crisp)
  if (config.showMap) {
    const mapCanvas = document.createElement('canvas');
    mapCanvas.width = mapSize;
    mapCanvas.height = mapSize;
    const mapCtx = mapCanvas.getContext('2d');
    if (mapCtx) {
      mapCtx.imageSmoothingEnabled = true;
      mapCtx.imageSmoothingQuality = 'high';
      await renderMapToCanvas(mapCtx, {
        lat: data.latitude,
        lng: data.longitude,
        zoom: config.mapZoom,
        width: mapSize,
        height: mapSize,
        mapType: config.mapType,
      });

      // Clip map with rounded corners matching the reference image (radius ~ 14px)
      const mapCornerRadius = Math.round(Math.max(8, 14 * scale));
      ctx.save();
      ctx.globalAlpha = 1.0; // Ensure 100% opacity, never dimmed by banner or alpha

      // Drop shadow for map
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = Math.round(8 * scale);
      ctx.shadowOffsetY = Math.max(1, Math.round(3 * scale));

      ctx.beginPath();
      roundRect(ctx, mapX, mapY, mapSize, mapSize, mapCornerRadius);
      ctx.fillStyle = config.badgeTheme === 'light' ? '#f8fafc' : '#0f172a';
      ctx.fill();

      ctx.save();
      ctx.clip();
      ctx.drawImage(mapCanvas, mapX, mapY, mapSize, mapSize);
      ctx.restore();

      // Inner map border matching badge theme
      ctx.strokeStyle = config.badgeTheme === 'light' ? 'rgba(15, 23, 42, 0.25)' : 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }

  // 3. Draw Text Content
  // Center text block vertically inside unified card / banner
  const contentHeight = titleFontSize + 4 * scale + (textLines.length - 1) * lineHeight;
  const startTextY = isFullBanner
    ? Math.round(startY + (bannerHeight - contentHeight) / 2 + titleFontSize * 0.86)
    : Math.round(textY + (unifiedHeight - contentHeight) / 2 + titleFontSize * 0.86);
  let currentY = startTextY;
  const textLeft = Math.round(isFullBanner ? textX : textX + paddingX);

  textLines.forEach((item) => {
    ctx.shadowColor = textShadowColor;
    ctx.shadowBlur = textShadowBlur;
    ctx.shadowOffsetY = textShadowBlur > 0 ? 1 : 0;

    if (item.isTitle) {
      ctx.font = `700 ${titleFontSize}px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = textColor;
      ctx.fillText(item.text, textLeft, Math.round(currentY));
      currentY += titleFontSize + Math.max(3, Math.round(4 * scale));
    } else {
      ctx.font = `400 ${bodyFontSize}px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = subTextColor;
      ctx.fillText(item.text, textLeft, Math.round(currentY));
      currentY += lineHeight;
    }
  });

  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const testLine = `${currentLine} ${word}`;
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.slice(0, 3); // Max 3 lines for address
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
