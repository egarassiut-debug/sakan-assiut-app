import React, { useRef, useState, useEffect } from 'react';
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
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import {
  compressImageFileToBlob,
  getDataUrlSizeBytes,
  formatBytes,
} from '../utils/imageCompressor';
import { dbUploadPropertyImage } from '../lib/supabase';

export interface PendingUploadItem {
  id: string;
  file: File;
  blob: Blob;
  previewUrl: string;
  name: string;
  sizeBytes: number;
}

interface ImageUploadFieldProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  maxCompressedSizeKB?: number;
  onUploadStateChange?: (state: { isUploading: boolean; hasFailedUploads: boolean }) => void;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  images,
  onChange,
  maxImages = 4,
  maxCompressedSizeKB = 250,
  onUploadStateChange,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingFailedUploads, setPendingFailedUploads] = useState<PendingUploadItem[]>([]);

  const targetMaxBytes = maxCompressedSizeKB * 1024; // e.g. 250 KB

  // Notify parent component about upload state to prevent submitting broken/un-uploaded images
  useEffect(() => {
    if (onUploadStateChange) {
      onUploadStateChange({
        isUploading: isProcessing || isRetrying,
        hasFailedUploads: pendingFailedUploads.length > 0,
      });
    }
  }, [isProcessing, isRetrying, pendingFailedUploads.length, onUploadStateChange]);

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
    const currentTotal = images.length + pendingFailedUploads.length;
    const remainingSlots = maxImages - currentTotal;
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
    const newlySucceededUrls: string[] = [];
    const newlyFailedItems: PendingUploadItem[] = [];

    try {
      for (const file of filesToProcess) {
        try {
          const { blob } = await compressImageFileToBlob(file, targetMaxBytes);
          const previewUrl = URL.createObjectURL(blob);
          const cleanName = file.name.replace(/\.[^/.]+$/, '');

          // Try uploading to Supabase Storage bucket 'properties-images'
          const storageUrl = await dbUploadPropertyImage(blob, cleanName);

          if (storageUrl && storageUrl.startsWith('http')) {
            // Success: Clean URL from CDN
            newlySucceededUrls.push(storageUrl);
            URL.revokeObjectURL(previewUrl);
          } else {
            // Failed to upload to cloud:
            // STRICT SAFETY: Do NOT store Base64 in `images` or localStorage.
            // Retain in ephemeral session memory for retry.
            newlyFailedItems.push({
              id: `failed_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              file,
              blob,
              previewUrl,
              name: file.name,
              sizeBytes: blob.size,
            });
          }
        } catch (itemErr) {
          console.warn('Single image compression/upload notice:', itemErr);
        }
      }

      if (newlySucceededUrls.length > 0) {
        onChange([...images, ...newlySucceededUrls]);
      }

      if (newlyFailedItems.length > 0) {
        setPendingFailedUploads((prev) => [...prev, ...newlyFailedItems]);
        setErrorMessage(
          `تعذر رفع عدد (${newlyFailedItems.length}) من الصور إلى الخادم السحابي بسبب انقطاع أو ضعف الاتصال بالإنترنت. لم يتم حفظها محلياً لحماية مساحة الذاكرة، ولكن تم الاحتفاظ بها في الجلسة ويمكنك النقر على "إعادة المحاولة" لرفعها.`
        );
      }
    } catch (error: any) {
      console.error('Error processing and compressing images:', error);
      setErrorMessage(error?.message || 'حدث خطأ أثناء ضغط ومعالجة الصور، يُرجى المحاولة مرة أخرى.');
    } finally {
      setIsProcessing(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  // Retry uploading all failed items
  const handleRetryAll = async () => {
    if (pendingFailedUploads.length === 0) return;
    setIsRetrying(true);
    setErrorMessage(null);

    const remainingFailed: PendingUploadItem[] = [];
    const recoveredUrls: string[] = [];

    for (const item of pendingFailedUploads) {
      try {
        const cleanName = item.name.replace(/\.[^/.]+$/, '');
        const storageUrl = await dbUploadPropertyImage(item.blob, cleanName);

        if (storageUrl && storageUrl.startsWith('http')) {
          recoveredUrls.push(storageUrl);
          URL.revokeObjectURL(item.previewUrl);
        } else {
          remainingFailed.push(item);
        }
      } catch {
        remainingFailed.push(item);
      }
    }

    if (recoveredUrls.length > 0) {
      onChange([...images, ...recoveredUrls]);
    }

    setPendingFailedUploads(remainingFailed);
    setIsRetrying(false);

    if (remainingFailed.length === 0) {
      setErrorMessage(null);
    } else {
      setErrorMessage(
        `ما زال يتعذر رفع (${remainingFailed.length}) صورة. يرجى التأكد من استقرار الإنترنت ثم المحاولة مرة أخرى.`
      );
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    onChange(images.filter((_, idx) => idx !== indexToRemove));
  };

  const handleRemovePendingItem = (idToRemove: string) => {
    setPendingFailedUploads((prev) => {
      const target = prev.find((item) => item.id === idToRemove);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== idToRemove);
    });
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
              التقط بالكاميرا أو اختر من الاستوديو (حتى {maxImages} صور • تُرفع سحابياً بروابط CDN خفيفة)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md flex items-center gap-1">
            <Zap className="w-3 h-3 text-teal-600" />
            تخزين سحابي مباشر
          </span>
          {images.length > 0 && (
            <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-lg">
              {images.length} / {maxImages} صور مرفوعة
            </span>
          )}
        </div>
      </div>

      {/* Error / Warning Alert Banner */}
      {errorMessage && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">
            {errorMessage}
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-amber-700 hover:text-amber-950 font-bold px-1 transition-colors cursor-pointer"
            title="إغلاق التنبيه"
          >
            ✕
          </button>
        </div>
      )}

      {/* Pending / Failed Uploads Banner with Action Buttons */}
      {pendingFailedUploads.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-rose-50/90 border border-rose-200 space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-rose-800 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>يوجد {pendingFailedUploads.length} صور لم ترفع سحابياً بعد</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isRetrying}
                onClick={handleRetryAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isRetrying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري إعادة الرفع...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>إعادة محاولة الرفع الآن</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  pendingFailedUploads.forEach((item) => URL.revokeObjectURL(item.previewUrl));
                  setPendingFailedUploads([]);
                  setErrorMessage(null);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
              >
                تخطي وحذف المعلقة
              </button>
            </div>
          </div>

          {/* Thumbnails of failed photos in session */}
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
            {pendingFailedUploads.map((item) => (
              <div
                key={item.id}
                className="relative aspect-square rounded-xl overflow-hidden border-2 border-dashed border-rose-300 bg-rose-100/50 group"
              >
                <img
                  src={item.previewUrl}
                  alt={item.name}
                  className="w-full h-full object-cover opacity-75"
                />
                <span className="absolute top-1 right-1 bg-rose-600 text-white text-[8px] font-bold px-1 rounded">
                  معلقة
                </span>
                <button
                  type="button"
                  onClick={() => handleRemovePendingItem(item.id)}
                  title="إلغاء هذه الصورة"
                  className="absolute bottom-1 right-1 p-1 rounded-md bg-white/90 text-rose-700 hover:bg-white shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-rose-700 font-medium">
            ⚠️ لحماية بياناتك من التلف، لا يمكن إرسال الإعلان بصور معلقة لم تكتمل عملية رفعها السحابية.
          </p>
        </div>
      )}

      {/* Hidden Native File Inputs */}
      {/* 1. Camera Input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* 2. Gallery Input */}
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
          disabled={isProcessing || isRetrying || (images.length + pendingFailedUploads.length) >= maxImages}
          onClick={() => cameraInputRef.current?.click()}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-700 to-[#002B49] text-white text-xs font-bold shadow-xs hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-teal-200" />
              <span>جاري الرفع السحابي...</span>
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
          disabled={isProcessing || isRetrying || (images.length + pendingFailedUploads.length) >= maxImages}
          onClick={() => galleryInputRef.current?.click()}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
              <span>جاري الفحص والرفع...</span>
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4 text-teal-700" />
              <span>استوديو الموبايل</span>
            </>
          )}
        </button>
      </div>

      {/* Uploaded Images Preview Grid (Supports CDN URLs and Legacy URLs) */}
      {images.length > 0 ? (
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {images.map((imgUrl, index) => {
              const isPrimary = index === 0;
              const isCloud = imgUrl.startsWith('http');

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

                  {/* Cloud CDN Badge */}
                  <span className="absolute bottom-1 right-1 bg-black/75 backdrop-blur-xs text-white text-[9px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1 z-10">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                    {isCloud ? 'سحابية' : 'مخزنة'}
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
            {images.length + pendingFailedUploads.length < maxImages && (
              <button
                type="button"
                disabled={isProcessing || isRetrying}
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
            <span className="text-teal-700 font-bold">جميع الصور ترفع سحابياً بروابط آمنة دون استهلاك ذاكرة الهاتف</span>
          </p>
        </div>
      ) : (
        /* Empty State */
        <div className="p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-center text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700">لم يتم اختيار أي صور حتى الآن</p>
          <p className="text-[11px] text-slate-500">
            يمكنك إتمام النشر بدون صور، أو إضافة حتى {maxImages} صور تُرفع سحابياً إلى خوادم المنظومة.
          </p>
        </div>
      )}
    </div>
  );
};
