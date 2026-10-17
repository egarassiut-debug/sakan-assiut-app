import React, { useRef, useState } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Trash2,
  Star,
  Plus,
  Loader2,
  AlertCircle,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import {
  processMultipleImageFiles,
  getDataUrlSizeBytes,
  formatBytes,
} from '../utils/imageCompressor';

interface ImageUploadFieldProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  maxCompressedSizeKB?: number;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  images,
  onChange,
  maxImages = 4,
  maxCompressedSizeKB = 250,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const targetMaxBytes = maxCompressedSizeKB * 1024; // 250 KB = 256,000 bytes

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);

    const fileArray = Array.from(files);

    // Filter only image types
    const validImageFiles = fileArray.filter((f) => f.type.startsWith('image/'));
    if (validImageFiles.length === 0) {
      setErrorMessage('الملفات المحددة ليست صوراً صالحة. يُرجى اختيار ملفات صور (JPEG, PNG, WEBP).');
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      return;
    }

    // Check remaining image slots (up to maxImages)
    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      setErrorMessage(`تم الوصول إلى الحد الأقصى لعدد الصور المسموح به (${maxImages} صور).`);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      return;
    }

    const filesToProcess = validImageFiles.slice(0, remainingSlots);
    if (validImageFiles.length > remainingSlots) {
      setErrorMessage(
        `تم قبول أول ${remainingSlots} صور فقط للالتزام بالحد الأقصى (${maxImages} صور).`
      );
    }

    setIsProcessing(true);
    try {
      // Compress each image so its size does not exceed maxCompressedSizeKB (250 KB)
      const compressedImages = await processMultipleImageFiles(filesToProcess, targetMaxBytes);

      // Verify each compressed image complies with the strict 250 KB threshold
      const compliantImages = compressedImages.filter((dataUrl) => {
        const sizeBytes = getDataUrlSizeBytes(dataUrl);
        return sizeBytes <= targetMaxBytes;
      });

      if (compliantImages.length > 0) {
        onChange([...images, ...compliantImages]);
      } else {
        setErrorMessage('تعذر ضغط الصور المحددة إلى الحجم المطلوب (أقل من 250 كيلو بايت).');
      }
    } catch (error: any) {
      console.error('Error processing and compressing images:', error);
      setErrorMessage(error?.message || 'حدث خطأ أثناء ضغط ومعالجة الصور، يُرجى المحاولة مرة أخرى.');
    } finally {
      setIsProcessing(false);
      // Reset input values so the user can re-pick photos if necessary
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    onChange(images.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSetPrimary = (indexToPrimary: number) => {
    if (indexToPrimary === 0) return;
    const selected = images[indexToPrimary];
    const rest = images.filter((_, idx) => idx !== indexToPrimary);
    onChange([selected, ...rest]);
  };

  return (
    <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
      {/* Header with Title and Compression Indicator Badge */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
              <span>صور العقار</span>
              <span className="text-[11px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                (اختياري)
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">
              التقط بالكاميرا أو اختر من الاستوديو (حتى {maxImages} صور • تُضغط تلقائياً لأقل من {maxCompressedSizeKB} ك.ب لكل صورة)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md flex items-center gap-1">
            <Zap className="w-3 h-3 text-teal-600" />
            ضغط تلقائي: أقصى حجم {maxCompressedSizeKB} ك.ب / صورة
          </span>
          {images.length > 0 && (
            <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-lg">
              {images.length} / {maxImages} صور
            </span>
          )}
        </div>
      </div>

      {/* Error / Warning Alert Banner */}
      {errorMessage && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">
            {errorMessage}
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 font-bold px-1 transition-colors cursor-pointer"
            title="إغلاق التنبيه"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hidden Native File Inputs */}
      {/* 1. Camera Input (Direct mobile camera trigger) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* 2. Gallery Input (Multiple image selection from storage/gallery) */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Action Buttons: Camera vs Gallery */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          disabled={isProcessing || images.length >= maxImages}
          onClick={() => cameraInputRef.current?.click()}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-700 to-[#002B49] text-white text-xs font-bold shadow-xs hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-teal-200" />
              <span>جاري الضغط والمعالجة...</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 text-amber-300" />
              <span>كاميرا الجهاز</span>
            </>
          )}
        </button>

        <button
          type="button"
          disabled={isProcessing || images.length >= maxImages}
          onClick={() => galleryInputRef.current?.click()}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
              <span>جاري الفحص والضغط...</span>
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4 text-teal-700" />
              <span>استوديو الموبايل</span>
            </>
          )}
        </button>
      </div>

      {/* Uploaded Images Preview Grid with Compression Badges */}
      {images.length > 0 ? (
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {images.map((imgUrl, index) => {
              const isPrimary = index === 0;
              const byteSize = getDataUrlSizeBytes(imgUrl);
              const formattedSize = formatBytes(byteSize);

              return (
                <div
                  key={index}
                  className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group bg-slate-100 shadow-2xs"
                >
                  <img
                    src={imgUrl}
                    alt={`صورة العقار ${index + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Primary Badge */}
                  {isPrimary && (
                    <span className="absolute top-1 right-1 bg-amber-400 text-amber-950 text-[10px] font-black px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5 z-10">
                      <Star className="w-3 h-3 fill-current" />
                      رئيسية
                    </span>
                  )}

                  {/* Compressed Size Badge (Shows size <= 250 KB) */}
                  <span className="absolute bottom-1 right-1 bg-black/75 backdrop-blur-xs text-white text-[9px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1 z-10">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                    {formattedSize}
                  </span>

                  {/* Hover/Tap Overlay Controls */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 z-20">
                    {!isPrimary && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(index)}
                        title="تعيين كصورة رئيسية"
                        className="p-1.5 rounded-lg bg-amber-400 text-amber-950 hover:bg-amber-300 shadow-xs cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      title="حذف الصورة"
                      className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-xs cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Quick Add More Tile if under limit */}
            {images.length < maxImages && (
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => galleryInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-teal-600 bg-slate-50 hover:bg-teal-50/50 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-teal-700 transition-colors cursor-pointer disabled:opacity-50"
                title="إضافة المزيد من الصور"
              >
                <Plus className="w-5 h-5" />
                <span className="text-[10px] font-bold">إضافة صورة</span>
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-500 flex items-center justify-between flex-wrap gap-1">
            <span>💡 الصورة الأولى ذات شارة "رئيسية" هي التي ستظهر كغلاف في بطاقة العقار.</span>
            <span className="text-teal-700 font-bold">كل صورة مضغوطة بحجم أقل من {maxCompressedSizeKB} ك.ب</span>
          </p>
        </div>
      ) : (
        /* Empty State */
        <div className="p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-center text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700">لم يتم اختيار أي صور حتى الآن</p>
          <p className="text-[11px] text-slate-500">
            يمكنك إتمام النشر بدون صور، أو إضافة حتى 4 صور تُضغط تلقائياً (بحد أقصى 250 ك.ب لكل صورة).
          </p>
        </div>
      )}
    </div>
  );
};
