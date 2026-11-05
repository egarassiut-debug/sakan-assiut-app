import React, { useState, useMemo } from 'react';
import { Property, PropertyStatus, AppUser } from '../../types/property';
import { PropertyGroupDefinition } from '../../types/formConfig';
import { 
  Building2, Search, Filter, CheckCircle2, XCircle, Trash2, Eye, Edit3, 
  MapPin, Phone, User, Clock, AlertTriangle, ExternalLink, RefreshCw, X
} from 'lucide-react';
import { logAuditEvent } from '../../utils/auditManager';

interface AdminPropertiesSectionProps {
  currentUser?: AppUser | null;
  properties: Property[];
  groups: PropertyGroupDefinition[];
  onUpdateStatus: (propertyId: string, status: PropertyStatus, reason?: string) => Promise<boolean> | void;
  onDeleteProperty: (propertyId: string) => Promise<boolean> | void;
  onOpenDetails: (property: Property) => void;
  onEditProperty?: (property: Property) => void;
  onRefresh?: () => void;
}

const PREDEFINED_REJECTION_REASONS = [
  'السعر أو القيمة الإيجارية غير واقعية مقارنة بمتوسط أسعار المنطقة في أسيوط.',
  'الصور غير واضحة أو تحتوي على علامات مائية أو لقطات مكررة.',
  'البيانات أو أرقام التواصل غير صحيحة أو غير متاحة للمعاينة.',
  'العقار تم تأجيره أو بيعه بالفعل ومسجل مسبقاً في المنظومة.',
  'مخالفة شروط وسياسات النشر المعتمدة في سكن أسيوط.',
];

export const AdminPropertiesSection: React.FC<AdminPropertiesSectionProps> = ({
  currentUser,
  properties,
  groups,
  onUpdateStatus,
  onDeleteProperty,
  onOpenDetails,
  onEditProperty,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedPurpose, setSelectedPurpose] = useState<'all' | 'rent' | 'sale'>('all');

  // Reject Modal State
  const [rejectingProperty, setRejectingProperty] = useState<Property | null>(null);
  const [selectedReason, setSelectedReason] = useState(PREDEFINED_REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirm State
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null);

  // Filtered Properties
  const filteredProperties = useMemo(() => {
    return properties.filter((prop) => {
      // Tab filter
      const isApproved = prop.status === 'approved' || prop.isApproved;
      const isRejected = prop.status === 'rejected';
      const isPending = !isApproved && !isRejected;

      if (activeTab === 'pending' && !isPending) return false;
      if (activeTab === 'approved' && !isApproved) return false;
      if (activeTab === 'rejected' && !isRejected) return false;

      // Group filter
      if (selectedGroup !== 'all' && prop.propertyGroup !== selectedGroup) return false;

      // Purpose filter
      if (selectedPurpose !== 'all' && prop.purpose !== selectedPurpose) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesCode = (prop.code || '').toLowerCase().includes(q);
        const matchesTitle = (prop.title || '').toLowerCase().includes(q);
        const matchesDistrict = (prop.district || '').toLowerCase().includes(q);
        const matchesOwner = (prop.ownerName || '').toLowerCase().includes(q);
        const matchesPhone = (prop.ownerPhone || '').includes(q);
        if (!matchesCode && !matchesTitle && !matchesDistrict && !matchesOwner && !matchesPhone) {
          return false;
        }
      }

      return true;
    });
  }, [properties, activeTab, selectedGroup, selectedPurpose, searchQuery]);

  // Status counters
  const countPending = properties.filter(
    (p) => !p.isApproved && p.status !== 'approved' && p.status !== 'rejected'
  ).length;
  const countApproved = properties.filter((p) => p.status === 'approved' || p.isApproved).length;
  const countRejected = properties.filter((p) => p.status === 'rejected').length;

  const handleApprove = async (prop: Property) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onUpdateStatus(prop.id, 'approved');
      logAuditEvent({
        userName: currentUser?.name || 'مدير المنظومة',
        userPhone: currentUser?.phone || '01000000000',
        userRole: currentUser?.role || 'admin',
        action: 'STATUS_CHANGE',
        entityType: 'property',
        entityId: prop.id,
        entityCode: prop.code,
        oldValues: { status: prop.status, isApproved: prop.isApproved },
        newValues: { status: 'approved', isApproved: true },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingProperty || isSubmitting) return;
    setIsSubmitting(true);
    const reasonText = customReason.trim() ? customReason.trim() : selectedReason;
    try {
      await onUpdateStatus(rejectingProperty.id, 'rejected', reasonText);
      logAuditEvent({
        userName: currentUser?.name || 'مدير المنظومة',
        userPhone: currentUser?.phone || '01000000000',
        userRole: currentUser?.role || 'admin',
        action: 'STATUS_CHANGE',
        entityType: 'property',
        entityId: rejectingProperty.id,
        entityCode: rejectingProperty.code,
        oldValues: { status: rejectingProperty.status },
        newValues: { status: 'rejected', rejectionReason: reasonText },
      });
      setRejectingProperty(null);
      setCustomReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProperty || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onDeleteProperty(deletingProperty.id);
      logAuditEvent({
        userName: currentUser?.name || 'مدير المنظومة',
        userPhone: currentUser?.phone || '01000000000',
        userRole: currentUser?.role || 'admin',
        action: 'DELETE',
        entityType: 'property',
        entityId: deletingProperty.id,
        entityCode: deletingProperty.code,
        oldValues: deletingProperty,
      });
      setDeletingProperty(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#124C46]" />
              <span>إدارة عروض العقارات المباشرة</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-mono font-bold">
                {filteredProperties.length} / {properties.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              مراجعة العروض الجديدة، القبول، الرفض مع بيان الأسباب، والتعديل والحذف المباشر في Supabase.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                title="تحديث القائمة"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#124C46] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل ({properties.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>بانتظار المراجعة ({countPending})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('approved')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'approved'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>معتمدة ومنشورة ({countApproved})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rejected')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'rejected'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>مرفوضة ({countRejected})</span>
          </button>
        </div>

        {/* Search & Dropdown Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث بالكود، اسم المعلن، الحي، أو الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#124C46] transition-all"
            />
          </div>

          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#124C46] transition-all cursor-pointer"
          >
            <option value="all">كل المجموعات العقارية</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>

          <select
            value={selectedPurpose}
            onChange={(e) => setSelectedPurpose(e.target.value as any)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#124C46] transition-all cursor-pointer"
          >
            <option value="all">كل العمليات (إيجار وبيع)</option>
            <option value="rent">إيجار فقط</option>
            <option value="sale">بيع وتمليك فقط</option>
          </select>
        </div>
      </div>

      {/* Properties List / Table */}
      {filteredProperties.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">لا توجد عقارات مطابقة للبحث أو الفلتر</h3>
          <p className="text-xs text-slate-400">جرّب تغيير حالة الفلتر أو مسح كلمات البحث أعلاه.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs divide-y divide-slate-100">
          {filteredProperties.map((prop) => {
            const isApproved = prop.status === 'approved' || prop.isApproved;
            const isRejected = prop.status === 'rejected';
            const isPending = !isApproved && !isRejected;

            return (
              <div 
                key={prop.id}
                className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left/Main Info */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Thumbnail / Placeholder */}
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 shrink-0 overflow-hidden relative">
                    {prop.images && prop.images.length > 0 ? (
                      <img 
                        src={prop.images[0]} 
                        alt={prop.title} 
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Building2 className="w-6 h-6" />
                      </div>
                    )}
                    <span className={`absolute bottom-0 inset-x-0 text-[9px] font-bold text-center py-0.5 text-white ${
                      prop.purpose === 'sale' ? 'bg-amber-600' : 'bg-blue-600'
                    }`}>
                      {prop.purpose === 'sale' ? 'للبيع' : 'للإيجار'}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-extrabold text-[#124C46] font-mono bg-[#EAF3EF] px-2 py-0.5 rounded-md">
                        {prop.code || 'بدون كود'}
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate max-w-sm">
                        {prop.title || prop.propertyType}
                      </span>
                      {/* Status Badge */}
                      {isApproved && (
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          معتمد
                        </span>
                      )}
                      {isPending && (
                        <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          بانتظار المراجعة
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          مرفوض
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{prop.district}</span>
                      </span>
                      <span className="font-bold text-slate-800 font-mono">
                        {prop.price?.toLocaleString('ar-EG')} ج.م
                        {prop.purpose === 'rent' && <span className="text-[10px] font-normal text-slate-400"> / شهرياً</span>}
                      </span>
                      <span className="text-slate-400">
                        {prop.area} م²
                      </span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{prop.ownerName || 'بدون اسم'}</span>
                      </span>
                      <span className="flex items-center gap-1 font-mono text-slate-600" dir="ltr">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{prop.ownerPhone}</span>
                      </span>
                    </div>

                    {isRejected && prop.rejectionReason && (
                      <div className="mt-2 text-xs bg-rose-50 border border-rose-100 text-rose-700 p-2 rounded-lg">
                        <strong>سبب الرفض:</strong> {prop.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right/Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {/* Approve button if pending */}
                  {isPending && (
                    <button
                      type="button"
                      onClick={() => handleApprove(prop)}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>موافقة ونشر</span>
                    </button>
                  )}

                  {/* Reject button if not already rejected */}
                  {!isRejected && (
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingProperty(prop);
                        setSelectedReason(PREDEFINED_REJECTION_REASONS[0]);
                        setCustomReason('');
                      }}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>رفض</span>
                    </button>
                  )}

                  {/* View Details */}
                  <button
                    type="button"
                    onClick={() => onOpenDetails(prop)}
                    className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    title="معاينة تفاصيل الإعلان"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Edit Property */}
                  {onEditProperty && (
                    <button
                      type="button"
                      onClick={() => onEditProperty(prop)}
                      className="p-2 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                      title="تعديل بيانات العقار"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Delete Property */}
                  <button
                    type="button"
                    onClick={() => setDeletingProperty(prop)}
                    className="p-2 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                    title="حذف العقار من المنظومة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingProperty && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>رفض العقار ({rejectingProperty.code})</span>
              </h3>
              <button
                type="button"
                onClick={() => setRejectingProperty(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600">
                حدد سبب الرفض لإرساله للمعلن في الإشعار الداخلي، ومساعدته على تصحيح الإعلان:
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  السبب الافتراضي الشائع:
                </label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#124C46]"
                >
                  {PREDEFINED_REJECTION_REASONS.map((r, i) => (
                    <option key={i} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  أو كتابة ملاحظات مخصصة للمعلن:
                </label>
                <textarea
                  rows={3}
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="ملاحظات تفصيلية توضح سبب الرفض بالتحديد..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#124C46]"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setRejectingProperty(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                {isSubmitting ? 'جاري الرفض...' : 'تأكيد الرفض'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProperty && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                تأكيد حذف العقار ({deletingProperty.code})
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                هل أنت متأكد من حذف هذا الإعلان نهائياً من قاعدة بيانات Supabase؟ لن يتمكن الزوار أو صاحب العقار من الوصول إليه مجدداً.
              </p>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-center gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setDeletingProperty(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                {isSubmitting ? 'جاري الحذف...' : 'نعم، حذف نهائي'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
