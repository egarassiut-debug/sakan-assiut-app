import React, { useState, useMemo } from 'react';
import { Property, TenantRequest, ScheduledInspection, AppUser, PropertyStatus } from '../types/property';
import { DEFAULT_SAKAN_PLACEHOLDER } from '../utils/constants';
import { 
  Building2, Clock, CheckCircle2, AlertTriangle, Edit3, Trash2, 
  Archive, RotateCcw, Eye, Plus, MapPin, Calendar, Copy, Check, CreditCard,
  Search, X, Bell, Heart, ArrowUpRight, MessageSquare, Maximize2, Bed, Bath
} from 'lucide-react';
import { RealEstateAgent, Assignment } from './FlutterIcons';

interface MyAdsScreenProps {
  currentUser: AppUser;
  properties: Property[];
  tenantRequests: TenantRequest[];
  inspections: ScheduledInspection[];
  onEditProperty: (property: Property) => void;
  onDeleteProperty: (propertyId: string) => void;
  onArchiveProperty: (propertyId: string) => void;
  onRepublishProperty: (propertyId: string) => void;
  onToggleRentedSold: (propertyId: string, currentStatus: PropertyStatus) => void;
  onOpenDetails: (property: Property) => void;
  onOpenAddOffer: () => void;
  onOpenAddRequest: () => void;
  onEditTenantRequest?: (request: TenantRequest) => void;
  onDeleteTenantRequest?: (requestId: string) => void;
  onTestPushNotification?: (type: 'approved' | 'rejected') => void;
  favoriteProperties?: Property[];
  onToggleFavorite?: (propertyId: string) => void;
}

type TabCategory = 'properties' | 'requests' | 'favorites';
type FilterStage = 'all' | 'pending' | 'needs_completion' | 'approved' | 'inspections' | 'archived';

export const MyAdsScreen: React.FC<MyAdsScreenProps> = ({
  currentUser,
  properties,
  tenantRequests,
  inspections,
  onEditProperty,
  onDeleteProperty,
  onArchiveProperty,
  onRepublishProperty,
  onToggleRentedSold,
  onOpenDetails,
  onOpenAddOffer,
  onOpenAddRequest,
  onEditTenantRequest,
  onDeleteTenantRequest,
  onTestPushNotification,
  favoriteProperties = [],
  onToggleFavorite,
}) => {
  // Active Category (عروض العقارات vs طلبات السكن)
  const [activeCategory, setActiveCategory] = useState<TabCategory>('properties');
  const [filterStage, setFilterStage] = useState<FilterStage>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFeeModalProp, setSelectedFeeModalProp] = useState<Property | null>(null);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Normalize user phone for matching
  const userPhone = currentUser.phone.trim();
  const userName = currentUser.name.trim();

  // Filter properties belonging to this user strictly
  const userProperties = useMemo(() => {
    return properties.filter((p) => {
      const matchPhone = p.ownerPhone && (p.ownerPhone === userPhone || p.ownerPhone.replace(/\D/g, '') === userPhone.replace(/\D/g, ''));
      const matchName = p.ownerName && p.ownerName.toLowerCase().trim() === userName.toLowerCase().trim();
      return Boolean(matchPhone || matchName);
    });
  }, [properties, userPhone, userName]);

  // Filter tenant requests belonging to this user strictly
  const userRequests = useMemo(() => {
    return tenantRequests.filter((r) => {
      const matchPhone = r.tenantPhone && (r.tenantPhone === userPhone || r.tenantPhone.replace(/\D/g, '') === userPhone.replace(/\D/g, ''));
      const matchName = r.tenantName && r.tenantName.toLowerCase().trim() === userName.toLowerCase().trim();
      return Boolean(matchPhone || matchName);
    });
  }, [tenantRequests, userPhone, userName]);

  // Counts by status for property listings
  const stats = useMemo(() => {
    const total = userProperties.length;
    const pending = userProperties.filter((p) => p.status === 'pending_approval' || p.status === 'pending').length;
    const needsCompletion = userProperties.filter((p) => p.status === 'needs_completion').length;
    const approved = userProperties.filter((p) => p.status === 'approved' && p.isApproved !== false).length;
    const rentedSold = userProperties.filter((p) => p.status === 'rented' || p.status === 'sold').length;
    const archived = userProperties.filter((p) => p.status === 'archived').length;
    return { total, pending, needsCompletion, approved, rentedSold, archived };
  }, [userProperties]);

  // Filtered properties based on search and stage
  const filteredProperties = useMemo(() => {
    return userProperties.filter((p) => {
      // Stage filter
      if (filterStage === 'pending') {
        if (p.status !== 'pending' && p.status !== 'pending_approval') return false;
      } else if (filterStage === 'needs_completion') {
        if (p.status !== 'needs_completion') return false;
      } else if (filterStage === 'approved') {
        if (p.status !== 'approved' || p.isApproved === false) return false;
      } else if (filterStage === 'archived') {
        if (p.status !== 'archived' && p.status !== 'rented' && p.status !== 'sold') return false;
      } else if (filterStage === 'inspections') {
        // Has scheduled inspection
        const hasInsp = inspections.some((i) => i.propertyId === p.id || i.propertyCode === p.code);
        if (!hasInsp && !p.inspectionDate) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const codeMatch = p.code.toLowerCase().includes(q);
        const titleMatch = p.title.toLowerCase().includes(q);
        const districtMatch = p.district.toLowerCase().includes(q);
        if (!codeMatch && !titleMatch && !districtMatch) return false;
      }

      return true;
    });
  }, [userProperties, filterStage, searchQuery, inspections]);

  // Filtered requests based on search
  const filteredRequests = useMemo(() => {
    return userRequests.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const codeMatch = r.requestCode?.toLowerCase().includes(q);
        const distMatch = r.preferredDistrict.toLowerCase().includes(q);
        const typeMatch = r.propertyType.toLowerCase().includes(q);
        if (!codeMatch && !distMatch && !typeMatch) return false;
      }
      return true;
    });
  }, [userRequests, searchQuery]);

  const handleCopyPaymentNumber = () => {
    navigator.clipboard.writeText('01002345678');
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150 select-none" dir="rtl">
      
      {/* 1. Header Banner */}
      <div className="bg-[#124C46] text-white rounded-2xl p-5 sm:p-6 shadow-xs border border-[#0D3D38] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-[#D6A84F] text-[#24313D] px-2.5 py-0.5 rounded-full font-bold">
                سجل حسابي
              </span>
              <span className="text-xs text-[#DCECE7] font-semibold">
                رقم الحساب: <span dir="ltr" className="font-mono text-white font-bold">{currentUser.phone}</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mt-1.5 tracking-tight text-white font-['Tajawal','Cairo',sans-serif]">
              إعلاناتي وعقاراتي المسجلة
            </h1>
            <p className="text-xs sm:text-sm text-[#DCECE7] mt-0.5">
              متابعة مراحل المراجعة، المعاينة، وتعديل أو أرشفة أو إعادة نشر إعلاناتك بأسيوط
            </p>
          </div>

          {/* Quick Add Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenAddOffer}
              className="px-3.5 py-2 rounded-xl bg-[#D6A84F] hover:bg-[#c49842] text-[#24313D] font-bold text-xs transition-transform active:scale-95 shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#24313D]" />
              <span>إضافة عقار</span>
            </button>
            <button
              type="button"
              onClick={onOpenAddRequest}
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-white/20"
            >
              <Assignment className="w-4 h-4 text-[#D6A84F]" />
              <span>طلب سكن</span>
            </button>
          </div>
        </div>

        {/* 2. Quick Pipeline Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#DCECE7] font-semibold">المعروض النشط</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="text-xl font-black text-white mt-1">{stats.approved}</div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#DCECE7] font-semibold">قيد المراجعة والسداد</span>
              <Clock className="w-4 h-4 text-[#D6A84F]" />
            </div>
            <div className="text-xl font-black text-white mt-1">{stats.pending}</div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#DCECE7] font-semibold">مطلوب استكمال بيان</span>
              <AlertTriangle className="w-4 h-4 text-rose-300" />
            </div>
            <div className="text-xl font-black text-white mt-1">{stats.needsCompletion}</div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#DCECE7] font-semibold">المؤرشف والمنتهي</span>
              <Archive className="w-4 h-4 text-slate-300" />
            </div>
            <div className="text-xl font-black text-white mt-1">{stats.archived + stats.rentedSold}</div>
          </div>
        </div>
      </div>

      {/* 3. Category Toggle (عقاراتي vs طلباتي للسكن vs عقاراتي المفضلة) */}
      <div className="bg-white p-1.5 rounded-2xl border border-[#D6DEE5] shadow-2xs flex gap-1.5 flex-wrap sm:flex-nowrap">
        <button
          type="button"
          onClick={() => setActiveCategory('properties')}
          className={`flex-1 min-w-[90px] py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeCategory === 'properties'
              ? 'bg-[#124C46] text-white shadow-xs'
              : 'text-[#5D6B78] hover:text-[#24313D] hover:bg-[#F5F7F9]'
          }`}
        >
          <RealEstateAgent className="w-4 h-4 shrink-0" />
          <span>عقاراتي ({userProperties.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('requests')}
          className={`flex-1 min-w-[90px] py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeCategory === 'requests'
              ? 'bg-[#124C46] text-white shadow-xs'
              : 'text-[#5D6B78] hover:text-[#24313D] hover:bg-[#F5F7F9]'
          }`}
        >
          <Assignment className="w-4 h-4 shrink-0" />
          <span>طلباتي ({userRequests.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('favorites')}
          className={`flex-1 min-w-[90px] py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeCategory === 'favorites'
              ? 'bg-[#FCE8EC] text-[#C9364F] font-bold border border-[#FCE8EC] shadow-2xs'
              : 'text-[#5D6B78] hover:text-[#C9364F] hover:bg-[#FCE8EC]/50'
          }`}
        >
          <Heart className={`w-4 h-4 shrink-0 ${activeCategory === 'favorites' ? 'fill-[#C9364F] text-[#C9364F]' : 'text-[#788593]'}`} />
          <span>المفضلة ({favoriteProperties.length})</span>
        </button>
      </div>

      {/* 4. Stage Filters Pills (For Properties) & Search */}
      {activeCategory === 'properties' && (
        <div className="bg-white p-3 rounded-2xl border border-[#D6DEE5] shadow-2xs space-y-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setFilterStage('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                filterStage === 'all'
                  ? 'bg-[#124C46] text-white'
                  : 'bg-[#F5F7F9] text-[#5D6B78] hover:text-[#24313D] hover:bg-[#EAF3EF]'
              }`}
            >
              الكل ({userProperties.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterStage('approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1 ${
                filterStage === 'approved'
                  ? 'bg-[#16856B] text-white'
                  : 'bg-[#E4F4EC] text-[#16856B] hover:bg-[#d0eedd] border border-[#16856B]/20'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>معتمد ومنشور ({stats.approved})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStage('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1 ${
                filterStage === 'pending'
                  ? 'bg-[#A96F0B] text-white'
                  : 'bg-[#FFF2D6] text-[#A96F0B] hover:bg-[#ffe6b3] border border-[#A96F0B]/20'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>قيد المراجعة والسداد ({stats.pending})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStage('needs_completion')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1 ${
                filterStage === 'needs_completion'
                  ? 'bg-[#C9364F] text-white'
                  : 'bg-[#FCE8EC] text-[#C9364F] hover:bg-[#fad3db] border border-[#C9364F]/20'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>مطلوب استكمال بيان ({stats.needsCompletion})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStage('archived')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1 ${
                filterStage === 'archived'
                  ? 'bg-[#5D6B78] text-white'
                  : 'bg-[#F5F7F9] text-[#5D6B78] hover:bg-slate-200 border border-[#D6DEE5]'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>مؤرشف ومنتهي ({stats.archived + stats.rentedSold})</span>
            </button>
          </div>

          {/* Search within My Ads */}
          <div className="relative">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في إعلاناتك برقم الكود، العنوان، أو المنطقة..."
              className="w-full pr-10 pl-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-[#002B49] focus:ring-1 focus:ring-[#002B49]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. Properties List */}
      {activeCategory === 'properties' && (
        <div className="space-y-3">
          {filteredProperties.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl text-center border border-slate-200 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto shadow-2xs">
                <Building2 className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">لا توجد إعلانات مطابقة في هذا التصنيف</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {userProperties.length === 0
                  ? 'لم تقم بنشر أي عقارات حتى الآن. أضف عقارك الأول الآن لنشره لآلاف الباحثين بأسيوط!'
                  : 'جرب تغيير خيارات التصفية أو البحث أعلاه لعرض بقية إعلاناتك.'}
              </p>
              <button
                type="button"
                onClick={onOpenAddOffer}
                className="px-5 py-2.5 rounded-xl bg-[#002B49] text-[#FFB300] font-black text-xs shadow-md hover:bg-[#001D33] transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة عقار جديد الآن</span>
              </button>
            </div>
          ) : (
            filteredProperties.map((prop) => {
              const isApproved = prop.status === 'approved' && prop.isApproved !== false;
              const isNeedsCompletion = prop.status === 'needs_completion';
              const isPending = prop.status === 'pending_approval' || prop.status === 'pending';
              const isArchived = prop.status === 'archived';
              const isRentedOrSold = prop.status === 'rented' || prop.status === 'sold';

              // Associated inspection if any
              const matchedInsp = inspections.find((i) => i.propertyId === prop.id || i.propertyCode === prop.code);

              return (
                <div
                  key={prop.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all p-4 sm:p-5 space-y-3.5 relative overflow-hidden"
                >
                  {/* Top Row: Code, District, Status Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs bg-[#002B49] text-[#FFB300] px-2.5 py-1 rounded-lg shadow-2xs">
                        كود: {prop.code}
                      </span>
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>أسيوط • {prop.district}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {prop.createdAt}
                      </span>
                    </div>

                    {/* Status Pill Badge */}
                    <div className="shrink-0">
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>معتمد ونشط</span>
                        </span>
                      )}
                      {isNeedsCompletion && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>مطلوب استكمال بيان</span>
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          <span>قيد المراجعة والتدقيق</span>
                        </span>
                      )}
                      {isArchived && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-slate-200 text-slate-700">
                          <Archive className="w-3.5 h-3.5" />
                          <span>مؤرشف (معطل مؤقتاً)</span>
                        </span>
                      )}
                      {isRentedOrSold && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-200">
                          <Check className="w-3.5 h-3.5" />
                          <span>{prop.status === 'rented' ? 'تم التأجير بنجاح' : 'تم البيع بنجاح'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Main Info: Title, Specs, Price */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                        {prop.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold flex-wrap">
                        <span>نوع الوحدة: <strong className="text-slate-800">{prop.propertyType}</strong></span>
                        <span>المساحة: <strong className="text-slate-800">{prop.area} م²</strong></span>
                        {prop.floorLevel && <span>الدور: <strong className="text-slate-800">{prop.floorLevel}</strong></span>}
                        {prop.viewsCount ? (
                          <span className="text-emerald-700">المشاهدات: <strong>{prop.viewsCount}</strong></span>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-right sm:text-left shrink-0">
                      <div className="text-xs text-slate-400 font-bold">
                        {prop.purpose === 'rent' ? 'قيمة الإيجار المطلوب' : 'سعر البيع المطلوب'}
                      </div>
                      <div className="text-lg font-black text-[#002B49]">
                        {prop.price.toLocaleString('ar-EG')} <span className="text-xs text-slate-500 font-bold">{prop.purpose === 'rent' ? 'ج.م/شهر' : 'ج.م كاش'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 6. Dynamic Stage Tracking & Alert Boxes */}
                  {/* Case A: Needs Completion Alert */}
                  {isNeedsCompletion && (
                    <div className="bg-rose-50 border border-rose-300 rounded-2xl p-3.5 space-y-2 animate-in fade-in">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="flex-1 text-xs">
                          <span className="font-black text-rose-900 block mb-0.5">
                            ملاحظة إدارة المنظومة للاعتماد:
                          </span>
                          <span className="text-rose-800 font-medium">
                            {prop.adminNote || 'يرجى مراجعة بيانات الإعلان واستكمال الصور والموقع التفصيلي لتأكيد الاعتماد.'}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => onEditProperty(prop)}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>استكمال وتعديل البيانات الآن</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Case B: Pending Review and Fee Status Box */}
                  {isPending && (
                    <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-3.5 space-y-2 text-xs">
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span className="font-black text-amber-950 block mb-0.5">
                            مرحلة المراجعة وسداد رسوم المعاينة والنشر:
                          </span>
                          <p className="text-amber-900 font-medium leading-relaxed">
                            إعلانك قيد الفحص والمراجعة. يرجى سداد رسوم المعاينة والتوثيق الميداني (50 ج.م) لخروج مندوب المعاينة واعتماد الإعلان رسمياً.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                        <span className="text-[11px] font-bold text-amber-900">
                          وسائل الدفع المعتمدة: فودافون كاش / إنستاباي
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedFeeModalProp(prop)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>تفاصيل السداد والتحويل</span>
                        </button>
                      </div>

                      {/* In-App Push Notice & Test Trigger */}
                      <div className="bg-amber-100/70 border border-amber-200/80 p-2.5 rounded-xl text-[11px] text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>ستتلقى إشعار دفع (In-App Push) فورياً مع تنبيه صوتي عند اعتماد أو رفض الإعلان.</span>
                        </div>
                        {onTestPushNotification && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => onTestPushNotification('approved')}
                              className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors cursor-pointer"
                              title="تجربة إشعار اعتماد الإعلان"
                            >
                              تجربة إشعار الاعتماد
                            </button>
                            <button
                              type="button"
                              onClick={() => onTestPushNotification('rejected')}
                              className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] transition-colors cursor-pointer"
                              title="تجربة إشعار رفض الإعلان"
                            >
                              تجربة إشعار الرفض
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Case C: Scheduled Inspection Box */}
                  {matchedInsp && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-xs space-y-1">
                      <div className="flex items-center gap-2 text-blue-900 font-black">
                        <Calendar className="w-4 h-4 text-blue-700" />
                        <span>موعد المعاينة الميدانية المجدولة للعقار:</span>
                      </div>
                      <p className="text-blue-800 font-medium">
                        التاريخ: <strong>{matchedInsp.preferredDate}</strong> • الوقت: <strong>{matchedInsp.preferredTime}</strong> • الحالة: <strong>{matchedInsp.status === 'confirmed' ? 'مؤكدة' : 'قيد التنسيق'}</strong>
                      </p>
                    </div>
                  )}

                  {/* 7. Action Buttons Toolbar */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
                    
                    {/* View Details Modal */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenDetails(prop)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                        title="معاينة تفاصيل الإعلان"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>عرض الإعلان</span>
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => onEditProperty(prop)}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer border border-blue-200"
                        title="تعديل بيانات العقار"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>تعديل</span>
                      </button>
                    </div>

                    {/* Stage & Lifecycle Controls */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      
                      {/* Toggle Rented / Sold */}
                      {!isArchived && (
                        <button
                          type="button"
                          onClick={() => onToggleRentedSold(prop.id, prop.status)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer ${
                            isRentedOrSold
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                          title="تحديد هل تم التأجير"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isRentedOrSold ? 'إلغاء التأجير وتنشيط' : 'تم التأجير'}</span>
                        </button>
                      )}

                      {/* Archive vs Republish */}
                      {isArchived ? (
                        <button
                          type="button"
                          onClick={() => onRepublishProperty(prop.id)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                          title="إعادة نشر الإعلان مجدداً"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>إعادة نشر الإعلان</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onArchiveProperty(prop.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                          title="أرشفة الإعلان وإخفائه مؤقتاً"
                        >
                          <Archive className="w-3.5 h-3.5 text-slate-500" />
                          <span>أرشفة</span>
                        </button>
                      )}

                      {/* Delete Button with Confirmation State */}
                      {deleteConfirmId === prop.id ? (
                        <div className="flex items-center gap-1 animate-in fade-in">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteProperty(prop.id);
                              setDeleteConfirmId(null);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-600 text-white font-black text-xs hover:bg-rose-700 cursor-pointer"
                          >
                            تأكيد الحذف
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(prop.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="حذف الإعلان نهائياً"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>
      )}

      {/* 6. Requests Category List */}
      {activeCategory === 'requests' && (
        <div className="space-y-3">
          {filteredRequests.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl text-center border border-slate-200 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto shadow-2xs">
                <Assignment className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">لا توجد طلبات سكن مسجلة برقم هاتفك</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                سجل طلبك العقاري بمواصفات الشقة أو العقار المطلوب وميزانيتك لتلقي عروض مباشرة من الملاك.
              </p>
              <button
                type="button"
                onClick={onOpenAddRequest}
                className="px-5 py-2.5 rounded-xl bg-[#002B49] text-[#FFB300] font-black text-xs shadow-md hover:bg-[#001D33] transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة طلب سكن جديد</span>
              </button>
            </div>
          ) : (
            filteredRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 space-y-3 shadow-2xs hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-[#FFB300] text-black px-2.5 py-1 rounded-lg">
                      كود الطلب: {req.requestCode || req.id}
                    </span>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {req.preferredDistrict}
                    </span>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    req.isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                  }`}>
                    {req.isApproved ? 'معتمد ومنشور' : 'قيد المراجعة'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      مطلوب {req.purpose === 'rent' ? 'إيجار' : 'شراء'} {req.propertyType}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      الميزانية القصوى: <strong>{req.maxPrice.toLocaleString('ar-EG')} ج.م</strong>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {onEditTenantRequest && (
                      <button
                        type="button"
                        onClick={() => onEditTenantRequest(req)}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 font-bold text-xs hover:bg-blue-100 transition-colors border border-blue-200 cursor-pointer flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>
                    )}

                    {onDeleteTenantRequest && (
                      <button
                        type="button"
                        onClick={() => onDeleteTenantRequest(req.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {req.notes && (
                  <p className="text-xs bg-slate-50 p-2.5 rounded-xl text-slate-600 font-medium">
                    {req.notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 6.5 Favorites Category List in Personal Profile */}
      {activeCategory === 'favorites' && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border border-rose-200/80 p-3.5 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xs">
                <Heart className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>قائمة العقارات المفضلة</span>
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.2 rounded-full">
                    {favoriteProperties.length}
                  </span>
                </h4>
                <p className="text-xs text-slate-500">
                  محفوظة في متصفحك للرجوع إليها أو حجز موعد معاينة بضغطة زر
                </p>
              </div>
            </div>
          </div>

          {favoriteProperties.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl text-center border border-slate-200 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto shadow-2xs border border-rose-100">
                <Heart className="w-8 h-8 text-rose-400" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">لا توجد عقارات في قائمتك المفضلة حالياً</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                اضغط على أيقونة القلب ❤️ في بطاقات عروض العقارات لحفظها في ملفك الشخصي والرجوع إليها ومقارنتها في أي وقت.
              </p>
              <button
                type="button"
                onClick={onOpenAddOffer}
                className="px-5 py-2.5 rounded-xl bg-[#002B49] text-[#FFB300] font-black text-xs shadow-md hover:bg-[#001D33] transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RealEstateAgent className="w-4 h-4 text-[#FFB300]" />
                <span>استكشف عروض العقارات المتاحة</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {favoriteProperties.map((prop) => {
                const isRent = prop.purpose === 'rent';
                const mainImg = prop.images && prop.images.length > 0 
                  ? prop.images[0] 
                  : DEFAULT_SAKAN_PLACEHOLDER;
                const isPlaceholder = mainImg === DEFAULT_SAKAN_PLACEHOLDER || !prop.images || prop.images.length === 0;

                const handleContactWhatsApp = () => {
                  const text = encodeURIComponent(
                    `السلام عليكم، أود التواصل مع إدارة تطبيق عَرضَه أسيوط بخصوص العقار المفضل (كود: ${prop.code}) - ${prop.title} في ${prop.district}.`
                  );
                  window.open(`https://wa.me/201002345678?text=${text}`, '_blank');
                };

                return (
                  <div
                    key={prop.id}
                    className="bg-white rounded-3xl border border-slate-200/90 hover:border-slate-300 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      <div className="w-22 h-22 rounded-2xl bg-[#002B49] overflow-hidden shrink-0 border border-slate-200 relative flex items-center justify-center">
                        <img
                          src={mainImg}
                          alt={prop.title}
                          className={`w-full h-full transition-transform duration-300 group-hover:scale-105 ${
                            isPlaceholder ? 'object-contain p-2' : 'object-cover'
                          }`}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = DEFAULT_SAKAN_PLACEHOLDER;
                            target.className = 'w-full h-full object-contain p-2';
                          }}
                        />
                        <span className="absolute bottom-1 right-1 text-[9px] bg-black/70 text-white font-mono px-1.5 py-0.2 rounded-md">
                          {prop.code}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isRent
                              ? 'bg-blue-950/60 text-blue-300 border border-blue-800'
                              : 'bg-amber-950/60 text-amber-300 border border-amber-800'
                          }`}>
                            {`${prop.propertyType === 'شقة سكنية' ? 'شقة' : prop.propertyType === 'قطعة أرض فضاء' ? 'أرض' : prop.propertyType} ${isRent ? 'للإيجار' : 'للبيع'}`}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5 text-teal-600" />
                            {prop.district}
                          </span>
                        </div>

                        <h4 
                          onClick={() => onOpenDetails(prop)}
                          className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1 hover:text-[#002B49] cursor-pointer"
                          title={prop.title}
                        >
                          {prop.title}
                        </h4>

                        {/* Specs */}
                        <div className="flex items-center gap-2.5 text-[11px] text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            <Maximize2 className="w-3 h-3 text-slate-400" />
                            {prop.area} م²
                          </span>
                          {prop.bedrooms !== undefined && (
                            <span className="flex items-center gap-1">
                              <Bed className="w-3 h-3 text-slate-400" />
                              {prop.bedrooms} غرف
                            </span>
                          )}
                          {prop.bathrooms !== undefined && (
                            <span className="flex items-center gap-1">
                              <Bath className="w-3 h-3 text-slate-400" />
                              {prop.bathrooms} حمام
                            </span>
                          )}
                        </div>

                        <div className="font-extrabold text-[#002B49] text-xs sm:text-sm pt-0.5">
                          {prop.price.toLocaleString('ar-EG')} ج.م
                          <span className="text-[10px] text-slate-500 font-normal mr-1">
                            {isRent ? '/ شهر' : 'إجمالي'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleContactWhatsApp}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                          title="تواصل مع إدارة التطبيق بخصوص هذا العقار"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>تواصل</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenDetails(prop)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="معاينة تفاصيل العقار"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>معاينة</span>
                        </button>
                      </div>

                      {onToggleFavorite && (
                        <button
                          type="button"
                          onClick={() => onToggleFavorite(prop.id)}
                          className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                          title="إزالة من المفضلة"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span>حذف من المفضلة</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. Fee & Payment Instructions Modal */}
      {selectedFeeModalProp && (
        <div 
          onClick={() => setSelectedFeeModalProp(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#002B49]" />
                <h3 className="font-black text-sm text-[#002B49]">
                  سداد رسوم المعاينة والتوثيق الميداني
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFeeModalProp(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200">
                <div className="font-bold text-amber-950">
                  كود العقار: <span className="font-mono font-black">{selectedFeeModalProp.code}</span>
                </div>
                <div className="text-amber-800 mt-0.5">
                  قيمة رسوم المعاينة والنشر المعتمد: <strong>50 ج.م فقط</strong>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800">
                  طريقة التحويل عبر محفظة فودافون كاش / إنستاباي:
                </div>
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="font-mono text-sm font-black text-[#002B49]" dir="ltr">
                    01002345678
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPaymentNumber}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    {copiedAccount ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAccount ? 'تم النسخ' : 'نسخ الرقم'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  بعد التحويل، يرجى إرسال لقطة شاشة لإيصال التحويل مع كود العقار ({selectedFeeModalProp.code}) إلى واتساب الإدارة لبدء المعاينة فوراً.
                </p>
              </div>

              <a
                href={`https://wa.me/201002345678?text=${encodeURIComponent(`السلام عليكم، تم تحويل رسوم المعاينة للعقار كود (${selectedFeeModalProp.code}). مرفق صورة الإيصال للاعتماد.`)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                <span>إرسال إيصال السداد عبر واتساب</span>
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
