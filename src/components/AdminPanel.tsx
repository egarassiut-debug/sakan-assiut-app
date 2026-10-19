import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Property, PropertyStatus, ScheduledInspection, BlockedUser, TenantRequest, AppUser } from '../types/property';
import { DropdownCategory, UtilityOptionDefinition } from '../data/dropdownOptions';
import { DropdownManager } from './DropdownManager';
import { AdminRoleManagement } from './AdminRoleManagement';
import { SettingsIcon, VerifiedUserIcon } from './FlutterIcons';
import { validateEgyptianPhone, normalizeEgyptianPhone } from '../utils/phoneValidator';
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { 
  ShieldCheck, CheckCircle2, XCircle, Trash2, Eye, Lock, 
  UserX, Ban, AlertTriangle, Calendar, Plus, Search,
  Edit3, MessageSquare, Users, UserCheck, Download, FileSpreadsheet, Printer, ChevronDown,
  SlidersHorizontal, BarChart3, RotateCcw, Building2, Menu, X, ChevronLeft,
  Phone, MessageCircle, User, Database, RefreshCw
} from 'lucide-react';
import { UserManagement } from './UserManagement';
import { exportToCSV, exportToPrintablePDF } from '../utils/exportUtils';
import { 
  isSupabaseActive, 
  getSupabaseConfig, 
  saveSupabaseConfig, 
  dbFetchProperties, 
  dbFetchTenantRequests, 
  dbUpsertProperty, 
  dbUpsertTenantRequest 
} from '../lib/supabase';

interface AdminPanelProps {
  currentUser?: AppUser | null;
  properties: Property[];
  onUpdatePropertyStatus: (propertyId: string, newStatus: PropertyStatus, note?: string) => void;
  onOpenDetails: (property: Property) => void;
  onDeleteProperty?: (propertyId: string) => void;
  onEditProperty?: (property: Property) => void;
  tenantRequests?: TenantRequest[];
  onOpenTenantRequestDetails?: (request: TenantRequest) => void;
  onUpdateTenantRequestStatus?: (requestId: string, newStatus: any, note?: string) => void;
  onEditTenantRequest?: (request: TenantRequest) => void;
  onDeleteTenantRequest?: (requestId: string) => void;
  dropdownCategories: Record<string, DropdownCategory>;
  onUpdateDropdownCategories: (catKey: string, updatedCat: DropdownCategory) => void;
  utilityDefinitions: UtilityOptionDefinition[];
  onUpdateUtilityDefinitions: (updated: UtilityOptionDefinition[]) => void;
  onResetDefaults?: () => void;
  onLockAdmin?: () => void;
  inspections?: ScheduledInspection[];
  blockedUsers?: BlockedUser[];
  onAddBlockedUser?: (user: Omit<BlockedUser, 'id' | 'blockedAt'>) => void;
  onRemoveBlockedUser?: (id: string) => void;
  onUpdateInspectionStatus?: (id: string, status: 'pending' | 'confirmed' | 'completed' | 'cancelled', feePaid?: boolean) => void;
  isDrawerOpen?: boolean;
  setIsDrawerOpen?: (open: boolean) => void;
  onToggleDrawer?: (open?: boolean) => void;
  onCloseDrawer?: () => void;
}

/**
 * AdminControlPanelScreen:
 * Divided strictly into TWO Top Tabs matching Flutter AdminControlPanelScreen:
 * Tab 0: 'التحكم بالواجهة والفلاتر' (Icons.settings)
 *        - تعديل الفلاتر، القوائم المنسدلة، وشكل التطبيق وإحصائيات Recharts
 * Tab 1: 'الموافقات والبلوكات المعاينات' (Icons.verified_user)
 *        - مراجعة الإعلانات (الموافقات والرفض)، حظر المستخدمين (البلوكات)، وإدارة المعاينات
 */
export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  properties,
  onUpdatePropertyStatus,
  onOpenDetails,
  onDeleteProperty,
  onEditProperty,
  tenantRequests = [],
  onOpenTenantRequestDetails,
  onUpdateTenantRequestStatus,
  onEditTenantRequest,
  onDeleteTenantRequest,
  dropdownCategories,
  onUpdateDropdownCategories,
  utilityDefinitions,
  onUpdateUtilityDefinitions,
  onResetDefaults,
  onLockAdmin,
  inspections = [],
  blockedUsers = [],
  onAddBlockedUser,
  onRemoveBlockedUser,
  onUpdateInspectionStatus,
  isDrawerOpen: propIsDrawerOpen,
  setIsDrawerOpen: propSetIsDrawerOpen,
  onToggleDrawer,
  onCloseDrawer,
}) => {
  // Active Section & Slide-over Drawer State
  const [activeSection, setActiveSection] = useState<
    'dropdowns' | 'moderation' | 'inspections' | 'users' | 'admins' | 'analytics' | 'blocks' | 'export_settings'
  >('dropdowns');
  const [internalDrawerOpen, setInternalDrawerOpen] = useState(false);

  const isDrawerOpen = propIsDrawerOpen !== undefined ? propIsDrawerOpen : internalDrawerOpen;
  const setIsDrawerOpen = (open: boolean) => {
    setInternalDrawerOpen(open);
    if (propSetIsDrawerOpen) propSetIsDrawerOpen(open);
    if (onToggleDrawer) onToggleDrawer(open);
    if (!open && onCloseDrawer) onCloseDrawer();
  };

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDrawerOpen(false);
    };
    if (isDrawerOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  const pendingModerationCount = useMemo(() => {
    const pendingProps = properties.filter(
      (p) =>
        (p.isApproved === false || p.status === 'pending' || p.status === 'pending_approval' || p.status === 'under_review') &&
        p.status !== 'needs_completion' &&
        p.status !== 'rejected'
    ).length;
    const pendingReqs = tenantRequests.filter(
      (r) =>
        (r.isApproved === false || r.status === 'pending' || r.status === 'pending_approval' || r.status === 'under_review') &&
        r.status !== 'needs_completion' &&
        r.status !== 'rejected'
    ).length;
    return pendingProps + pendingReqs;
  }, [properties, tenantRequests]);

  const pendingInspectionsCount = useMemo(() => {
    return inspections.filter((i) => i.status === 'pending').length;
  }, [inspections]);

  // Moderation type: properties (عروض) or requests (طلبات)
  const [moderationType, setModerationType] = useState<'properties' | 'requests'>('properties');

  // Moderation filter
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [moderationSearch, setModerationSearch] = useState('');

  // Inline note input state for needs_completion
  const [noteInputId, setNoteInputId] = useState<string | null>(null);
  const [customNote, setCustomNote] = useState<string>('');

  // New Block Form Modal / Inline State
  const [isAddBlockOpen, setIsAddBlockOpen] = useState(false);
  const [blockName, setBlockName] = useState('');
  const [blockPhone, setBlockPhone] = useState('');
  const [blockRole, setBlockRole] = useState<'owner' | 'broker' | 'tenant'>('tenant');
  const [blockReason, setBlockReason] = useState('');
  const [blockPhoneError, setBlockPhoneError] = useState<string | null>(null);

  // Supabase Configuration State & Migration
  const initialSbConfig = useMemo(() => getSupabaseConfig(), []);
  const [sbUrl, setSbUrl] = useState(initialSbConfig?.url || '');
  const [sbAnonKey, setSbAnonKey] = useState(initialSbConfig?.anonKey || '');
  const [sbSaveMsg, setSbSaveMsg] = useState<string | null>(null);
  const [isPushingAllToSb, setIsPushingAllToSb] = useState(false);

  const handleSaveSbConfig = () => {
    if (!sbUrl.trim() || !sbAnonKey.trim()) {
      setSbSaveMsg('يرجى إدخال كل من رابط المشروع ومفتاح الوصول (Anon Key).');
      return;
    }
    saveSupabaseConfig({ url: sbUrl.trim(), anonKey: sbAnonKey.trim() });
    setSbSaveMsg('تم حفظ وتحديث إعدادات Supabase بنجاح! جاري الاتصال المباشر بقاعدة البيانات.');
    setTimeout(() => setSbSaveMsg(null), 4000);
  };

  const handlePushAllToSupabase = async () => {
    if (!isSupabaseActive()) {
      alert('يرجى حفظ إعدادات Supabase أولاً والتأكد من صحة الرابط والمفتاح.');
      return;
    }
    setIsPushingAllToSb(true);
    try {
      let countP = 0;
      let countR = 0;
      for (const p of properties) {
        await dbUpsertProperty(p);
        countP++;
      }
      for (const r of tenantRequests) {
        await dbUpsertTenantRequest(r);
        countR++;
      }
      setSbSaveMsg(`تم رفع ومزامنة (${countP}) عقار و (${countR}) طلب بنجاح إلى قاعدة بيانات Supabase!`);
    } catch (err) {
      setSbSaveMsg('حدث خطأ أثناء مزامنة البيانات.');
      console.error(err);
    } finally {
      setIsPushingAllToSb(false);
      setTimeout(() => setSbSaveMsg(null), 5000);
    }
  };

  // Recharts Data
  const rentTotal = properties.filter((p) => p.purpose === 'rent').length;
  const saleTotal = properties.filter((p) => p.purpose === 'sale').length;
  const totalPurposeCount = rentTotal + saleTotal;
  const rentPct = totalPurposeCount > 0 ? Math.round((rentTotal / totalPurposeCount) * 100) : 0;
  const salePct = totalPurposeCount > 0 ? Math.round((saleTotal / totalPurposeCount) * 100) : 0;

  const purposeData = useMemo(() => {
    return [
      { name: `عقارات للإيجار (${rentPct}%)`, value: rentTotal, color: '#002B49' },
      { name: `عقارات للبيع (${salePct}%)`, value: saleTotal, color: '#FFB300' },
    ];
  }, [rentTotal, saleTotal, rentPct, salePct]);

  const districtData = useMemo(() => {
    const counts: Record<string, { rent: number; sale: number; total: number }> = {};
    properties.forEach((p) => {
      const dist = p.district || 'أخرى';
      if (!counts[dist]) counts[dist] = { rent: 0, sale: 0, total: 0 };
      if (p.purpose === 'rent') counts[dist].rent += 1;
      else counts[dist].sale += 1;
      counts[dist].total += 1;
    });

    return Object.entries(counts).map(([name, val]) => ({
      name,
      إيجار: val.rent,
      بيع: val.sale,
      الإجمالي: val.total,
    }));
  }, [properties]);

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      if (filterStatus === 'pending') {
        const isPending =
          (p.isApproved === false || p.status === 'pending' || p.status === 'pending_approval' || p.status === 'under_review') &&
          p.status !== 'needs_completion' &&
          p.status !== 'rejected';
        if (!isPending) return false;
      } else if (filterStatus === 'needs_completion') {
        if (p.status !== 'needs_completion') return false;
      } else if (filterStatus === 'approved') {
        if (p.isApproved === false || p.status !== 'approved') return false;
      } else if (filterStatus === 'rejected') {
        if (p.status !== 'rejected') return false;
      }
      if (moderationSearch.trim()) {
        const q = moderationSearch.toLowerCase();
        return (
          p.code.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.district.toLowerCase().includes(q) ||
          (p.ownerPhone && p.ownerPhone.includes(q)) ||
          (p.ownerName && p.ownerName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [properties, filterStatus, moderationSearch]);

  const filteredRequests = useMemo(() => {
    return tenantRequests.filter((r) => {
      if (filterStatus === 'pending') {
        const isPending =
          (r.isApproved === false || r.status === 'pending' || r.status === 'pending_approval' || r.status === 'under_review') &&
          r.status !== 'needs_completion' &&
          r.status !== 'rejected';
        if (!isPending) return false;
      } else if (filterStatus === 'needs_completion') {
        if (r.status !== 'needs_completion') return false;
      } else if (filterStatus === 'approved') {
        if (r.isApproved === false || (r.status !== 'approved' && r.status !== 'active')) return false;
      } else if (filterStatus === 'rejected') {
        if (r.status !== 'rejected') return false;
      }
      if (moderationSearch.trim()) {
        const q = moderationSearch.toLowerCase();
        return (
          (r.requestCode && r.requestCode.toLowerCase().includes(q)) ||
          r.propertyType.toLowerCase().includes(q) ||
          r.preferredDistrict.toLowerCase().includes(q) ||
          (r.tenantPhone && r.tenantPhone.includes(q)) ||
          (r.tenantName && r.tenantName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [tenantRequests, filterStatus, moderationSearch]);

  const handleCreateBlock = (e: React.FormEvent) => {
    e.preventDefault();
    setBlockPhoneError(null);
    if (!blockName.trim() || !blockPhone.trim() || !onAddBlockedUser) return;

    const phoneErr = validateEgyptianPhone(blockPhone, 'رقم الهاتف المراد حظره');
    if (phoneErr) {
      setBlockPhoneError(phoneErr);
      return;
    }

    onAddBlockedUser({
      name: blockName.trim(),
      phone: normalizeEgyptianPhone(blockPhone),
      role: blockRole,
      reason: blockReason.trim() || 'مخالفة شروط وسياسات التطبيق في أسيوط',
    });
    setBlockName('');
    setBlockPhone('');
    setBlockReason('');
    setBlockPhoneError(null);
    setIsAddBlockOpen(false);
  };

  // Export State
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Export Columns Configuration
  const propertyExportColumns = [
    { header: 'كود العقار', accessor: (p: Property) => p.code },
    { header: 'عنوان الإعلان', accessor: (p: Property) => p.title },
    { header: 'الغرض', accessor: (p: Property) => (p.purpose === 'rent' ? 'إيجار' : 'بيع') },
    { header: 'نوع العقار', accessor: (p: Property) => p.propertyType },
    { header: 'الحي / المنطقة', accessor: (p: Property) => p.district },
    { header: 'السعر (ج.م)', accessor: (p: Property) => p.price },
    { header: 'هاتف المعلن', accessor: (p: Property) => p.ownerPhone || '-' },
    { header: 'اسم المعلن', accessor: (p: Property) => p.ownerName || '-' },
    {
      header: 'حالة العقار',
      accessor: (p: Property) =>
        p.status === 'approved'
          ? 'معتمد'
          : p.status === 'pending'
          ? 'قيد المراجعة'
          : p.status === 'needs_completion'
          ? 'استكمال بيانات'
          : 'مرفوض',
    },
    { header: 'تاريخ الإضافة', accessor: (p: Property) => (p.createdAt ? new Date(p.createdAt).toLocaleDateString('ar-EG') : '-') },
  ];

  const requestExportColumns = [
    { header: 'كود الطلب', accessor: (r: TenantRequest) => r.requestCode || r.id },
    { header: 'اسم صاحب الطلب', accessor: (r: TenantRequest) => r.tenantName },
    { header: 'رقم الهاتف', accessor: (r: TenantRequest) => r.tenantPhone },
    { header: 'نوع العقار المطلوب', accessor: (r: TenantRequest) => r.propertyType },
    { header: 'الحي المفضل', accessor: (r: TenantRequest) => r.preferredDistrict },
    { header: 'الحد الأقصى للميزانية', accessor: (r: TenantRequest) => r.maxPrice },
    {
      header: 'حالة الطلب',
      accessor: (r: TenantRequest) =>
        r.status === 'approved' || r.status === 'active' ? 'معتمد' : r.status === 'pending' ? 'قيد المراجعة' : 'مرفوض',
    },
    { header: 'تاريخ الطلب', accessor: (r: TenantRequest) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-EG') : '-') },
  ];

  const handleExportPropertiesCSV = () => {
    exportToCSV(filteredProperties, propertyExportColumns, 'قائمة_عقارات_أسيوط');
    setIsExportOpen(false);
  };

  const handleExportPropertiesPDF = () => {
    exportToPrintablePDF('سجل إعلانات العقارات المعروضة - أسيوط', filteredProperties, propertyExportColumns, 'تقرير العقارات المعروضة للإيجار والبيع');
    setIsExportOpen(false);
  };

  const handleExportRequestsCSV = () => {
    exportToCSV(filteredRequests, requestExportColumns, 'طلبات_المستأجرين_أسيوط');
    setIsExportOpen(false);
  };

  const handleExportRequestsPDF = () => {
    exportToPrintablePDF('سجل طلبات المستأجرين والباحثين - أسيوط', filteredRequests, requestExportColumns, 'تقرير طلبات الإيجار والشراء المسجلة');
    setIsExportOpen(false);
  };

  const menuItems = [
    {
      id: 'dropdowns' as const,
      title: 'أدوات الواجهة والفلاتر',
      subtitle: 'الأحياء، أنواع الوحدات، والمرافق',
      icon: SlidersHorizontal,
    },
    {
      id: 'moderation' as const,
      title: 'الموافقات ومراجعة الإعلانات',
      subtitle: 'اعتماد عروض العقارات وطلبات السكن',
      icon: VerifiedUserIcon,
      badge: pendingModerationCount > 0 ? pendingModerationCount : null,
      badgeColor: 'bg-rose-500 text-white animate-pulse',
    },
    {
      id: 'inspections' as const,
      title: 'المعاينات الميدانية',
      subtitle: 'مواعيد المعاينات وتأكيد الرسوم',
      icon: Calendar,
      badge: pendingInspectionsCount > 0 ? pendingInspectionsCount : null,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'users' as const,
      title: 'إدارة المستخدمين',
      subtitle: 'حسابات العملاء والوسطاء والملاك',
      icon: UserCheck,
    },
    {
      id: 'admins' as const,
      title: 'إدارة المدراء والصلاحيات',
      subtitle: 'فريق الإدارة وسجل العمليات',
      icon: Users,
    },
    {
      id: 'analytics' as const,
      title: 'إحصائيات العقارات',
      subtitle: 'تحليلات الأسعار والرسوم البيانية',
      icon: BarChart3,
    },
    {
      id: 'blocks' as const,
      title: 'حظر المستخدمين (البلوكات)',
      subtitle: 'قائمة الأرقام المحظورة',
      icon: Ban,
      badge: blockedUsers.length > 0 ? blockedUsers.length : null,
      badgeColor: 'bg-slate-200 text-slate-800',
    },
    {
      id: 'export_settings' as const,
      title: 'الإعدادات وتصدير البيانات',
      subtitle: 'تصدير Excel/PDF وضبط النظام',
      icon: Download,
    },
  ];
  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* Slide-over Drawer (القائمة الجانبية المنزلقة) & Backdrop Overlay */}
      {/* ========================================================================= */}
      {/* 1. Backdrop Overlay */}
      <div
        onClick={() => setIsDrawerOpen(false)}
        className={`fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 transition-opacity duration-300 ease-in-out ${
          isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* 2. Slide-over Drawer Panel (في حدود نصف الشاشة: 50% من عرض الشاشة) */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 h-full w-[50vw] max-w-[50vw] bg-white shadow-2xl flex flex-col border-l border-slate-200 transform transition-transform duration-300 ease-out ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="قائمة لوحة التحكم"
      >
        {/* Drawer Header */}
        <div className="bg-[#0F172A] text-white p-3 sm:p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400 shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs sm:text-base font-bold text-white truncate">لوحة التحكم</h3>
                <span className="hidden sm:inline-block text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">إدارة</span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-300 truncate hidden sm:block">أقسام وإعدادات سكن أسيوط</p>
            </div>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="إغلاق القائمة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Menu Items List */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-3.5 space-y-1.5 divide-y divide-slate-100">
          <div className="text-[10px] sm:text-xs font-bold text-slate-400 px-2 py-1 uppercase tracking-wider flex items-center justify-between">
            <span className="truncate">أقسام الإدارة</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono font-bold shrink-0">
              {menuItems.length}
            </span>
          </div>

          <nav className="space-y-1.5 pt-2">
            {menuItems.map((item) => {
              const isActive = activeSection === item.id;
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    setIsDrawerOpen(false); // Closes automatically when any option is pressed
                  }}
                  className={`w-full p-2.5 sm:p-3 rounded-xl flex items-center justify-between gap-2 text-right transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-[#EFF6FF] border-blue-200 text-[#0F172A] font-bold shadow-xs ring-1 ring-blue-500/20'
                      : 'bg-white border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                  }`}
                  title={item.title}
                >
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isActive ? 'bg-[#1D4ED8] text-white shadow-2xs' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs sm:text-sm truncate ${isActive ? 'text-[#0F172A] font-bold' : 'text-slate-800 font-semibold'}`}>
                        {item.title}
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-400 truncate hidden sm:block">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  {item.badge !== undefined && item.badge !== null && (
                    <span
                      className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        item.badgeColor || 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Drawer Footer */}
        <div className="p-2.5 sm:p-3 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 text-slate-500 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-[10px] font-medium truncate">جلسة نشطة</span>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="text-[11px] sm:text-xs font-bold text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
          >
            إغلاق
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* Main Content View (الآن بعرض كامل ووافر للمحتوى) */}
      {/* ========================================================================= */}
      <div className="w-full space-y-4">
          {/* القسم 1: أدوات الواجهة والفلاتر */}
          {activeSection === 'dropdowns' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <DropdownManager
                categories={dropdownCategories}
                onUpdateCategory={onUpdateDropdownCategories}
                utilities={utilityDefinitions}
                onUpdateUtilities={onUpdateUtilityDefinitions}
                onResetDefaults={onResetDefaults}
              />
            </div>
          )}

          {/* القسم 2: إحصائيات العقارات */}
          {activeSection === 'analytics' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Analytics Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold block">إجمالي العقارات</span>
                  <span className="text-2xl font-black text-[#002B49] mt-1 block">{properties.length}</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold block">عروض الإيجار</span>
                  <span className="text-2xl font-black text-teal-700 mt-1 block">{rentTotal}</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold block">عروض البيع والأراضي</span>
                  <span className="text-2xl font-black text-amber-600 mt-1 block">{saleTotal}</span>
                </div>
              </div>

              {/* Pie and Bar Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-[#002B49] mb-1">توزيع العقارات (إيجار مقابل بيع)</h4>
                    <p className="text-[11px] text-slate-500 mb-3">النسبة المئوية لإعلانات الإيجار مقارنة بطلبات وعروض التمليك</p>
                  </div>

                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={purposeData}
                          cx="50%"
                          cy="50%"
                          outerRadius={75}
                          innerRadius={36}
                          dataKey="value"
                          label={false}
                          paddingAngle={3}
                        >
                          {purposeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any, name: any) => [`${value} عقار`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Clean Bottom Legend Bar showing exact percentages beneath the chart */}
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-md bg-[#002B49] shrink-0 shadow-2xs" />
                      <div className="min-w-0">
                        <div className="font-black text-[#002B49] text-xs sm:text-sm truncate">%{rentPct} للإيجار</div>
                        <div className="text-[10px] text-slate-500 font-medium">({rentTotal} عقار متاح)</div>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-md bg-[#FFB300] shrink-0 shadow-2xs" />
                      <div className="min-w-0">
                        <div className="font-black text-amber-950 text-xs sm:text-sm truncate">%{salePct} للبيع</div>
                        <div className="text-[10px] text-amber-800 font-medium">({saleTotal} عقار متاح)</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                  <h4 className="font-bold text-sm text-[#002B49] mb-3">توزيع العقارات حسب أحياء أسيوط</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={districtData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="إيجار" fill="#002B49" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="بيع" fill="#FFB300" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* القسم 3: الموافقات ومراجعة الإعلانات */}
          {activeSection === 'moderation' && (
            <div className="space-y-3">
              {/* Toggle Between Offers and Requests */}
              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 gap-1">
                <button
                  type="button"
                  onClick={() => setModerationType('properties')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    moderationType === 'properties'
                      ? 'bg-[#002B49] text-[#FFB300] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>عروض العقارات (المعروض)</span>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">
                    {properties.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setModerationType('requests')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    moderationType === 'requests'
                      ? 'bg-[#002B49] text-[#FFB300] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>طلبات السكن والمطلوب</span>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">
                    {tenantRequests.length}
                  </span>
                </button>
              </div>

              {/* Filter Pills and Search */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
                  {[
                    {
                      id: 'all',
                      label: 'الكل',
                      count: moderationType === 'properties' ? properties.length : tenantRequests.length,
                    },
                    {
                      id: 'pending',
                      label: 'بانتظار الموافقة ومراجعة الإدارة',
                      count:
                        moderationType === 'properties'
                          ? properties.filter(
                              (p) =>
                                (p.isApproved === false || p.status === 'pending' || p.status === 'pending_approval' || p.status === 'under_review') &&
                                p.status !== 'needs_completion' &&
                                p.status !== 'rejected'
                            ).length
                          : tenantRequests.filter(
                              (r) =>
                                (r.isApproved === false || r.status === 'pending' || r.status === 'pending_approval' || r.status === 'under_review') &&
                                r.status !== 'needs_completion' &&
                                r.status !== 'rejected'
                            ).length,
                    },
                    {
                      id: 'needs_completion',
                      label: 'مطلوب استكمال بيان',
                      count:
                        moderationType === 'properties'
                          ? properties.filter((p) => p.status === 'needs_completion').length
                          : tenantRequests.filter((r) => r.status === 'needs_completion').length,
                    },
                    {
                      id: 'approved',
                      label: 'معتمدة ومنشورة',
                      count:
                        moderationType === 'properties'
                          ? properties.filter((p) => p.isApproved !== false && p.status === 'approved').length
                          : tenantRequests.filter((r) => r.isApproved !== false && (r.status === 'approved' || r.status === 'active')).length,
                    },
                    {
                      id: 'rejected',
                      label: 'مرفوضة',
                      count:
                        moderationType === 'properties'
                          ? properties.filter((p) => p.status === 'rejected').length
                          : tenantRequests.filter((r) => r.status === 'rejected').length,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setFilterStatus(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                        filterStatus === tab.id
                          ? 'bg-[#002B49] text-[#FFB300]'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={moderationSearch}
                    onChange={(e) => setModerationSearch(e.target.value)}
                    placeholder="بحث بالكود، الحي، الهاتف..."
                    className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
                  />
                </div>
              </div>

              {/* Moderation List */}
              <div className="space-y-2.5">
                {moderationType === 'properties' ? (
                  /* 1. PROPERTIES / OFFERS */
                  filteredProperties.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl text-center text-slate-500 border border-slate-200">
                      لا توجد عروض عقارية مطابقة لخيارات الفلترة
                    </div>
                  ) : (
                    filteredProperties.map((item) => {
                      const isPending =
                        (item.isApproved === false || item.status === 'pending' || item.status === 'pending_approval' || item.status === 'under_review') &&
                        item.status !== 'needs_completion' &&
                        item.status !== 'rejected';
                      const isNeedsComp = item.status === 'needs_completion';

                      return (
                        <div
                          key={item.id}
                          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-[#002B49]">
                                كود: {item.code} ({item.propertyType})
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  item.purpose === 'rent'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {item.purpose === 'rent' ? 'إيجار' : 'بيع'}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">• {item.district}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {isPending ? (
                                <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                  بانتظار المراجعة والاعتماد
                                </span>
                              ) : isNeedsComp ? (
                                <span className="text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-amber-700" />
                                  مطلوب استكمال بيان
                                </span>
                              ) : item.status === 'rejected' ? (
                                <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  تم الرفض
                                </span>
                              ) : (
                                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  معتمد ومنشور
                                </span>
                              )}

                              {onDeleteProperty && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteProperty(item.id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="حذف الإعلان نهائياً"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* بطاقة تفاصيل وبيانات صاحب الإعلان */}
                          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 space-y-2">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                                  <User className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-medium">بيانات صاحب الإعلان / المعلن</span>
                                  <span className="font-bold text-xs sm:text-sm text-slate-900">{item.ownerName || 'مالك العقار'}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {item.ownerPhone && (
                                  <>
                                    <a
                                      href={`tel:${item.ownerPhone}`}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold border border-emerald-200 flex items-center gap-1 transition-colors"
                                      title="اتصال هاتفياً بالمعلن"
                                    >
                                      <Phone className="w-3 h-3" />
                                      <span dir="ltr">{item.ownerPhone}</span>
                                    </a>
                                    <a
                                      href={`https://wa.me/20${item.ownerPhone.replace(/^0+/, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-colors"
                                      title="مراسلة عبر الواتساب"
                                    >
                                      <MessageCircle className="w-3 h-3" />
                                      <span>واتساب</span>
                                    </a>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 pt-0.5">
                              <div>السعر: <strong className="text-[#002B49] font-mono">{item.price.toLocaleString()} ج.م</strong></div>
                              <div>المساحة: <strong className="text-[#002B49]">{item.area} م²</strong></div>
                              <div>تاريخ الإضافة: <strong className="font-mono text-slate-700">{item.createdAt || 'اليوم'}</strong></div>
                              <div>المصدر: <strong className="text-slate-800">{item.source || 'مالك مباشر'}</strong></div>
                            </div>
                          </div>

                          {/* ملاحظة استكمال البيان إذا كانت مسجلة مسبقاً */}
                          {item.adminNote && (
                            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium flex items-start gap-2">
                              <MessageSquare className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                              <div>
                                <span className="font-bold block">ملاحظة الإدارة للمعلن:</span>
                                {item.adminNote}
                              </div>
                            </div>
                          )}

                          {/* مربع إدخال ملاحظة الإدارة عند طلب استكمال البيانات */}
                          {noteInputId === item.id && (
                            <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 space-y-2 animate-in fade-in">
                              <label className="block text-xs font-bold text-amber-900">
                                حدد البيان المطلوب استكماله من المعلن (مثال: توضيح نوع العداد، رقم الطابق، إلخ):
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={customNote}
                                  onChange={(e) => setCustomNote(e.target.value)}
                                  placeholder="اكتب البيان المطلوب استكماله بالتحديد..."
                                  className="flex-1 p-2 bg-white rounded-lg border border-amber-300 text-xs focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    onUpdatePropertyStatus(
                                      item.id,
                                      'needs_completion',
                                      customNote.trim() || 'برجاء استكمال وتدقيق بيانات العقار الناقصة.'
                                    );
                                    setNoteInputId(null);
                                    setCustomNote('');
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                                >
                                  حفظ وإرسال الطلب
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNoteInputId(null);
                                    setCustomNote('');
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs"
                                >
                                  إلغاء
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Quick Publish Action if Pending */}
                          {(item.status !== 'approved' || item.isApproved === false) && (
                            <button
                              type="button"
                              onClick={() => onUpdatePropertyStatus(item.id, 'approved')}
                              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-98 cursor-pointer border border-emerald-500"
                              title="موافقة واعتماد نشر الإعلان"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
                              <span>اعتماد ونشر الإعلان فوراً على المنظومة</span>
                            </button>
                          )}

                          {/* PropertyCard Admin Actions Container: display: flex; flex-direction: row; flex-wrap: wrap; gap: 8px; justify-content: flex-start; */}
                          <div 
                            className="pt-2.5 border-t border-slate-100 flex flex-row flex-wrap items-center justify-start gap-2 w-full"
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              flexWrap: 'wrap',
                              gap: '8px',
                              justifyContent: 'flex-start',
                            }}
                          >
                            {/* 1. Preview (معاينة) */}
                            <button
                              type="button"
                              onClick={() => onOpenDetails(item)}
                              className="flex-1 min-w-[75px] h-9 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex flex-row items-center justify-center gap-1.5 transition-all active:scale-95 border border-slate-200/90 shadow-2xs cursor-pointer"
                              title="معاينة تفاصيل الإعلان"
                            >
                              <Eye className="w-4 h-4 text-slate-600 shrink-0" />
                              <span className="truncate">معاينة</span>
                            </button>

                            {/* 2. Edit (تعديل) */}
                            <button
                              type="button"
                              onClick={() => onEditProperty && onEditProperty(item)}
                              className="flex-1 min-w-[75px] h-9 px-2.5 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-[#FFB300] font-black text-xs inline-flex flex-row items-center justify-center gap-1.5 transition-all active:scale-95 border border-[#002B49] shadow-2xs cursor-pointer"
                              title="تعديل بيانات هذا الإعلان"
                            >
                              <Edit3 className="w-4 h-4 text-[#FFB300] shrink-0" />
                              <span className="truncate">تعديل</span>
                            </button>

                            {/* 3. Complete (استكمال) */}
                            <button
                              type="button"
                              onClick={() => {
                                setNoteInputId(item.id);
                                setCustomNote(item.adminNote || '');
                              }}
                              className="flex-1 min-w-[75px] h-9 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs inline-flex flex-row items-center justify-center gap-1.5 transition-all active:scale-95 border border-amber-600/50 shadow-2xs cursor-pointer"
                              title="طلب استكمال بيانات ناقصة من المعلن"
                            >
                              <AlertTriangle className="w-4 h-4 text-white shrink-0" />
                              <span className="truncate">استكمال</span>
                            </button>

                            {/* 4. Reject (رفض) */}
                            <button
                              type="button"
                              onClick={() => onUpdatePropertyStatus(item.id, 'rejected')}
                              disabled={item.status === 'rejected'}
                              className={`flex-1 min-w-[75px] h-9 px-2.5 rounded-xl text-white font-bold text-xs inline-flex flex-row items-center justify-center gap-1.5 transition-all active:scale-95 shadow-2xs border cursor-pointer ${
                                item.status === 'rejected'
                                  ? 'bg-rose-400 border-rose-400 cursor-not-allowed opacity-75'
                                  : 'bg-rose-600 hover:bg-rose-700 border-rose-700'
                              }`}
                              title="رفض الإعلان"
                            >
                              <XCircle className="w-4 h-4 text-white shrink-0" />
                              <span className="truncate">رفض</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )
                ) : (
                  /* 2. TENANT REQUESTS / ORDERS */
                  filteredRequests.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl text-center text-slate-500 border border-slate-200">
                      لا توجد طلبات سكن مطابقة لخيارات الفلترة
                    </div>
                  ) : (
                    filteredRequests.map((req) => {
                      const isPending =
                        (req.isApproved === false || req.status === 'pending' || req.status === 'pending_approval' || req.status === 'under_review') &&
                        req.status !== 'needs_completion' &&
                        req.status !== 'rejected';
                      const isNeedsComp = req.status === 'needs_completion';

                      return (
                        <div
                          key={req.id}
                          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-[#002B49]">
                                كود الطلب: {req.requestCode || req.id}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-[10px] font-bold">
                                مطلوب: {req.propertyType}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">
                                • {req.preferredDistrict} ({req.purpose === 'rent' ? 'إيجار' : 'شراء'})
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {isPending ? (
                                <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                  قيد المراجعة الإدارية
                                </span>
                              ) : isNeedsComp ? (
                                <span className="text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-amber-700" />
                                  مطلوب استكمال بيان
                                </span>
                              ) : req.status === 'rejected' ? (
                                <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  مرفوض
                                </span>
                              ) : (
                                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  معتمد ونشط
                                </span>
                              )}

                              {onDeleteTenantRequest && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteTenantRequest(req.id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="حذف الطلب نهائياً"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* بطاقة تفاصيل وبيانات صاحب طلب السكن */}
                          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 space-y-2">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                                  <User className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-medium">بيانات صاحب الطلب / الباحث</span>
                                  <span className="font-bold text-xs sm:text-sm text-slate-900">{req.tenantName || 'مواطن باحث عن عقار'}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {req.tenantPhone && (
                                  <>
                                    <a
                                      href={`tel:${req.tenantPhone}`}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold border border-emerald-200 flex items-center gap-1 transition-colors"
                                      title="اتصال هاتفياً بصاحب الطلب"
                                    >
                                      <Phone className="w-3 h-3" />
                                      <span dir="ltr">{req.tenantPhone}</span>
                                    </a>
                                    <a
                                      href={`https://wa.me/20${req.tenantPhone.replace(/^0+/, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-colors"
                                      title="مراسلة عبر الواتساب"
                                    >
                                      <MessageCircle className="w-3 h-3" />
                                      <span>واتساب</span>
                                    </a>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 pt-0.5">
                              <div>
                                الميزانية:{' '}
                                <strong className="text-[#002B49] font-mono">
                                  {req.minPrice ? `${req.minPrice.toLocaleString()} - ` : ''}
                                  {req.maxPrice.toLocaleString()} ج.م
                                </strong>
                              </div>
                              <div>
                                المساحة:{' '}
                                <strong className="text-[#002B49]">
                                  {req.minArea || req.maxArea ? `${req.minArea || ''}-${req.maxArea || ''} م²` : 'غير محدد'}
                                </strong>
                              </div>
                              <div>تاريخ الطلب: <strong className="font-mono text-slate-700">{req.createdAt || 'اليوم'}</strong></div>
                              <div>الحي المفضل: <strong className="text-slate-800">{req.preferredDistrict}</strong></div>
                            </div>
                          </div>

                          {req.notes && (
                            <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                              <span className="font-bold text-slate-800">ملاحظات الطلب: </span>
                              {req.notes}
                            </div>
                          )}

                          {req.adminNote && (
                            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium flex items-start gap-2">
                              <MessageSquare className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                              <div>
                                <span className="font-bold block">ملاحظة الإدارة لطالب العقار:</span>
                                {req.adminNote}
                              </div>
                            </div>
                          )}

                          {/* مربع إدخال استكمال بيان للطلب */}
                          {noteInputId === req.id && (
                            <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 space-y-2 animate-in fade-in">
                              <label className="block text-xs font-bold text-amber-900">
                                حدد البيان المطلوب استكماله من صاحب الطلب:
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={customNote}
                                  onChange={(e) => setCustomNote(e.target.value)}
                                  placeholder="اكتب البيان المطلوب استكماله بالتحديد..."
                                  className="flex-1 p-2 bg-white rounded-lg border border-amber-300 text-xs focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onUpdateTenantRequestStatus) {
                                      onUpdateTenantRequestStatus(
                                        req.id,
                                        'needs_completion',
                                        customNote.trim() || 'برجاء استكمال وتوضيح بيانات الطلب الناقصة.'
                                      );
                                    }
                                    setNoteInputId(null);
                                    setCustomNote('');
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                                >
                                  حفظ وإرسال
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNoteInputId(null);
                                    setCustomNote('');
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs"
                                >
                                  إلغاء
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Quick Publish Action if Pending */}
                          {(req.status !== 'approved' && req.status !== 'active') && onUpdateTenantRequestStatus && (
                            <button
                              type="button"
                              onClick={() => onUpdateTenantRequestStatus(req.id, 'approved')}
                              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-98 cursor-pointer border border-emerald-500"
                              title="موافقة واعتماد نشر الطلب"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
                              <span>اعتماد ونشر الطلب فوراً على المنظومة</span>
                            </button>
                          )}

                          {/* Tenant Request Admin Actions Container: display: flex; flex-direction: row; flex-wrap: wrap; gap: 8px; justify-content: flex-start; */}
                          <div 
                            className="pt-2.5 border-t border-slate-100 flex flex-row flex-wrap items-center justify-start gap-2 w-full"
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              flexWrap: 'wrap',
                              gap: '8px',
                              justifyContent: 'flex-start',
                            }}
                          >
                            {/* 1. Preview (معاينة) */}
                            <button
                              type="button"
                              onClick={() => onOpenTenantRequestDetails && onOpenTenantRequestDetails(req)}
                              className="flex-1 min-w-[75px] h-9 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex flex-row items-center justify-center gap-1.5 transition-all active:scale-95 border border-slate-200/90 shadow-2xs cursor-pointer"
                              title="معاينة تفاصيل الطلب"
                            >
                              <Eye className="w-4 h-4 text-slate-600 shrink-0" />
                              <span className="truncate">معاينة</span>
                            </button>

                            {/* 2. Edit (تعديل) */}
                            <button
                              type="button"
                              onClick={() => onEditTenantRequest && onEditTenantRequest(req)}
                              className="flex-1 min-w-[75px] h-9 px-2.5 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-[#FFB300] font-black text-xs inline-flex flex-row items-center justify-center gap-1.5 transition-all active:scale-95 border border-[#002B49] shadow-2xs cursor-pointer"
                              title="تعديل هذا الطلب"
                            >
                              <Edit3 className="w-4 h-4 text-[#FFB300] shrink-0" />
                              <span className="truncate">تعديل</span>
                            </button>

                            {/* 3. Complete (استكمال) */}
                            <button
                              type="button"
                              onClick={() => {
                                setNoteInputId(req.id);
                                setCustomNote(req.adminNote || '');
                              }}
                              className="flex-1 min-w-[75px] h-9 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs inline-flex flex-row items-center justify-center gap-1.5 transition-all active:scale-95 border border-amber-600/50 shadow-2xs cursor-pointer"
                              title="طلب استكمال بيان من صاحب الطلب"
                            >
                              <AlertTriangle className="w-4 h-4 text-white shrink-0" />
                              <span className="truncate">استكمال</span>
                            </button>

                            {/* 4. Reject (رفض) */}
                            <button
                              type="button"
                              onClick={() => onUpdateTenantRequestStatus && onUpdateTenantRequestStatus(req.id, 'rejected')}
                              disabled={req.status === 'rejected'}
                              className={`flex-1 min-w-[75px] h-9 px-2.5 rounded-xl text-white font-bold text-xs inline-flex flex-row items-center justify-center gap-1.5 transition-all active:scale-95 shadow-2xs border cursor-pointer ${
                                req.status === 'rejected'
                                  ? 'bg-rose-400 border-rose-400 cursor-not-allowed opacity-75'
                                  : 'bg-rose-600 hover:bg-rose-700 border-rose-700'
                              }`}
                              title="رفض الطلب"
                            >
                              <XCircle className="w-4 h-4 text-white shrink-0" />
                              <span className="truncate">رفض</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )
                )}
              </div>
            </div>
          )}

          {/* SUB-SECTION B: USER BLOCKS (البلوكات) */}
          {activeSection === 'blocks' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Ban className="w-4 h-4 text-rose-600" />
                    <span>سجل حظر المستخدمين (البلوكات) في أسيوط</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    حظر أرقام الهواتف أو الوسطاء والملاك المخالفين لمنعهم من نشر عروض وهمية أو تلقي رسائل
                  </p>
                </div>
                <button
                  onClick={() => setIsAddBlockOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة حظر جديد (بلوك)</span>
                </button>
              </div>

              {/* Add Block Modal / Inline Form */}
              {isAddBlockOpen && (
                <form
                  onSubmit={handleCreateBlock}
                  className="bg-rose-50/80 border border-rose-200 p-4 rounded-2xl space-y-3 animate-in fade-in"
                >
                  <h5 className="font-bold text-xs text-rose-900 flex items-center gap-1.5">
                    <UserX className="w-4 h-4 text-rose-600" />
                    <span>تسجيل حظر لمستخدم أو رقم هاتف مخالف</span>
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم المستخدم / المعلن</label>
                      <input
                        type="text"
                        value={blockName}
                        onChange={(e) => setBlockName(e.target.value)}
                        placeholder="مثال: أحمد مصطفى"
                        required
                        className="w-full p-2 text-xs rounded-xl bg-white border border-rose-200 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الهاتف المراد حظره (11 رقماً)</label>
                      <input
                        type="tel"
                        dir="ltr"
                        value={blockPhone}
                        onChange={(e) => {
                          const norm = normalizeEgyptianPhone(e.target.value);
                          if (norm.length <= 11) {
                            setBlockPhone(norm);
                            setBlockPhoneError(null);
                          }
                        }}
                        placeholder="01012345678"
                        required
                        className="w-full p-2 text-xs rounded-xl bg-white border border-rose-200 focus:outline-hidden focus:ring-1 focus:ring-rose-500 font-mono text-right"
                      />
                      {blockPhoneError && (
                        <p className="text-[10px] text-rose-600 font-bold mt-1">{blockPhoneError}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">صفة المستخدم</label>
                      <select
                        value={blockRole}
                        onChange={(e) => setBlockRole(e.target.value as any)}
                        className="w-full p-2 text-xs rounded-xl bg-white border border-rose-200 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                      >
                        <option value="owner">مالك عقار</option>
                        <option value="broker">سمسار / وسيط</option>
                        <option value="tenant">مستأجر / باحث</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">سبب الحظر</label>
                    <input
                      type="text"
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      placeholder="مثال: نشر عقار وهمي في حي الجامعة، أو تكرار الإلغاء في المعاينات"
                      className="w-full p-2 text-xs rounded-xl bg-white border border-rose-200 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddBlockOpen(false)}
                      className="px-3 py-1.5 rounded-xl bg-white text-slate-600 text-xs font-bold hover:bg-slate-100"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-xs"
                    >
                      تأكيد وحفظ البلوك
                    </button>
                  </div>
                </form>
              )}

              {/* Blocked Users List */}
              <div className="space-y-2.5">
                {blockedUsers.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl text-center text-slate-500 border border-slate-200">
                    لا يوجد مستخدمون محظورون حالياً، النظام نظيف وخالٍ من المخالفات
                  </div>
                ) : (
                  blockedUsers.map((bu) => (
                    <div
                      key={bu.id}
                      className="bg-white p-4 rounded-2xl border border-rose-100 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-rose-700 flex items-center gap-1">
                            <Ban className="w-3.5 h-3.5" />
                            <span>{bu.name}</span>
                          </span>
                          <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                            {bu.phone}
                          </span>
                          <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                            {bu.role === 'broker' ? 'سمسار' : bu.role === 'owner' ? 'مالك' : 'مستأجر'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">سبب الحظر: {bu.reason}</p>
                        <span className="text-[10px] text-slate-400 block mt-0.5">تاريخ البلوك: {bu.blockedAt}</span>
                      </div>

                      {onRemoveBlockedUser && (
                        <button
                          onClick={() => onRemoveBlockedUser(bu.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                        >
                          إلغاء الحظر (فك البلوك)
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SUB-SECTION C: INSPECTIONS MANAGEMENT (المعاينات) */}
          {activeSection === 'inspections' && (
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#002B49]" />
                    <span>جدول المعاينات الميدانية ({inspections.length})</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    إدارة وتأكيد مواعيد المعاينات للعملاء وتتبع المعاينات بالرمز الذكي
                  </p>
                </div>
              </div>

              {inspections.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl text-center text-slate-500 border border-slate-200">
                  لا توجد طلبات معاينة مسجلة حالياً
                </div>
              ) : (
                inspections.map((insp) => (
                  <div
                    key={insp.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs bg-[#FFB300] text-black px-2 py-0.5 rounded-md">
                          كود: {insp.propertyCode}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">{insp.district}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          insp.status === 'completed' 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                            : insp.status === 'confirmed' 
                            ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {insp.status === 'completed' ? 'معاينة مكتملة ومسددة (مؤهل للتقييم ✓)' : insp.status === 'confirmed' ? 'معاينة مؤكدة' : 'بانتظار التأكيد والسداد'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          insp.feePaid ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {insp.feePaid ? 'الرسوم مسددة ✓' : 'الرسوم معلقة (50 ج.م)'}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 mt-1">{insp.propertyTitle}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        العميل: {insp.tenantName} (<strong dir="ltr">{insp.tenantPhone}</strong>) • الموعد المطلوب: {insp.preferredDate} الساعة {insp.preferredTime}
                      </p>
                      {insp.notes && <p className="text-[11px] text-slate-500 mt-0.5">ملاحظات: {insp.notes}</p>}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {onUpdateInspectionStatus && insp.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => onUpdateInspectionStatus(insp.id, 'completed', true)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                          title="اعتماد إتمام المعاينة الميدانية وسداد الرسوم لتفعيل إمكانية التقييم للعميل"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>إتمام المعاينة وسداد الرسوم</span>
                        </button>
                      )}

                      {onUpdateInspectionStatus && insp.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => onUpdateInspectionStatus(insp.id, 'confirmed')}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
                        >
                          تأكيد الموعد
                        </button>
                      )}

                      <a
                        href={`https://wa.me/20${insp.tenantPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white font-bold text-xs transition-colors"
                      >
                        واتساب العميل
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* القسم 6: إدارة المدراء والصلاحيات */}
          {activeSection === 'admins' && (
            <div className="animate-in fade-in duration-150">
              <AdminRoleManagement currentUser={currentUser} />
            </div>
          )}

          {/* القسم 7: إدارة المستخدمين والحسابات */}
          {activeSection === 'users' && (
            <div className="animate-in fade-in duration-150">
              <UserManagement currentUser={currentUser} />
            </div>
          )}

          {/* القسم 8: الإعدادات وتصدير البيانات والتقارير */}
          {activeSection === 'export_settings' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Header Card */}
              <div className="bg-white p-4 sm:p-5 rounded-[14px] border border-[#E5E7EB] shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      تصدير البيانات والتقارير وإعدادات النظام
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      تصدير سجلات العقارات والطلبات إلى ملفات Excel أو PDF قابلة للطباعة، وإدارة ضبط النظام.
                    </p>
                  </div>
                </div>
              </div>

              {/* Export Grid Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: سجل العقارات */}
                <div className="bg-white p-4 sm:p-5 rounded-[14px] border border-[#E5E7EB] shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900 text-sm sm:text-base">سجل إعلانات العقارات</span>
                      <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-mono">
                        {filteredProperties.length} عقار
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      تصدير السجل الكامل لجميع إعلانات العقارات المعروضة في أسيوط مع الأسعار، بيانات الملاك، والمواصفات.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={handleExportPropertiesCSV}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-[10px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Excel (CSV)</span>
                    </button>
                    <button
                      onClick={handleExportPropertiesPDF}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-[10px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <Printer className="w-4 h-4" />
                      <span>طباعة PDF</span>
                    </button>
                  </div>
                </div>

                {/* Card 2: سجل طلبات المستأجرين */}
                <div className="bg-white p-4 sm:p-5 rounded-[14px] border border-[#E5E7EB] shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900 text-sm sm:text-base">سجل طلبات السكن</span>
                      <span className="text-[11px] font-bold bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full font-mono">
                        {filteredRequests.length} طلب
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      تصدير السجل الكامل لطلبات السكن والبحث المسجلة في أسيوط مع أرقام التواصل والأحياء والميزانيات.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={handleExportRequestsCSV}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-[10px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Excel (CSV)</span>
                    </button>
                    <button
                      onClick={handleExportRequestsPDF}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-[10px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <Printer className="w-4 h-4" />
                      <span>طباعة PDF</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 3: إعدادات الربط بقاعدة بيانات الإنتاج السحابية (Supabase) */}
              <div className="bg-white p-4 sm:p-5 rounded-[14px] border border-[#E5E7EB] shadow-[0_4px_20px_rgba(0,0,0,0.04)] space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                        قاعدة بيانات الإنتاج والمزامنة السحابية (Supabase)
                      </h4>
                      <p className="text-xs text-slate-500">
                        ربط لوحة التحكم بالمستخدمين والعقارات الحية لضمان مزامنة الإعلانات والحسابات فورياً عبر كافة الأجهزة وVercel
                      </p>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                    isSupabaseActive()
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isSupabaseActive() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span>{isSupabaseActive() ? 'قاعدة البيانات الحية متصلة (Online)' : 'تخزين محلي متزامن'}</span>
                  </span>
                </div>

                {sbSaveMsg && (
                  <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{sbSaveMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      رابط مشروع Supabase (Project URL):
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={sbUrl}
                      onChange={(e) => setSbUrl(e.target.value)}
                      placeholder="https://xyzcompany.supabase.co"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#1D4ED8] focus:ring-1 focus:ring-[#1D4ED8]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      مفتاح الوصول العام (Anon Public Key):
                    </label>
                    <input
                      type="password"
                      dir="ltr"
                      value={sbAnonKey}
                      onChange={(e) => setSbAnonKey(e.target.value)}
                      placeholder="eyJhbGciOi..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#1D4ED8] focus:ring-1 focus:ring-[#1D4ED8]"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleSaveSbConfig}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#002B49] hover:bg-[#00385F] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#FFB300]" />
                    <span>حفظ وتفعيل الاتصال فوراً</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePushAllToSupabase}
                    disabled={isPushingAllToSb}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isPushingAllToSb ? 'animate-spin' : ''}`} />
                    <span>{isPushingAllToSb ? 'جاري الرفع...' : 'رفع ومزامنة كافة العروض والطلبات الحالية إلى Supabase'}</span>
                  </button>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 leading-relaxed">
                  💡 <strong>ملاحظة هامة:</strong> يتضمن المشروع ملف <code className="text-blue-700 font-mono font-bold bg-blue-50 px-1 py-0.5 rounded">supabase_schema.sql</code> في المجلد الرئيسي، يحتوي على المخطط الشامل لجداول (<code className="font-mono">app_users</code>, <code className="font-mono">properties</code>, <code className="font-mono">tenant_requests</code>) مع سياسات الأمان (RLS) ومفتاح التحديث اللحظي (Realtime). قم بتشغيله في SQL Editor داخل لوحة تحكم Supabase لتفعيل كافة الصلاحيات فوراً.
                </div>
              </div>

              {/* Card 4: إعدادات إعادة الضبط وتأمين الجلسة */}
              <div className="bg-white p-4 sm:p-5 rounded-[14px] border border-[#E5E7EB] shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-900 text-sm block">استعادة الإعدادات الافتراضية للقوائم</span>
                  <span className="text-xs text-slate-500">إعادة تعيين خيارات الأحياء والمرافق وأنواع العقارات إلى التوليفات الأساسية</span>
                </div>
                {onResetDefaults && (
                  <button
                    onClick={onResetDefaults}
                    className="flex items-center gap-1.5 py-2 px-4 rounded-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer shrink-0"
                  >
                    <RotateCcw className="w-4 h-4 text-slate-600" />
                    <span>إعادة تعيين الافتراضيات</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
    </div>
  );
};
