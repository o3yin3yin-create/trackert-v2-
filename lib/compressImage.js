/**
 * High-performance client-side image compression for user avatars.
 * Scales down to 256x256 square crop with high-quality smoothing
 * and converts to WebP (or JPEG fallback) at 82% quality.
 * Resulting size is typically 12KB - 20KB while preserving crisp facial details.
 */
export async function compressAvatarImage(file, { maxSize = 256, quality = 0.82 } = {}) {
  if (!file) throw new Error('No file provided');

  // If already a tiny string or data URI, return or validate
  if (typeof file === 'string' && file.startsWith('data:image')) {
    // Already compressed or data url
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image into memory'));
      img.onload = () => {
        try {
          const naturalW = img.naturalWidth || img.width;
          const naturalH = img.naturalHeight || img.height;

          if (!naturalW || !naturalH) {
            return reject(new Error('Invalid image dimensions'));
          }

          // Center-crop to a square
          const squareDim = Math.min(naturalW, naturalH);
          const sx = Math.floor((naturalW - squareDim) / 2);
          const sy = Math.floor((naturalH - squareDim) / 2);

          // Output canvas size
          const outputSize = Math.min(maxSize, squareDim);

          const canvas = document.createElement('canvas');
          canvas.width = outputSize;
          canvas.height = outputSize;

          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) {
            return reject(new Error('Canvas 2D context not available'));
          }

          // High quality smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Fill white background just in case
          ctx.fillStyle = '#18181b';
          ctx.fillRect(0, 0, outputSize, outputSize);

          // Draw square center-crop into destination canvas
          ctx.drawImage(
            img,
            sx,
            sy,
            squareDim,
            squareDim,
            0,
            0,
            outputSize,
            outputSize
          );

          // Export as WebP first, fallback to JPEG
          let dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
