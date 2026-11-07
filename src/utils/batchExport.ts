import JSZip from 'jszip';
import { PhotoItem, StampConfig } from '../types';
import { renderStampedPhoto } from './canvasStampRenderer';

/**
 * Renders all photos at full resolution and bundles them into a zip archive
 */
export async function exportAllPhotosZip(
  photos: PhotoItem[],
  config: StampConfig,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const zip = new JSZip();

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    if (onProgress) {
      onProgress(i + 1, photos.length);
    }

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = photo.previewUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      let width = img.naturalWidth || 1920;
      let height = img.naturalHeight || 1080;

      // Super-sample small photos (<1200px) so batch zip photos always have razor-sharp tags
      if (width < 1200) {
        const factor = Math.max(2, Math.ceil(1600 / width));
        width = Math.round(width * factor);
        height = Math.round(height * factor);
      }

      const offscreenCanvas = document.createElement('canvas');

      await renderStampedPhoto(
        offscreenCanvas,
        img,
        photo.data,
        config,
        width,
        height
      );

      const base64Data = offscreenCanvas
        .toDataURL('image/jpeg', 0.95)
        .replace(/^data:image\/jpeg;base64,/, '');

      const baseName = photo.name.replace(/\.[^/.]+$/, '');
      zip.file(`${baseName}_GPS_Stamped.jpg`, base64Data, { base64: true });
    } catch (err) {
      console.error(`Failed to process photo ${photo.name} for zip export:`, err);
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}
