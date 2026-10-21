import React, { useState } from 'react';
import { SupabaseSyncErrorEventDetail } from '../lib/supabase';
import { AlertCircle, X, Copy, Check, Database, Wrench, Settings, ArrowLeft } from 'lucide-react';

interface SupabaseSyncErrorModalProps {
  error: SupabaseSyncErrorEventDetail | null;
  onClose: () => void;
  onOpenSupabaseSettings?: () => void;
}

export const SupabaseSyncErrorModal: React.FC<SupabaseSyncErrorModalProps> = ({
  error,
  onClose,
  onOpenSupabaseSettings,
}) => {
  const [copied, setCopied] = useState(false);

  if (!error) return null;

  const handleCopy = () => {
    const errorDump = JSON.stringify(
      {
        timestamp: error.timestamp,
        operation: error.operation,
        table: error.table,
        entityId: error.entityId,
        entityCode: error.entityCode,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        technicalError: error.technicalError,
        actionRequired: error.actionRequired,
      },
      null,
      2
    );

    if (navigator.clipboard) {
      navigator.clipboard.writeText(errorDump).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  const isConfigMissing = error.code === 'CONFIG_MISSING';
  const isTableMissing = error.code === '42P01';
  const isRlsError = error.code === '42501';

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="supabase-error-title"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-rose-300 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 text-white p-4 sm:p-5 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300 shrink-0">
              <AlertCircle className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <h2 id="supabase-error-title" className="text-base sm:text-lg font-black text-white leading-tight">
                {error.title}
              </h2>
              <p className="text-xs text-rose-200 mt-0.5">
                فشل في مزامنة جدول ({error.table}) • كود الإعلان: ({error.entityCode || error.entityId || 'غير محدد'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            title="إغلاق التنبيه"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-slate-800 text-xs sm:text-sm">
          {/* Main Error Explanation Banner */}
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-rose-900">
              <Database className="w-4 h-4 text-rose-600 shrink-0" />
              <span>سبب عدم وصول البيانات إلى قاعدة بيانات Supabase:</span>
            </div>
            <p className="text-rose-800 font-semibold leading-relaxed whitespace-pre-line text-xs sm:text-sm">
              {error.message}
            </p>
          </div>

          {/* Technical Error Code & Details Box */}
          <div className="p-3 rounded-2xl bg-slate-900 text-slate-100 font-mono text-[11px] sm:text-xs space-y-2 border border-slate-700 select-text">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
              <span className="text-slate-400 font-sans font-bold">التفاصيل الفنية الصريحة (Console Error):</span>
              {error.code && (
                <span className="px-2 py-0.5 rounded-md bg-rose-900/80 border border-rose-500/50 text-rose-300 font-bold">
                  Code: {error.code}
                </span>
              )}
            </div>

            {error.technicalError && (
              <div className="text-rose-400 break-all leading-normal">
                <span className="text-slate-400 font-sans font-semibold">Message: </span>
                {error.technicalError}
              </div>
            )}

            {error.details && (
              <div className="text-amber-300 break-all leading-normal">
                <span className="text-slate-400 font-sans font-semibold">Details: </span>
                {error.details}
              </div>
            )}

            {error.hint && (
              <div className="text-emerald-300 break-all leading-normal">
                <span className="text-slate-400 font-sans font-semibold">Hint: </span>
                {error.hint}
              </div>
            )}

            <div className="text-slate-400 pt-1 text-[10px] flex items-center justify-between">
              <span>الجدول: {error.table} | العملية: {error.operation}</span>
              <span>التوقيت: {error.timestamp}</span>
            </div>
          </div>

          {/* Actionable Solution Guidance */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <Wrench className="w-4 h-4 text-amber-700 shrink-0" />
              <span>خطوات الحل الموصى بها:</span>
            </div>
            <p className="text-amber-900 text-xs sm:text-sm font-medium leading-relaxed">
              {error.actionRequired || 'يرجى مراجعة إعدادات مشروع Supabase وجداول قاعدة البيانات.'}
            </p>

            {isTableMissing && (
              <div className="mt-2 p-2.5 rounded-xl bg-white/80 border border-amber-300 text-[11px] text-amber-950 space-y-1">
                <p className="font-bold">💡 لتثبيت الجدول تلقائياً:</p>
                <p>1. افتح مشروعك في لوحة تحكم Supabase.</p>
                <p>2. توجه إلى قسم <strong>SQL Editor</strong>.</p>
                <p>3. الصق محتوى ملف <code>supabase_schema.sql</code> الموجود بمشروع التطبيق واضغط <strong>Run</strong>.</p>
              </div>
            )}

            {isRlsError && (
              <div className="mt-2 p-2.5 rounded-xl bg-white/80 border border-amber-300 text-[11px] text-amber-950 space-y-1">
                <p className="font-bold">💡 لحل مشكلة صلاحيات RLS:</p>
                <p>تأكد من تشغيل سياسات الأمان RLS المرفقة بملف <code>supabase_schema.sql</code> أو تفعيل إذن الإدراج العام <code>FOR INSERT WITH CHECK (true)</code>.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="py-2 px-3.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
              <span>{copied ? 'تم نسخ التقرير' : 'نسخ الخطأ الصريح'}</span>
            </button>

            {isConfigMissing && onOpenSupabaseSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSupabaseSettings();
                }}
                className="py-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>ضبط بيانات Supabase الآن</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-xs sm:text-sm font-bold shadow-md transition-colors cursor-pointer"
          >
            فهمت، حسناً
          </button>
        </div>
      </div>
    </div>
  );
};
