import React, { useState, useMemo } from 'react';
import { Property, PropertyStatus, ScheduledInspection, BlockedUser, TenantRequest } from '../types/property';
import { DropdownCategory, UtilityOptionDefinition } from '../data/dropdownOptions';
import { DropdownManager } from './DropdownManager';
import { SettingsIcon, VerifiedUserIcon } from './FlutterIcons';
import { validateEgyptianPhone, normalizeEgyptianPhone } from '../utils/phoneValidator';
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { 
  ShieldCheck, CheckCircle2, XCircle, Trash2, Eye, Lock, 
  UserX, Ban, AlertTriangle, Calendar, Plus, Search,
  Edit3, MessageSquare
} from 'lucide-react';

interface AdminPanelProps {
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
}) => {
  // Main Top Tab (0: Filters & UI, 1: Moderations, Blocks, Inspections)
  const [adminTab, setAdminTab] = useState<0 | 1>(0);

  // Sub-tabs inside Tab 0
  const [filterSubTab, setFilterSubTab] = useState<'dropdowns' | 'analytics'>('dropdowns');

  // Sub-tabs inside Tab 1
  const [modSubTab, setModSubTab] = useState<'moderation' | 'blocks' | 'inspections'>('moderation');

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
        const isPending = (p.isApproved === false || p.status === 'pending' || p.status === 'pending_approval') && p.status !== 'needs_completion';
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
          (p.ownerPhone && p.ownerPhone.includes(q))
        );
      }
      return true;
    });
  }, [properties, filterStatus, moderationSearch]);

  const filteredRequests = useMemo(() => {
    return tenantRequests.filter((r) => {
      if (filterStatus === 'pending') {
        const isPending = (r.isApproved === false || r.status === 'pending' || r.status === 'pending_approval') && r.status !== 'needs_completion';
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

  return (
    <div className="space-y-4">
      {/* Admin Panel Top Bar */}
      <div className="bg-[#002B49] text-white rounded-3xl p-5 shadow-lg border border-[#001D33] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FFB300]/20 border border-[#FFB300]/40 flex items-center justify-center text-[#FFB300]">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black">شاشة لوحة التحكم الإدارية</h2>
              <span className="text-[11px] bg-[#FFB300] text-black font-black px-2.5 py-0.5 rounded-full shadow-xs">
                Mf0900
              </span>
            </div>
            <p className="text-xs text-white/70 mt-0.5">
              نظام إدارة عرض وطلب أسيوط: الفلاتر، القوائم، الموافقات، البلوكات والمعاينات
            </p>
          </div>
        </div>

        {onLockAdmin && (
          <button
            onClick={onLockAdmin}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-all shadow-xs"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>قفل لوحة الإدارة</span>
          </button>
        )}
      </div>

      {/* Two Top Tabs matching Flutter DefaultTabController length: 2 */}
      <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs">
        <div className="grid grid-cols-2 gap-2">
          {/* Tab 0: التحكم بالواجهة والفلاتر */}
          <button
            onClick={() => setAdminTab(0)}
            className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all border-b-3 ${
              adminTab === 0
                ? 'bg-[#002B49] text-[#FFB300] border-[#FFB300] shadow-sm font-black'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-transparent'
            }`}
          >
            <SettingsIcon className={`w-5 h-5 ${adminTab === 0 ? 'text-[#FFB300]' : 'text-slate-500'}`} />
            <span>التحكم بالواجهة والفلاتر</span>
          </button>

          {/* Tab 1: الموافقات والبلوكات المعاينات */}
          <button
            onClick={() => setAdminTab(1)}
            className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all border-b-3 ${
              adminTab === 1
                ? 'bg-[#002B49] text-[#FFB300] border-[#FFB300] shadow-sm font-black'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-transparent'
            }`}
          >
            <VerifiedUserIcon className={`w-5 h-5 ${adminTab === 1 ? 'text-[#FFB300]' : 'text-slate-500'}`} />
            <span>الموافقات والبلوكات المعاينات</span>
            {(properties.filter((p) => p.status === 'pending').length > 0 ||
              inspections.filter((i) => i.status === 'pending').length > 0) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* القسم الأول: التحكم في الفلاتر والقوائم المنسدلة وشكل التطبيق (TAB 0) */}
      {/* ========================================================================= */}
      {adminTab === 0 && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Sub-Tabs selector inside Tab 0 */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => setFilterSubTab('dropdowns')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                filterSubTab === 'dropdowns'
                  ? 'bg-white text-[#002B49] shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              القوائم المنسدلة والمرافق والعدادات
            </button>
            <button
              onClick={() => setFilterSubTab('analytics')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                filterSubTab === 'analytics'
                  ? 'bg-white text-[#002B49] shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              إحصائيات العقارات (Recharts)
            </button>
          </div>

          {filterSubTab === 'dropdowns' ? (
            <DropdownManager
              categories={dropdownCategories}
              onUpdateCategory={onUpdateDropdownCategories}
              utilities={utilityDefinitions}
              onUpdateUtilities={onUpdateUtilityDefinitions}
              onResetDefaults={onResetDefaults}
            />
          ) : (
            <div className="space-y-4">
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* القسم الثاني: الموافقات والبلوكات والمعاينات (TAB 1) */}
      {/* ========================================================================= */}
      {adminTab === 1 && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Sub-Tabs Selector inside Tab 1 */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => setModSubTab('moderation')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                modSubTab === 'moderation'
                  ? 'bg-white text-[#002B49] shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>مراجعة الإعلانات والموافقات</span>
              <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded-full">
                {properties.length}
              </span>
            </button>

            <button
              onClick={() => setModSubTab('blocks')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                modSubTab === 'blocks'
                  ? 'bg-white text-rose-700 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Ban className="w-3.5 h-3.5 text-rose-600" />
              <span>حظر المستخدمين (البلوكات)</span>
              <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded-full">
                {blockedUsers.length}
              </span>
            </button>

            <button
              onClick={() => setModSubTab('inspections')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                modSubTab === 'inspections'
                  ? 'bg-white text-[#002B49] shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-[#002B49]" />
              <span>إدارة المعاينات</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded-full">
                {inspections.length}
              </span>
            </button>
          </div>

          {/* SUB-SECTION A: MODERATION & APPROVALS */}
          {modSubTab === 'moderation' && (
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
                      label: 'بانتظار الموافقة',
                      count:
                        moderationType === 'properties'
                          ? properties.filter(
                              (p) =>
                                (p.isApproved === false || p.status === 'pending' || p.status === 'pending_approval') &&
                                p.status !== 'needs_completion'
                            ).length
                          : tenantRequests.filter(
                              (r) =>
                                (r.isApproved === false || r.status === 'pending' || r.status === 'pending_approval') &&
                                r.status !== 'needs_completion'
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
                        (item.isApproved === false || item.status === 'pending' || item.status === 'pending_approval') &&
                        item.status !== 'needs_completion';
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
                                  في انتظار سداد الرسوم والموافقة
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

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                            <div>السعر: <strong className="text-[#002B49] font-mono">{item.price.toLocaleString()} ج.م</strong></div>
                            <div>المساحة: <strong className="text-[#002B49]">{item.area} م²</strong></div>
                            <div>المعلن: <strong>{item.ownerName}</strong></div>
                            <div>الهاتف: <strong dir="ltr">{item.ownerPhone}</strong></div>
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
                        (req.isApproved === false || req.status === 'pending' || req.status === 'pending_approval') &&
                        req.status !== 'needs_completion';
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

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
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
                            <div>صاحب الطلب: <strong>{req.tenantName}</strong></div>
                            <div>الهاتف: <strong dir="ltr">{req.tenantPhone}</strong></div>
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
          {modSubTab === 'blocks' && (
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
          {modSubTab === 'inspections' && (
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
        </div>
      )}
    </div>
  );
};
