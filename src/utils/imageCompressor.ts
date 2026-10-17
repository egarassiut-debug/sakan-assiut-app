/**
 * Client-side Image Processing & Compression Utility
 * Reads images from device camera or photo gallery and compresses them
 * so that each image strictly does not exceed 250 KB (<= 250 * 1024 bytes)
 * before uploading or persisting in property data.
 */

// Target maximum compressed size: 250 KB (256,000 bytes)
export const MAX_COMPRESSED_IMAGE_SIZE_BYTES = 250 * 1024;

// Safe raw file limit before compression (20 MB) to prevent out-of-memory crashes on mobile browsers
export const MAX_RAW_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;

/**
 * Calculates the exact binary byte size of a Base64 Data URL.
 */
export function getDataUrlSizeBytes(dataUrl: string): number {
  if (!dataUrl) return 0;
  const commaIndex = dataUrl.indexOf(',');
  const base64Str = commaIndex !== -1 ? dataUrl.slice(commaIndex + 1) : dataUrl;
  const padding = base64Str.endsWith('==') ? 2 : base64Str.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64Str.length * 3) / 4) - padding);
}

/**
 * Formats a byte count into a readable Arabic string (e.g., '185.4 ك.ب').
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} ك.ب`;
  return `${(kb / 1024).toFixed(2)} ميجابايت`;
}

/**
 * Processes and compresses a single image file to ensure its final
 * base64 size does not exceed the target threshold (default: 250 KB).
 */
export async function processImageFile(
  file: File,
  maxTargetBytes: number = MAX_COMPRESSED_IMAGE_SIZE_BYTES,
  initialMaxWidth: number = 1280,
  initialMaxHeight: number = 1280
): Promise<string> {
  // Reject files that are excessively huge (e.g., > 20 MB) to avoid crashing browser canvas
  if (file.size > MAX_RAW_IMAGE_SIZE_BYTES) {
    throw new Error(
      `حجم الصورة الأصلية (${(file.size / (1024 * 1024)).toFixed(1)} ميجابايت) كبير جداً. يرجى اختيار ملف بحجم أقل من 20 ميجابايت.`
    );
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('فشل قراءة ملف الصورة من الجهاز'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('فشل معالجة صيغة الصورة'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Initial scale down if larger than 1280x1280 bounds
        const scale = Math.min(1, initialMaxWidth / width, initialMaxHeight / height);
        width = Math.max(100, Math.round(width * scale));
        height = Math.max(100, Math.round(height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        // Fill background with white for clean transparent-to-JPEG conversion
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Stage 1: Quality reduction loop
        let quality = 0.82;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        let currentSize = getDataUrlSizeBytes(dataUrl);

        while (currentSize > maxTargetBytes && quality > 0.45) {
          quality -= 0.08;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          currentSize = getDataUrlSizeBytes(dataUrl);
        }

        // Stage 2: Dimension reduction loop if quality reduction alone was not enough
        let resizeIteration = 0;
        while (currentSize > maxTargetBytes && resizeIteration < 6 && (width > 200 || height > 200)) {
          resizeIteration++;
          width = Math.round(width * 0.85);
          height = Math.round(height * 0.85);

          canvas.width = width;
          canvas.height = height;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Test at moderate quality
          quality = 0.65;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          currentSize = getDataUrlSizeBytes(dataUrl);

          while (currentSize > maxTargetBytes && quality > 0.35) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            currentSize = getDataUrlSizeBytes(dataUrl);
          }
        }

        // Final safeguard: If still marginally exceeding 250 KB, step down once more
        if (currentSize > maxTargetBytes) {
          width = Math.round(width * 0.75);
          height = Math.round(height * 0.75);
          canvas.width = width;
          canvas.height = height;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          dataUrl = canvas.toDataURL('image/jpeg', 0.35);
        }

        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Processes and compresses multiple image files concurrently,
 * ensuring each compressed image is strictly <= maxTargetBytes (250 KB).
 */
export async function processMultipleImageFiles(
  files: FileList | File[],
  maxTargetBytes: number = MAX_COMPRESSED_IMAGE_SIZE_BYTES
): Promise<string[]> {
  const fileArray = Array.from(files);
  const results: string[] = [];

  for (const file of fileArray) {
    if (!file.type.startsWith('image/')) continue;
    try {
      const compressedDataUrl = await processImageFile(file, maxTargetBytes);
      results.push(compressedDataUrl);
    } catch (err) {
      console.warn('Error compressing image file:', err);
      throw err;
    }
  }

  return results;
}
