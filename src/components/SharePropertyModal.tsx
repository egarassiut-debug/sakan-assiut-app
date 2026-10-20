import React, { useState } from 'react';
import { Property } from '../types/property';
import { 
  X, Share2, Copy, Check, MessageSquare, Facebook, 
  MapPin, Building2, ExternalLink, Sparkles, Send
} from 'lucide-react';

interface SharePropertyModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
}

export const SharePropertyModal: React.FC<SharePropertyModalProps> = ({
  property,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Generate shareable URL with property code parameter
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}?propertyCode=${encodeURIComponent(property.code)}`
    : '';

  const purposeText = property.purpose === 'rent' ? 'للإيجار' : 'للبيع';
  const priceFormatted = `${property.price.toLocaleString('ar-EG')} ج.م`;

  // Rich WhatsApp Message Template
  const shareMessage = `🏠 *عقار مميز من تطبيق سكن أسيوط*
كود العقار: *${property.code}*
📌 *${property.title}*
🏷️ الغرض: ${purposeText} (${property.propertyType})
📍 المنطقة: ${property.district} - ${property.city}
💰 السعر: *${priceFormatted}* ${property.purpose === 'rent' ? '/ شهرياً' : ''}
📐 المساحة: ${property.area} م²
${property.bedrooms ? `🛏️ الغرف: ${property.bedrooms}` : ''} ${property.floorLevel ? `| 🏢 الطابق: ${property.floorLevel}` : ''}

🔗 تصفح كافة الصور وتفاصيل المعاينة الرسمية من هنا:
${shareUrl}

سكن أسيوط • منصتك العقارية الأولى بمحافظة أسيوط 🇪🇬`;

  const handleCopyTextAndLink = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  const handleWhatsAppShare = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleFacebookShare = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareMessage)}`;
    window.open(fbUrl, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `عقار ${property.code} - ${property.title} | سكن أسيوط`,
          text: shareMessage,
          url: shareUrl,
        });
      } catch (err) {
        console.debug('Native share cancelled or failed:', err);
      }
    } else {
      handleCopyTextAndLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden text-right flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#002B49] text-white p-4.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFB300]/20 border border-[#FFB300]/30 flex items-center justify-center text-[#FFB300]">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">مشاركة بطاقة العقار</h3>
              <p className="text-[11px] text-slate-300">مشاركة سريعة عبر الواتساب وفيسبوك وروابط مباشرة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Visual Share Card Preview */}
          <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white p-4 rounded-2xl border border-slate-700 shadow-md space-y-2.5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-center justify-between">
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                سكن أسيوط
              </span>
              <span className="text-xs font-mono font-bold text-amber-400">
                كود: {property.code}
              </span>
            </div>

            <div>
              <h4 className="font-bold text-sm text-white line-clamp-1">{property.title}</h4>
              <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-blue-400" />
                <span>{property.district} - {property.city}</span>
              </p>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-700/60 text-xs">
              <div>
                <span className="text-slate-400 text-[11px]">السعر: </span>
                <span className="font-bold text-amber-300 font-mono text-sm">{priceFormatted}</span>
              </div>
              <span className="px-2 py-0.5 rounded-lg bg-white/10 text-slate-200 text-[11px] font-medium">
                {purposeText} • {property.propertyType}
              </span>
            </div>
          </div>

          {/* Quick Sharing Channels */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              اختر طريقة المشاركة السريعة:
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              {/* WhatsApp Share Button */}
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="py-3 px-3 rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <MessageSquare className="w-4 h-4 fill-white shrink-0" />
                <span>مشاركة بالواتساب</span>
              </button>

              {/* Facebook Share Button */}
              <button
                type="button"
                onClick={handleFacebookShare}
                className="py-3 px-3 rounded-2xl bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Facebook className="w-4 h-4 fill-white shrink-0" />
                <span>نشر بفيسبوك</span>
              </button>
            </div>

            {/* Native Mobile Share if supported */}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4 text-slate-600" />
                <span>مشاركة عبر تطبيقات أخرى (تليجرام، ماسنجر، إلخ)</span>
              </button>
            )}
          </div>

          {/* Copy Link & Full Message */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <button
              type="button"
              onClick={handleCopyTextAndLink}
              className={`w-full py-2.5 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-[#002B49] hover:bg-[#00385F] text-white shadow-xs'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>تم نسخ الرسالة ورابط الإعلان بالكامل!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#FFB300]" />
                  <span>نسخ بيانات العقار ورابط المشاركة</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
