import React, { useState, useEffect, useCallback } from 'react';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Copy, 
  Check, 
  ShieldCheck, 
  Zap, 
  Clock, 
  Terminal, 
  Code, 
  Play, 
  FileText,
  Lock,
  Sparkles
} from 'lucide-react';
import { 
  inspectDatabaseHealth, 
  fetchAppliedMigrations, 
  applyMigrationViaRpc, 
  REGISTERED_MIGRATIONS, 
  SchemaHealthReport, 
  AppliedMigrationRecord, 
  MigrationDefinition,
  getConsolidatedMigrationsSql 
} from '../utils/dbMigrationManager';

interface DatabaseMigrationsTabProps {
  onAddToast?: (toast: { type: 'success' | 'error' | 'info' | 'warning'; title: string; message: string }) => void;
}

export const DatabaseMigrationsTab: React.FC<DatabaseMigrationsTabProps> = ({ onAddToast }) => {
  const [health, setHealth] = useState<SchemaHealthReport | null>(null);
  const [appliedMigrations, setAppliedMigrations] = useState<AppliedMigrationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeSqlModal, setActiveSqlModal] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [healthData, appliedData] = await Promise.all([
        inspectDatabaseHealth(),
        fetchAppliedMigrations(),
      ]);
      setHealth(healthData);
      setAppliedMigrations(appliedData);
    } catch (err) {
      console.warn('Error loading migration status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopyConsolidatedSql = () => {
    const sql = getConsolidatedMigrationsSql();
    navigator.clipboard.writeText(sql).then(() => {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
      if (onAddToast) {
        onAddToast({
          type: 'success',
          title: 'تم نسخ كود SQL الشامل بنجاح',
          message: 'يمكنك لصقه وتشغيله مباشرة في Supabase > SQL Editor لتطبيق كافة التحديثات وتحديث الكاش.',
        });
      }
    }).catch(() => {
      if (onAddToast) {
        onAddToast({
          type: 'error',
          title: 'فشل النسخ التلقائي',
          message: 'يرجى تحديد النص ونسخه يدوياً.',
        });
      }
    });
  };

  const handleApplySingleMigration = async (migration: MigrationDefinition) => {
    setIsApplying(migration.version);
    try {
      const res = await applyMigrationViaRpc(migration);
      if (res.success) {
        if (onAddToast) {
          onAddToast({
            type: 'success',
            title: `تم تطبيق الترقية (${migration.version}) بنجاح`,
            message: res.message || 'تم تحديث المخطط وقاعدة البيانات.',
          });
        }
        await loadData();
      } else {
        if (onAddToast) {
          onAddToast({
            type: 'warning',
            title: 'تنبيه في تطبيق الترقية',
            message: res.error || 'تعذر التنفيذ المباشر. يرجى نسخ كود SQL وتشغيله في Supabase SQL Editor.',
          });
        }
      }
    } catch (err: any) {
      if (onAddToast) {
        onAddToast({
          type: 'error',
          title: 'فشل تنفيذ الميجريشن',
          message: err?.message || String(err),
        });
      }
    } finally {
      setIsApplying(null);
    }
  };

  const isVersionApplied = (version: string) => {
    return appliedMigrations.some((m) => m.version === version && m.status === 'applied');
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200 font-['Cairo'] pb-12">
      
      {/* 1. Header Card with Security Policy Banner */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#124C46] text-[#D6A84F] flex items-center justify-center shrink-0 shadow-xs">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  نظام ترقيات ومزامنة قاعدة البيانات (Database Migrations)
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  سياسة أمان مفعلة 🛡️
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                متابعة الفروقات بين التطبيق وقاعدة بيانات Supabase الحية، وتطبيق الترقيات غير المدمرة بأمان مع الاحتفاظ بسجل وتشفير Checksum.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
              title="إعادة فحص المخطط"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#124C46]' : ''}`} />
              <span>إعادة فحص المخطط</span>
            </button>

            <button
              type="button"
              onClick={handleCopyConsolidatedSql}
              className="px-4 py-2 rounded-xl bg-[#124C46] hover:bg-[#0D3D38] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              title="نسخ كود SQL الشامل لتشغيله في Supabase SQL Editor"
            >
              {copiedSql ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4 text-[#D6A84F]" />}
              <span>{copiedSql ? 'تم النسخ بنجاح' : 'نسخ SQL المجمع (SQL Editor)'}</span>
            </button>
          </div>
        </div>

        {/* Security Policy Badge */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-700 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-slate-900">
              قواعد وضوابط الأمان المعتمدة في النظام:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
              <li>الترقيات <strong className="text-emerald-700">غير المدمرة</strong> (إضافة أعمدة وجداول وفهارس جديدة) هي فقط المسموح بتطبيقها تلقائياً.</li>
              <li>أي عملية <strong className="text-rose-700">مدمرة أو حساسة</strong> (حذف أعمدة أو جداول أو تغيير سياسات RLS) محظورة تماماً وتتطلب موافقتك الصريحة.</li>
              <li>عدم استخدام أو كشف أي مفاتيح إدارية سرية (Service Role) في واجهة المستخدم الأمامية.</li>
              <li>تسجيل رقم كل إصدار وبصمة التشفير (Checksum) وتاريخ التنفيذ لمنع تكرار أي ترقية.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 2. Schema Health & Live Column Status */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-sm">
              الحالة الميدانية لجداول وأعمدة Supabase
            </h3>
          </div>
          {health && (
            <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
              health.isFullySynced 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {health.isFullySynced ? '✅ قاعدة البيانات متطابقة بنسبة 100%' : '⚠️ توجد حقول/جداول تحتاج تطبيق ترقية'}
            </span>
          )}
        </div>

        {health ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Check 1 */}
            <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
              health.checks.tenantRequestsLegalStatus ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-900' : 'bg-rose-50/60 border-rose-200 text-rose-900'
            }`}>
              {health.checks.tenantRequestsLegalStatus ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold text-xs block">tenant_requests.legal_status</span>
                <span className="text-[11px] opacity-80">
                  {health.checks.tenantRequestsLegalStatus ? 'موجود ومفهرس' : 'مفقود (سبب خطأ PGRST204)'}
                </span>
              </div>
            </div>

            {/* Check 2 */}
            <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
              health.checks.propertiesLegalStatus ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-900' : 'bg-rose-50/60 border-rose-200 text-rose-900'
            }`}>
              {health.checks.propertiesLegalStatus ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold text-xs block">properties.legal_status</span>
                <span className="text-[11px] opacity-80">
                  {health.checks.propertiesLegalStatus ? 'موجود ومفهرس' : 'مفقود في جدول العقارات'}
                </span>
              </div>
            </div>

            {/* Check 3 */}
            <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
              health.checks.propertyRatingsComplete ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-900' : 'bg-amber-50/60 border-amber-200 text-amber-900'
            }`}>
              {health.checks.propertyRatingsComplete ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold text-xs block">property_ratings (الأعمدة الكاملة)</span>
                <span className="text-[11px] opacity-80">
                  {health.checks.propertyRatingsComplete ? 'الأعمدة الـ 8 متوفرة' : 'ينقصه تفاصيل التقييم'}
                </span>
              </div>
            </div>

            {/* Check 4 */}
            <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
              health.checks.trendPostsTable ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-900' : 'bg-amber-50/60 border-amber-200 text-amber-900'
            }`}>
              {health.checks.trendPostsTable ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold text-xs block">جدول trend_posts</span>
                <span className="text-[11px] opacity-80">
                  {health.checks.trendPostsTable ? 'منشأ ومفعل RLS' : 'غير منشأ في Supabase'}
                </span>
              </div>
            </div>

            {/* Check 5 */}
            <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
              health.checks.auditLogsTable ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-900' : 'bg-amber-50/60 border-amber-200 text-amber-900'
            }`}>
              {health.checks.auditLogsTable ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold text-xs block">جدول audit_logs</span>
                <span className="text-[11px] opacity-80">
                  {health.checks.auditLogsTable ? 'منشأ ومفعل RLS' : 'غير منشأ في Supabase'}
                </span>
              </div>
            </div>

            {/* Check 6 */}
            <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
              health.hasSchemaMigrationsTable ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-900' : 'bg-amber-50/60 border-amber-200 text-amber-900'
            }`}>
              {health.hasSchemaMigrationsTable ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold text-xs block">جدول schema_migrations</span>
                <span className="text-[11px] opacity-80">
                  {health.hasSchemaMigrationsTable ? 'جدول التتبع متوفر' : 'يحتاج إنشاء لتسجيل التحديثات'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-500">
            جاري فحص المخطط...
          </div>
        )}
      </div>

      {/* 3. Migrations Catalog & Execution Registry */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              سجل ترقيات الميجريشن المعتمدة في النظام ({REGISTERED_MIGRATIONS.length})
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              كل ملف يحتوي على كود ترقية SQL محكم مع Checksum ورقم تسلسلي.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {REGISTERED_MIGRATIONS.map((m) => {
            const applied = isVersionApplied(m.version);
            const isCurrentlyApplying = isApplying === m.version;

            return (
              <div
                key={m.version}
                className={`p-4 rounded-2xl border transition-all ${
                  applied 
                    ? 'bg-slate-50/60 border-slate-200 text-slate-800' 
                    : 'bg-white border-amber-300 shadow-xs ring-1 ring-amber-100'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-800">
                        {m.version}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900">{m.titleAr}</h4>
                      {applied ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>مطبقة في قاعدة البيانات</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                          قيد الانتظار للتطبيق
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">{m.description}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono mt-1">
                      <span>بصمة التشفير: {m.checksum}</span>
                      <span>•</span>
                      <span>نوع الترقية: {m.isDestructive ? '⚠️ حساسة' : 'غير مدمرة (آمنة)'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveSqlModal(activeSqlModal === m.version ? null : m.version)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      title="عرض كود SQL"
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>{activeSqlModal === m.version ? 'إخفاء SQL' : 'عرض SQL'}</span>
                    </button>

                    {!applied && (
                      <button
                        type="button"
                        onClick={() => handleApplySingleMigration(m)}
                        disabled={isCurrentlyApplying}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs active:scale-95"
                        title="تطبيق الترقية آلياً"
                      >
                        {isCurrentlyApplying ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                        <span>{isCurrentlyApplying ? 'جاري التطبيق...' : 'تطبيق آلي'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* SQL Code Preview Collapsible */}
                {activeSqlModal === m.version && (
                  <div className="mt-3 p-3.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto relative border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(m.sql);
                        if (onAddToast) {
                          onAddToast({
                            type: 'success',
                            title: 'تم نسخ SQL',
                            message: `تم نسخ كود الترقية (${m.version}) بنجاح.`,
                          });
                        }
                      }}
                      className="absolute top-2 left-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                      title="نسخ كود SQL لهذه الترقية"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <pre className="whitespace-pre-wrap leading-relaxed pr-2">{m.sql}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
