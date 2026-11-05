import React, { useState, useMemo } from 'react';
import { TenantRequest, AppUser, Property } from '../../types/property';
import { PropertyGroupDefinition } from '../../types/formConfig';
import { 
  FileText, Search, Filter, CheckCircle2, XCircle, Trash2, Eye, Edit3, 
  MapPin, Phone, User, Clock, AlertTriangle, RefreshCw, X, Sparkles
} from 'lucide-react';
import { logAuditEvent } from '../../utils/auditManager';

interface AdminRequestsSectionProps {
  currentUser?: AppUser | null;
  tenantRequests: TenantRequest[];
  properties?: Property[];
  groups: PropertyGroupDefinition[];
  onUpdateStatus?: (requestId: string, status: any, reason?: string) => Promise<boolean> | void;
  onDeleteRequest?: (requestId: string) => Promise<boolean> | void;
  onOpenDetails?: (request: TenantRequest) => void;
  onEditRequest?: (request: TenantRequest) => void;
  onRefresh?: () => void;
}

export const AdminRequestsSection: React.FC<AdminRequestsSectionProps> = ({
  currentUser,
  tenantRequests,
  properties = [],
  groups,
  onUpdateStatus,
  onDeleteRequest,
  onOpenDetails,
  onEditRequest,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Rejection modal
  const [rejectingRequest, setRejectingRequest] = useState<TenantRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('الميزانية غير واقعية مقارنة بنوع الوحدة المطلوب.');

  // Deletion modal
  const [deletingRequest, setDeletingRequest] = useState<TenantRequest | null>(null);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return tenantRequests.filter((req) => {
      const isApproved = req.status === 'approved' || req.isApproved;
      const isRejected = req.status === 'rejected';
      const isPending = !isApproved && !isRejected;

      if (activeTab === 'pending' && !isPending) return false;
      if (activeTab === 'approved' && !isApproved) return false;
      if (activeTab === 'rejected' && !isRejected) return false;

      if (selectedGroup !== 'all' && req.propertyGroup !== selectedGroup) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesCode = (req.requestCode || req.id || '').toLowerCase().includes(q);
        const matchesName = (req.tenantName || '').toLowerCase().includes(q);
        const matchesPhone = (req.tenantPhone || '').includes(q);
        const matchesDistrict = (req.preferredDistrict || '').toLowerCase().includes(q);
        const matchesType = (req.propertyType || '').toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesPhone && !matchesDistrict && !matchesType) {
          return false;
        }
      }

      return true;
    });
  }, [tenantRequests, activeTab, selectedGroup, searchQuery]);

  const countPending = tenantRequests.filter(
    (r) => !r.isApproved && r.status !== 'approved' && r.status !== 'rejected'
  ).length;
  const countApproved = tenantRequests.filter((r) => r.status === 'approved' || r.isApproved).length;
  const countRejected = tenantRequests.filter((r) => r.status === 'rejected').length;

  const handleApprove = async (req: TenantRequest) => {
    if (!onUpdateStatus || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onUpdateStatus(req.id, 'approved');
      logAuditEvent({
        userName: currentUser?.name || 'مدير المنظومة',
        userPhone: currentUser?.phone || '01000000000',
        userRole: currentUser?.role || 'admin',
        action: 'STATUS_CHANGE',
        entityType: 'tenant_request',
        entityId: req.id,
        entityCode: req.requestCode,
        oldValues: { status: req.status },
        newValues: { status: 'approved' },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequest || !onUpdateStatus || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onUpdateStatus(rejectingRequest.id, 'rejected', rejectReason);
      logAuditEvent({
        userName: currentUser?.name || 'مدير المنظومة',
        userPhone: currentUser?.phone || '01000000000',
        userRole: currentUser?.role || 'admin',
        action: 'STATUS_CHANGE',
        entityType: 'tenant_request',
        entityId: rejectingRequest.id,
        entityCode: rejectingRequest.requestCode,
        oldValues: { status: rejectingRequest.status },
        newValues: { status: 'rejected', reason: rejectReason },
      });
      setRejectingRequest(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingRequest || !onDeleteRequest || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onDeleteRequest(deletingRequest.id);
      logAuditEvent({
        userName: currentUser?.name || 'مدير المنظومة',
        userPhone: currentUser?.phone || '01000000000',
        userRole: currentUser?.role || 'admin',
        action: 'DELETE',
        entityType: 'tenant_request',
        entityId: deletingRequest.id,
        entityCode: deletingRequest.requestCode,
        oldValues: deletingRequest,
      });
      setDeletingRequest(null);
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
              <FileText className="w-5 h-5 text-blue-700" />
              <span>إدارة طلبات المستأجرين</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-mono font-bold">
                {filteredRequests.length} / {tenantRequests.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              مراجعة متطلبات المستأجرين، الميزانيات، الاعتماد أو الرفض مع المزامنة الفورية في Supabase.
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
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل ({tenantRequests.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
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
            <span>معتمدة ({countApproved})</span>
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

        {/* Search & Group Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث بالكود، اسم المستأجر، الحي، أو الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-600 transition-all"
            />
          </div>

          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-600 transition-all cursor-pointer"
          >
            <option value="all">كل المجموعات العقارية</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">لا توجد طلبات مستأجرين مطابقة للبحث</h3>
          <p className="text-xs text-slate-400">جرّب اختيار تبويب آخر أو مسح كلمة البحث.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs divide-y divide-slate-100">
          {filteredRequests.map((req) => {
            const isApproved = req.status === 'approved' || req.isApproved;
            const isRejected = req.status === 'rejected';
            const isPending = !isApproved && !isRejected;

            return (
              <div 
                key={req.id}
                className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-extrabold text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded-md">
                      {req.requestCode || 'طلب'}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      مطلوب: {req.propertyType}
                    </span>
                    {/* Status Badge */}
                    {isApproved && (
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        معتمد
                      </span>
                    )}
                    {isPending && (
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
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
                      <span>{req.preferredDistrict || 'أي منطقة بأسيوط'}</span>
                    </span>
                    <span className="font-bold text-slate-800 font-mono">
                      الميزانية: {req.minPrice ? `${req.minPrice.toLocaleString('ar-EG')} - ` : ''}{req.maxPrice?.toLocaleString('ar-EG')} ج.م
                    </span>
                    <span className="flex items-center gap-1 text-slate-600">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{req.tenantName || 'مستأجر'}</span>
                    </span>
                    <span className="flex items-center gap-1 font-mono text-slate-600" dir="ltr">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{req.tenantPhone}</span>
                    </span>
                  </div>

                  {req.notes && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg mt-2 line-clamp-2">
                      {req.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {isPending && onUpdateStatus && (
                    <button
                      type="button"
                      onClick={() => handleApprove(req)}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>اعتماد</span>
                    </button>
                  )}

                  {!isRejected && onUpdateStatus && (
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingRequest(req);
                        setRejectReason('الميزانية غير واقعية مقارنة بنوع الوحدة المطلوب.');
                      }}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>رفض</span>
                    </button>
                  )}

                  {onOpenDetails && (
                    <button
                      type="button"
                      onClick={() => onOpenDetails(req)}
                      className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                      title="معاينة تفاصيل الطلب"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}

                  {onEditRequest && (
                    <button
                      type="button"
                      onClick={() => onEditRequest(req)}
                      className="p-2 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                      title="تعديل بيانات الطلب"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}

                  {onDeleteRequest && (
                    <button
                      type="button"
                      onClick={() => setDeletingRequest(req)}
                      className="p-2 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                      title="حذف الطلب نهائياً"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>رفض طلب المستأجر ({rejectingRequest.requestCode || rejectingRequest.id})</span>
              </h3>
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                سبب الرفض:
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-600"
              />
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
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

      {/* Delete Modal */}
      {deletingRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                تأكيد حذف طلب المستأجر ({deletingRequest.requestCode || deletingRequest.id})
              </h3>
              <p className="text-xs text-slate-500">
                هل أنت متأكد من حذف هذا الطلب نهائياً من قاعدة بيانات Supabase؟
              </p>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-center gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setDeletingRequest(null)}
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
