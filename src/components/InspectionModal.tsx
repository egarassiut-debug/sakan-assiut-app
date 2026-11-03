import React, { useState } from 'react';
import { Property, ScheduledInspection } from '../types/property';
import { X, Calendar, Clock, User, Phone, CheckCircle2, AlertCircle } from 'lucide-react';
import { validateEgyptianPhone, normalizeEgyptianPhone, isValidEgyptianPhone } from '../utils/phoneValidator';

export interface InspectionModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onScheduleSuccess: (inspection: Omit<ScheduledInspection, 'id' | 'createdAt' | 'status'>) => void;
}

export const InspectionModal: React.FC<InspectionModalProps> = ({
  property,
  isOpen,
  onClose,
  onScheduleSuccess,
}) => {
  if (!isOpen || !property) return null;

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('14:00');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!clientName.trim()) {
      setErrorMsg('يرجى إدخال اسمك الكريم.');
      return;
    }

    const phoneError = validateEgyptianPhone(clientPhone, 'رقم الهاتف');
    if (phoneError) {
      setErrorMsg(phoneError);
      return;
    }

    if (!preferredDate) {
      setErrorMsg('يرجى تحديد تاريخ المعاينة المطلوب.');
      return;
    }

    onScheduleSuccess({
      propertyId: property.id,
      propertyCode: property.code,
      clientName: clientName.trim(),
      clientPhone: normalizeEgyptianPhone(clientPhone),
      preferredDate,
      preferredTime,
      notes: notes.trim() || undefined,
      fee: property.fee || 200,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden text-right">
        {/* Header */}
        <div className="bg-[#124C46] text-white p-5 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#D6A84F]" />
              <span>حجز موعد معاينة ميدانية</span>
            </h3>
            <p className="text-xs text-white/70 mt-0.5">
              عقار كود: <span className="font-mono text-[#D6A84F] font-bold">{property.code}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">الاسم بالكامل *</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="أحمد محمد"
                required
                className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#124C46]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف (واتساب / اتصال) *</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                dir="ltr"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="01012345678"
                required
                className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-right focus:outline-hidden focus:ring-1 focus:ring-[#124C46]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ المعاينة *</label>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الوقت المفضل</label>
              <input
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات إضافية (اختياري)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي استفسار أو تفضيل تود إبلاغ الإدارة به قبل المعاينة..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-hidden"
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
            <strong>ملاحظة:</strong> رسوم المعاينة الميدانية الرمزية ({property.fee || 200} ج.م) تشمل تأمين المعاينة ومرافقة مندوب معتمد لمطابقة العقار مع الإعلان.
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl bg-[#124C46] hover:bg-[#0D3D38] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4 text-[#D6A84F]" />
              <span>تأكيد طلب المعاينة</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InspectionModal;
