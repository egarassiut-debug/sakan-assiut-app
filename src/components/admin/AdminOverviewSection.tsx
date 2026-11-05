import React from 'react';
import { Property, TenantRequest, AppUser, PropertyRating, TrendPost } from '../../types/property';
import { PropertyGroupDefinition, PropertyTypeDefinition, FormFieldDefinition } from '../../types/formConfig';
import { AdminSectionId } from '../../types/adminNav';
import { 
  Building2, Users, FileText, Star, TrendingUp, Layers, CheckCircle2, 
  Clock, ShieldAlert, ArrowUpRight, Plus, SlidersHorizontal, MapPin
} from 'lucide-react';

interface AdminOverviewSectionProps {
  currentUser?: AppUser | null;
  properties: Property[];
  tenantRequests: TenantRequest[];
  users: AppUser[];
  ratings: PropertyRating[];
  trendPosts: TrendPost[];
  groups: PropertyGroupDefinition[];
  propertyTypes: PropertyTypeDefinition[];
  fields: FormFieldDefinition[];
  onNavigate: (section: AdminSectionId) => void;
  onRefreshAll?: () => void;
}

export const AdminOverviewSection: React.FC<AdminOverviewSectionProps> = ({
  currentUser,
  properties,
  tenantRequests,
  users,
  ratings,
  trendPosts,
  groups,
  propertyTypes,
  fields,
  onNavigate,
  onRefreshAll,
}) => {
  // Counters
  const pendingPropertiesCount = properties.filter(
    (p) => p.status === 'pending' || p.status === 'pending_approval' || p.status === 'under_review' || (!p.isApproved && p.status !== 'rejected')
  ).length;

  const approvedPropertiesCount = properties.filter((p) => p.status === 'approved' || p.isApproved).length;

  const pendingRequestsCount = tenantRequests.filter(
    (r) => r.status === 'pending' || r.status === 'pending_approval' || r.status === 'under_review' || (!r.isApproved && r.status !== 'rejected')
  ).length;

  const approvedRequestsCount = tenantRequests.filter((r) => r.status === 'approved' || r.isApproved).length;

  const blockedUsersCount = users.filter((u) => u.isBlocked).length;
  const staffUsersCount = users.filter((u) => u.role !== 'user').length;

  const pendingTrendCount = trendPosts.filter((tp) => tp.status === 'pending' || (!tp.isApproved && tp.status !== 'rejected')).length;

  const averageRating = ratings.length > 0 
    ? (ratings.reduce((acc, r) => acc + (r.score || 0), 0) / ratings.length).toFixed(1)
    : '5.0';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-l from-[#124C46] to-[#0E3D38] text-white p-5 sm:p-6 rounded-2xl shadow-sm border border-[#16856B]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-200">المنظومة المركزية لسكن أسيوط</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-['Tajawal','Cairo',sans-serif]">
            مرحباً، {currentUser?.name || 'مدير المنظومة'} 👋
          </h2>
          <p className="text-sm text-slate-200 mt-1 max-w-xl leading-relaxed">
            لوحة الإدارة والتحكم الشاملة في العروض، طلبات المستأجرين، المستخدمين، والمجموعات العقارية مع قاعدة بيانات Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {pendingPropertiesCount + pendingRequestsCount > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('properties')}
              className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Clock className="w-4 h-4 animate-spin" />
              <span>مراجعة الطلبات المعلقة ({pendingPropertiesCount + pendingRequestsCount})</span>
            </button>
          )}

          {onRefreshAll && (
            <button
              type="button"
              onClick={onRefreshAll}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium text-xs sm:text-sm transition-colors cursor-pointer border border-white/20"
              title="تحديث البيانات من Supabase"
            >
              تحديث
            </button>
          )}
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Properties KPI */}
        <div 
          onClick={() => onNavigate('properties')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-[#124C46]/40 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">عروض العقارات</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 font-mono">
            {properties.length}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-medium">
            <span className="text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {approvedPropertiesCount} معتمد
            </span>
            {pendingPropertiesCount > 0 && (
              <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full font-bold">
                {pendingPropertiesCount} معلق
              </span>
            )}
          </div>
        </div>

        {/* Tenant Requests KPI */}
        <div 
          onClick={() => onNavigate('requests')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-[#124C46]/40 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">طلبات المستأجرين</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 font-mono">
            {tenantRequests.length}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-medium">
            <span className="text-blue-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {approvedRequestsCount} معتمد
            </span>
            {pendingRequestsCount > 0 && (
              <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-bold">
                {pendingRequestsCount} معلق
              </span>
            )}
          </div>
        </div>

        {/* Users KPI */}
        <div 
          onClick={() => onNavigate('users')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-[#124C46]/40 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">المستخدمون المسجلون</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 font-mono">
            {users.length}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-medium">
            <span className="text-purple-700">{staffUsersCount} طاقم إدارة</span>
            {blockedUsersCount > 0 && (
              <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full font-bold">
                {blockedUsersCount} محظور
              </span>
            )}
          </div>
        </div>

        {/* Ratings & Satisfaction KPI */}
        <div 
          onClick={() => onNavigate('ratings')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-[#124C46]/40 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">متوسط التقييمات</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 font-mono flex items-center gap-2">
            <span>{averageRating}</span>
            <span className="text-xs font-normal text-slate-400">/ 5</span>
          </div>
          <div className="mt-2 text-xs font-medium text-slate-500">
            إجمالي {ratings.length} تقييم مسجل
          </div>
        </div>
      </div>

      {/* Structure & Configuration Counter Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div 
            onClick={() => onNavigate('groups')}
            className="flex items-center gap-2.5 cursor-pointer hover:text-[#124C46] transition-colors"
          >
            <Layers className="w-4 h-4 text-[#124C46]" />
            <span className="text-xs sm:text-sm font-bold text-slate-700">المجموعات العقارية:</span>
            <span className="text-xs sm:text-sm font-extrabold font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200">{groups.length}</span>
          </div>

          <div 
            onClick={() => onNavigate('types')}
            className="flex items-center gap-2.5 cursor-pointer hover:text-[#124C46] transition-colors"
          >
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs sm:text-sm font-bold text-slate-700">أنواع العقارات:</span>
            <span className="text-xs sm:text-sm font-extrabold font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200">{propertyTypes.length}</span>
          </div>

          <div 
            onClick={() => onNavigate('fields')}
            className="flex items-center gap-2.5 cursor-pointer hover:text-[#124C46] transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <span className="text-xs sm:text-sm font-bold text-slate-700">حقول الاستمارات:</span>
            <span className="text-xs sm:text-sm font-extrabold font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200">{fields.length}</span>
          </div>

          <div 
            onClick={() => onNavigate('trend')}
            className="flex items-center gap-2.5 cursor-pointer hover:text-[#124C46] transition-colors"
          >
            <TrendingUp className="w-4 h-4 text-amber-600" />
            <span className="text-xs sm:text-sm font-bold text-slate-700">منشورات الترند:</span>
            <span className="text-xs sm:text-sm font-extrabold font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200">{trendPosts.length}</span>
            {pendingTrendCount > 0 && (
              <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-bold">({pendingTrendCount} معلق)</span>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Supabase Connected
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <span>روابط الوصول السريع لأقسام الإدارة</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            type="button"
            onClick={() => onNavigate('properties')}
            className="p-3.5 bg-white border border-slate-200 hover:border-[#124C46]/50 hover:bg-[#F5F9F8] rounded-xl flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">إدارة العروض</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('requests')}
            className="p-3.5 bg-white border border-slate-200 hover:border-[#124C46]/50 hover:bg-[#F5F9F8] rounded-xl flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">إدارة الطلبات</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('users')}
            className="p-3.5 bg-white border border-slate-200 hover:border-[#124C46]/50 hover:bg-[#F5F9F8] rounded-xl flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">المستخدمين</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('groups')}
            className="p-3.5 bg-white border border-slate-200 hover:border-[#124C46]/50 hover:bg-[#F5F9F8] rounded-xl flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">المجموعات الخمس</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('types')}
            className="p-3.5 bg-white border border-slate-200 hover:border-[#124C46]/50 hover:bg-[#F5F9F8] rounded-xl flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">أنواع العقارات</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('fields')}
            className="p-3.5 bg-white border border-slate-200 hover:border-[#124C46]/50 hover:bg-[#F5F9F8] rounded-xl flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">حقول الاستمارات</span>
          </button>
        </div>
      </div>
    </div>
  );
};
