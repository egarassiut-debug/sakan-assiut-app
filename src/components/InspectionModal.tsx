import React, { useState } from 'react';
import { Property, ScheduledInspection } from '../types/property';
import { X, Calendar, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react';
import { validateEgyptianPhone, normalizeEgyptianPhone, isValidEgyptianPhone } from '../utils/phoneValidator';
import { dbUpsertProfile } from '../lib/supabase';

interface InspectionModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onScheduleSuccess: (newInspection: ScheduledInspection) => void;
}

export const InspectionModal: React.FC<InspectionModalProps> = ({
  property,
  isOpen,
  onClose,
  onScheduleSuccess,
}) => {
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('05:00 م');
  const [notes, setNotes] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!tenantName.trim()) {
      setErrorMsg('يرجى كتابة اسم المستأجر أو المعاين');
      return;
    }

    const phoneErr = validateEgyptianPhone(tenantPhone, 'رقم الهاتف أو الواتساب');
    if (phoneErr) {
      setErrorMsg(phoneErr);
      return;
    }

    if (!preferredDate) {
      setErrorMsg('يرجى تحديد تاريخ المعاينة المفضل');
      return;
    }

    const cleanPhone = normalizeEgyptianPhone(tenantPhone);

    const inspection: ScheduledInspection = {
      id: `insp-${Date.now()}`,
      propertyId: property ? property.id : '',
      propertyCode: property ? property.code : '',
      propertyTitle: property ? property.title : '',
      district: property ? property.district : '',
      tenantName: tenantName.trim(),
      tenantPhone: cleanPhone,
      preferredDate,
      preferredTime,
      status: 'pending',
      notes,
      createdAt: new Date().toISOString().split('T')[0],
    };

    // Auto-save user to profiles table as 'مستأجر'
    dbUpsertProfile({
      fullName: tenantName.trim(),
      phone: cleanPhone,
      role: 'مستأجر',
    }).catch((e) => console.warn('Sync inspection profile error:', e));

    onScheduleSuccess(inspection);
    setIsSuccess(true);
  };

  const handleOpenWhatsApp = () => {
    if (!property) return;
    const text = encodeURIComponent(
      `مرحباً، تم تسجيل طلب معاينة ميدانية للعقار كود (${property.code}) في ${property.district} باسم: ${tenantName} يوم ${preferredDate} الساعة ${preferredTime}. نرجو تأكيد الموعد.`
    );
    window.open(`https://wa.me/201002345678?text=${text}`, '_blank');
    onClose();
    setIsSuccess(false);
  };

  if (!isOpen || !property) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#24313D]/60 backdrop-blur-xs flex items-center justify-center p-4 select-none" dir="rtl">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-[#D6DEE5] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-[#124C46] text-white p-4 flex items-center justify-between border-b border-[#0D3D38]">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#D6A84F]" />
            <h3 className="font-bold text-sm font-['Tajawal','Cairo',sans-serif]">طلب موعد معاينة ميدانية فورية</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#E4F4EC] text-[#16856B] flex items-center justify-center mx-auto border border-[#16856B]/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#24313D]">تم تسجيل موعد المعاينة بنجاح!</h4>
              <p className="text-xs text-[#5D6B78] mt-1">
                سيقوم مندوب المعاينات بالتواصل معك هاتفياً أو عبر واتساب لتأكيد الحضور
              </p>
            </div>

            <div className="bg-[#F5F7F9] p-3 rounded-xl border border-[#D6DEE5] text-xs text-right space-y-1 text-[#24313D]">
              <div><strong>العقار:</strong> {property.title}</div>
              <div><strong>كود العقار:</strong> {property.code}</div>
              <div><strong>الموعد:</strong> {preferredDate} - {preferredTime}</div>
            </div>

            <button
              onClick={handleOpenWhatsApp}
              className="w-full py-3 rounded-xl bg-[#124C46] hover:bg-[#0D3D38] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>إرسال تأكيد الموعد عبر واتساب الآن</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-[#FCE8EC] border border-[#FCE8EC] text-[#C9364F] font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#C9364F] shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            <div className="p-3 rounded-xl bg-[#EAF3EF] border border-[#DCECE7] text-[#124C46] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#124C46] shrink-0 mt-0.5" />
              <div>
                <strong>عقار كود ({property.code}):</strong> {property.title.slice(0, 50)}...
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#24313D] block">اسم المستأجر / المعاين *</label>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="الاسم ثلاثي"
                className="w-full px-3 py-2 rounded-xl border border-[#D6DEE5] bg-[#F5F7F9] text-[#24313D] placeholder:text-[#9AA5AF] focus:outline-hidden focus:border-[#124C46] focus:ring-2 focus:ring-[#124C46]/20"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#24313D] block">رقم الهاتف أو الواتساب *</label>
              <div className="relative">
                <input
                  type="tel"
                  dir="ltr"
                  value={tenantPhone}
                  onChange={(e) => {
                    const norm = normalizeEgyptianPhone(e.target.value);
                    if (norm.length <= 11) setTenantPhone(norm);
                  }}
                  placeholder="01012345678"
                  className="w-full pr-3 pl-16 py-2 rounded-xl border border-[#D6DEE5] bg-[#F5F7F9] text-[#24313D] placeholder:text-[#9AA5AF] focus:outline-hidden focus:border-[#124C46] focus:ring-2 focus:ring-[#124C46]/20 font-mono font-bold text-right"
                  required
                />
                {isValidEgyptianPhone(tenantPhone) ? (
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#16856B] font-bold bg-[#E4F4EC] px-2 py-0.5 rounded-md border border-[#16856B]/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#16856B]" />
                    صحيح
                  </span>
                ) : tenantPhone.length > 0 ? (
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#788593] font-mono font-bold">
                    {tenantPhone.length}/11
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#5D6B78]">
                <span>11 رقماً يبدأ بـ (010، 011، 012، 015)</span>
                {tenantPhone.length >= 3 && (
                  <span className={`font-bold ${['010','011','012','015'].includes(tenantPhone.substring(0,3)) ? 'text-[#16856B]' : 'text-[#C9364F]'}`}>
                    {tenantPhone.startsWith('010') ? 'فودافون' : tenantPhone.startsWith('011') ? 'اتصالات' : tenantPhone.startsWith('012') ? 'أورنج' : tenantPhone.startsWith('015') ? 'وي' : 'بادئة غير صحيحة'}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-bold text-[#24313D] block">التاريخ المفضل *</label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D6DEE5] bg-[#F5F7F9] text-[#24313D] focus:outline-hidden focus:border-[#124C46] focus:ring-2 focus:ring-[#124C46]/20"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#24313D] block">الوقت المفضل</label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D6DEE5] bg-[#F5F7F9] text-[#24313D] focus:outline-hidden focus:border-[#124C46] focus:ring-2 focus:ring-[#124C46]/20"
                >
                  <option value="11:00 ص">11:00 ص</option>
                  <option value="01:00 م">01:00 م</option>
                  <option value="03:00 م">03:00 م</option>
                  <option value="05:00 م">05:00 م</option>
                  <option value="07:00 م">07:00 م</option>
                  <option value="09:00 م">09:00 م</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#24313D] block">ملاحظات إضافية</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="مثال: سأحضر بصحبة أفراد الأسرة..."
                className="w-full px-3 py-2 rounded-xl border border-[#D6DEE5] bg-[#F5F7F9] text-[#24313D] placeholder:text-[#9AA5AF] focus:outline-hidden focus:border-[#124C46] focus:ring-2 focus:ring-[#124C46]/20"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#124C46] hover:bg-[#0D3D38] text-white font-bold transition-colors cursor-pointer shadow-xs"
              >
                تأكيد حجز المعاينة
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#F5F9F8] text-[#5D6B78] border border-[#D6DEE5] font-semibold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
