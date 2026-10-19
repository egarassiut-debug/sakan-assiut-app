/**
 * Calculates byte size of a base64 data URL
 */
export function getDataUrlSizeBytes(dataUrl: string): number {
  if (!dataUrl) return 0;
  const commaIdx = dataUrl.indexOf(',');
  const base64Str = commaIdx !== -1 ? dataUrl.substring(commaIdx + 1) : dataUrl;
  const padding = (base64Str.match(/=/g) || []).length;
  return Math.max(0, Math.floor((base64Str.length * 3) / 4) - padding);
}

/**
 * Formats byte size into Arabic or standard human readable string (e.g. 180 ك.ب)
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 ك.ب';
  if (bytes < 1024) return `${bytes} بايت`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} ك.ب`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} م.ب`;
}

/**
 * Reads and compresses a single File into a high quality JPEG data URL
 */
export function compressImageFile(file: File, maxSizeBytes: number = 250 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxDimension = 1400;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Quality reduction loop if needed
        let quality = 0.82;
        let result = canvas.toDataURL('image/jpeg', quality);
        let size = getDataUrlSizeBytes(result);

        while (size > maxSizeBytes && quality > 0.4) {
          quality -= 0.12;
          result = canvas.toDataURL('image/jpeg', quality);
          size = getDataUrlSizeBytes(result);
        }

        resolve(result);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Processes multiple image files in parallel and returns array of compressed base64 strings
 */
export async function processMultipleImageFiles(
  files: File[],
  maxSizeBytes: number = 250 * 1024
): Promise<string[]> {
  const promises = files.map((file) => compressImageFile(file, maxSizeBytes));
  return Promise.all(promises);
}
