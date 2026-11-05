import React, { useState } from 'react';
import { AppUser } from '../../types/property';
import { 
  Settings, Phone, MessageSquare, ShieldCheck, Download, Database, 
  Check, Save, RefreshCw, AlertCircle, Sparkles, Sliders
} from 'lucide-react';
import { exportToCSV, exportToPrintablePDF } from '../../utils/exportUtils';
import { Property, TenantRequest } from '../../types/property';
import { SupabaseConnectionStatus } from '../SupabaseConnectionStatus';
import { getSupabaseConfig, saveSupabaseConfig, isSupabaseActive } from '../../lib/supabase';

interface AdminSettingsSectionProps {
  currentUser?: AppUser | null;
  properties: Property[];
  tenantRequests: TenantRequest[];
  users: AppUser[];
}

export const AdminSettingsSection: React.FC<AdminSettingsSectionProps> = ({
  currentUser,
  properties,
  tenantRequests,
  users,
}) => {
  const [supportPhone, setSupportPhone] = useState('01501799110');
  const [supportWhatsapp, setSupportWhatsapp] = useState('01001717780');
  const [mediationEnabled, setMediationEnabled] = useState(true);
  const [autoApproveAdmins, setAutoApproveAdmins] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  // Supabase Config Override State
  const currentConfig = getSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(currentConfig?.url || '');
  const [supabaseKey, setSupabaseKey] = useState(currentConfig?.anonKey || '');
  const [isSupabaseConfigSaved, setIsSupabaseConfigSaved] = useState(false);

  const handleSaveOperational = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleSaveSupabaseConfig = () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) return;
    saveSupabaseConfig({
      url: supabaseUrl.trim(),
      anonKey: supabaseKey.trim(),
    });
    setIsSupabaseConfigSaved(true);
    setTimeout(() => setIsSupabaseConfigSaved(false), 2500);
  };

  const handleExportPropertiesCSV = () => {
    exportToCSV(
      properties,
      [
        { header: 'الكود', accessor: (p) => p.code },
        { header: 'نوع العقار', accessor: (p) => p.propertyType },
        { header: 'العملية', accessor: (p) => p.purpose === 'sale' ? 'بيع' : 'إيجار' },
        { header: 'المنطقة', accessor: (p) => p.district },
        { header: 'السعر', accessor: (p) => p.price },
        { header: 'المساحة', accessor: (p) => p.area },
        { header: 'اسم المعلن', accessor: (p) => p.ownerName },
        { header: 'رقم الهاتف', accessor: (p) => p.ownerPhone },
        { header: 'الحالة', accessor: (p) => p.status },
        { header: 'تاريخ الإضافة', accessor: (p) => p.createdAt },
      ],
      'sakan_assiut_properties'
    );
  };

  const handleExportRequestsCSV = () => {
    exportToCSV(
      tenantRequests,
      [
        { header: 'الكود', accessor: (r) => r.requestCode || r.id },
        { header: 'نوع العقار المطلوب', accessor: (r) => r.propertyType },
        { header: 'المنطقة المفضلة', accessor: (r) => r.preferredDistrict },
        { header: 'الميزانية القصوى', accessor: (r) => r.maxPrice },
        { header: 'اسم المستأجر', accessor: (r) => r.tenantName },
        { header: 'رقم الهاتف', accessor: (r) => r.tenantPhone },
        { header: 'الحالة', accessor: (r) => r.status },
        { header: 'تاريخ الطلب', accessor: (r) => r.createdAt },
      ],
      'sakan_assiut_tenant_requests'
    );
  };

  const handleExportUsersCSV = () => {
    exportToCSV(
      users,
      [
        { header: 'المعرف', accessor: (u) => u.id },
        { header: 'الاسم', accessor: (u) => u.name },
        { header: 'الهاتف', accessor: (u) => u.phone },
        { header: 'الرتبة', accessor: (u) => u.role },
        { header: 'محظور', accessor: (u) => u.isBlocked ? 'نعم' : 'لا' },
        { header: 'تاريخ التسجيل', accessor: (u) => u.createdAt },
      ],
      'sakan_assiut_users'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-700" />
          <span>إعدادات المنظومة وتصدير البيانات</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          ضبط أرقام التواصل التشغيلية لخدمة العملاء، الربط مع Supabase، وتصدير قواعد البيانات إلى ملفات Excel/CSV.
        </p>
      </div>

      {/* Operational Settings Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
          <Phone className="w-4 h-4 text-[#124C46]" />
          <span>أرقام التواصل والوساطة المعتمدة</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              رقم هاتف الدعم الفني وخدمة العملاء:
            </label>
            <input
              type="text"
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              className="w-full text-xs p-2.5 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#124C46]"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              رقم الواتساب الرسمي للمنظومة:
            </label>
            <input
              type="text"
              value={supportWhatsapp}
              onChange={(e) => setSupportWhatsapp(e.target.value)}
              className="w-full text-xs p-2.5 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#124C46]"
              dir="ltr"
            />
          </div>
        </div>

        <div className="pt-2 space-y-2.5">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={mediationEnabled}
              onChange={(e) => setMediationEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-[#124C46]"
            />
            <span className="text-xs font-bold text-slate-700">
              تفعيل خيار "طلب وساطة إدارة سكن أسيوط" في استمارات الإضافة
            </span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={autoApproveAdmins}
              onChange={(e) => setAutoApproveAdmins(e.target.checked)}
              className="w-4 h-4 rounded text-[#124C46]"
            />
            <span className="text-xs font-bold text-slate-700">
              الموافقة التلقائية على الإعلانات المنشورة بواسطة المسؤولين دون انتظار المراجعة
            </span>
          </label>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          {isSaved ? (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
              <Check className="w-4 h-4" />
              تم حفظ الإعدادات التشغيلية بنجاح!
            </span>
          ) : <span />}

          <button
            type="button"
            onClick={handleSaveOperational}
            className="px-4 py-2 bg-[#124C46] hover:bg-[#0E3D38] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>حفظ الإعدادات</span>
          </button>
        </div>
      </div>

      {/* Supabase Connection Setup */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <span>إعدادات خادم وقاعدة بيانات Supabase</span>
          </h3>

          <SupabaseConnectionStatus />
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          يمكنك ربط تطبيق سكن أسيوط بمشروع Supabase الخاص بك عبر إدخال رابط المشروع (Project URL) ومفتاح الـ Anon Key:
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              VITE_SUPABASE_URL:
            </label>
            <input
              type="text"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              className="w-full text-xs p-2.5 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#124C46]"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              VITE_SUPABASE_ANON_KEY:
            </label>
            <input
              type="password"
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full text-xs p-2.5 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#124C46]"
              dir="ltr"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          {isSupabaseConfigSaved ? (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
              <Check className="w-4 h-4" />
              تم حفظ إعدادات Supabase وتحديث الاتصال!
            </span>
          ) : <span />}

          <button
            type="button"
            onClick={handleSaveSupabaseConfig}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>تحديث إعدادات Supabase</span>
          </button>
        </div>
      </div>

      {/* Export Reports & Data */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
          <Download className="w-4 h-4 text-blue-700" />
          <span>تصدير الجداول والبيانات (Excel / CSV)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={handleExportPropertiesCSV}
            className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-right transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">تصدير عروض العقارات</span>
              <Download className="w-4 h-4 text-[#124C46] group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-500">
              تحميل ملف CSV يحتوي على كافة بيانات عروض الإيجار والبيع والأسعار وأرقام المعلنين ({properties.length} سجل).
            </p>
          </button>

          <button
            type="button"
            onClick={handleExportRequestsCSV}
            className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-right transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">تصدير طلبات المستأجرين</span>
              <Download className="w-4 h-4 text-blue-700 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-500">
              تحميل ملف CSV يضم كافة طلبات المستأجرين والميزانيات والأحياء المفضلة ({tenantRequests.length} سجل).
            </p>
          </button>

          <button
            type="button"
            onClick={handleExportUsersCSV}
            className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-right transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">تصدير سجل المستخدمين</span>
              <Download className="w-4 h-4 text-purple-700 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-500">
              تصدير قائمة المستخدمين المسجلين وحالات الحظر ورتب المشرفين بالمنظومة ({users.length} مستخدم).
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
