import React, { useState } from 'react';
import { Property, ScheduledInspection } from '../types/property';
import { X, Calendar, CheckCircle2, MessageSquare, AlertCircle, Phone } from 'lucide-react';
import { validateEgyptianPhone, normalizeEgyptianPhone, isValidEgyptianPhone } from '../utils/phoneValidator';

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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-teal-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-300" />
            <h3 className="font-bold text-sm">طلب موعد معاينة ميدانية فورية</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">تم تسجيل موعد المعاينة بنجاح!</h4>
              <p className="text-xs text-slate-500 mt-1">
                سيقوم مندوب المعاينات بالتواصل معك هاتفياً أو عبر واتساب لتأكيد الحضور
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs text-right space-y-1">
              <div><strong>العقار:</strong> {property.title}</div>
              <div><strong>كود العقار:</strong> {property.code}</div>
              <div><strong>الموعد:</strong> {preferredDate} - {preferredTime}</div>
            </div>

            <button
              onClick={handleOpenWhatsApp}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <MessageSquare className="w-4 h-4" />
              <span>إرسال تأكيد الموعد عبر واتساب الآن</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            <div className="p-3 rounded-2xl bg-teal-50 border border-teal-100 text-teal-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <strong>عقار كود ({property.code}):</strong> {property.title.slice(0, 50)}...
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-800 block">اسم المستأجر / المعاين *</label>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="الاسم ثلاثي"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-600"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-800 block">رقم الهاتف أو الواتساب *</label>
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
                  className="w-full pr-3 pl-16 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-600 font-mono font-bold text-right"
                  required
                />
                {isValidEgyptianPhone(tenantPhone) ? (
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    صحيح
                  </span>
                ) : tenantPhone.length > 0 ? (
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono font-bold">
                    {tenantPhone.length}/11
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>11 رقماً يبدأ بـ (010، 011، 012، 015)</span>
                {tenantPhone.length >= 3 && (
                  <span className={`font-bold ${['010','011','012','015'].includes(tenantPhone.substring(0,3)) ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {tenantPhone.startsWith('010') ? 'فودافون' : tenantPhone.startsWith('011') ? 'اتصالات' : tenantPhone.startsWith('012') ? 'أورنج' : tenantPhone.startsWith('015') ? 'وي' : 'بادئة غير صحيحة'}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">التاريخ المفضل *</label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-600"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">الوقت المفضل</label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-600"
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
              <label className="font-bold text-slate-800 block">ملاحظات إضافية</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="مثال: سأحضر بصحبة أفراد الأسرة..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition-colors"
              >
                تأكيد حجز المعاينة
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
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
