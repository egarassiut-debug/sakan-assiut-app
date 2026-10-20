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

        // Apply luxury "سكن أسيوط" Brand Watermark Stamp on Bottom Right
        try {
          const margin = Math.round(width * 0.025);
          const badgeHeight = Math.max(26, Math.round(height * 0.05));
          const badgeWidth = Math.max(130, Math.round(width * 0.22));
          const bx = width - badgeWidth - margin;
          const by = height - badgeHeight - margin;
          const radius = Math.round(badgeHeight * 0.35);

          ctx.save();
          // Subtle faint translucent grey glass pill container
          ctx.fillStyle = 'rgba(30, 41, 59, 0.32)'; // رمادي باهت نصف شفاف غير مؤثر على تفاصيل الصورة
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'; // إطار رمادي/أبيض شفاف خفيف
          ctx.lineWidth = 1;

          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(bx, by, badgeWidth, badgeHeight, radius);
          } else {
            ctx.rect(bx, by, badgeWidth, badgeHeight);
          }
          ctx.fill();
          ctx.stroke();

          // Subtle Emerald active dot indicator (شارة التوثيق)
          const dotRadius = Math.max(2.5, Math.round(badgeHeight * 0.11));
          ctx.fillStyle = 'rgba(16, 185, 129, 0.75)';
          ctx.beginPath();
          ctx.arc(bx + badgeWidth - margin * 0.8, by + badgeHeight / 2, dotRadius, 0, Math.PI * 2);
          ctx.fill();

          // Brand Typography: "سكن أسيوط" بلون رمادي باهت ناعم غير فاقع
          const fontSize = Math.max(11, Math.round(badgeHeight * 0.44));
          ctx.font = `600 ${fontSize}px 'Tajawal', 'Cairo', sans-serif`;
          ctx.fillStyle = 'rgba(241, 245, 249, 0.82)'; // رمادي فاتح باهت
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText('سكن أسيوط', bx + badgeWidth - margin * 1.5, by + badgeHeight / 2);

          // Verification subtext if badge is spacious
          if (badgeWidth > 150) {
            ctx.fillStyle = 'rgba(203, 213, 225, 0.65)'; // رمادي باهت
            ctx.font = `500 ${Math.max(9, Math.round(fontSize * 0.68))}px sans-serif`;
            ctx.textAlign = 'left';
            ctx.fillText('منصة موثقة', bx + margin * 0.7, by + badgeHeight / 2);
          }
          ctx.restore();
        } catch (watermarkErr) {
          console.debug('Watermark stamp skipped:', watermarkErr);
        }

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
