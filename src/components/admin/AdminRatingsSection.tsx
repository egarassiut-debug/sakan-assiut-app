import React, { useState, useMemo } from 'react';
import { PropertyRating, AppUser } from '../../types/property';
import { 
  Star, Search, Trash2, Filter, AlertTriangle, Eye, RefreshCw, X, MessageSquare, User, Calendar
} from 'lucide-react';
import { logAuditEvent } from '../../utils/auditManager';

interface AdminRatingsSectionProps {
  currentUser?: AppUser | null;
  ratings: PropertyRating[];
  onDeleteRating: (ratingId: string) => Promise<boolean>;
  onRefresh?: () => void;
}

export const AdminRatingsSection: React.FC<AdminRatingsSectionProps> = ({
  currentUser,
  ratings,
  onDeleteRating,
  onRefresh,
}) => {
  const [starFilter, setStarFilter] = useState<'all' | number>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingRating, setDeletingRating] = useState<PropertyRating | null>(null);

  const filteredRatings = useMemo(() => {
    return ratings.filter((r) => {
      if (starFilter !== 'all' && r.score !== starFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesCode = (r.propertyCode || '').toLowerCase().includes(q);
        const matchesUser = (r.userName || '').toLowerCase().includes(q);
        const matchesComment = (r.comment || '').toLowerCase().includes(q);
        if (!matchesCode && !matchesUser && !matchesComment) return false;
      }
      return true;
    });
  }, [ratings, starFilter, searchQuery]);

  const averageRating = useMemo(() => {
    if (ratings.length === 0) return '5.0';
    const sum = ratings.reduce((acc, r) => acc + (r.score || 0), 0);
    return (sum / ratings.length).toFixed(1);
  }, [ratings]);

  const handleConfirmDelete = async () => {
    if (!deletingRating || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const success = await onDeleteRating(deletingRating.id);
      if (success) {
        logAuditEvent({
          userName: currentUser?.name || 'مدير المنظومة',
          userPhone: currentUser?.phone || '01000000000',
          userRole: currentUser?.role || 'admin',
          action: 'DELETE',
          entityType: 'property',
          entityId: deletingRating.id,
          entityCode: deletingRating.propertyCode,
          oldValues: deletingRating,
        });
        setDeletingRating(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span>إدارة تقييمات العقارات وآراء المستخدمين</span>
              <span className="text-xs bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full font-mono font-bold">
                {ratings.length} تقييم
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              متابعة تجارب العملاء في الوحدات السكنية والتجارية، التحقق من التقييمات، وحذف التعليقات غير اللائقة.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-sm font-extrabold font-mono text-amber-900">{averageRating}</span>
              <span className="text-xs text-amber-700">المتوسط العام</span>
            </div>

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                title="تحديث قائمة التقييمات"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث بكود العقار، اسم صاحب التقييم، أو نص التعليق..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-600 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setStarFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                starFilter === 'all' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
              }`}
            >
              الكل ({ratings.length})
            </button>
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratings.filter((r) => r.score === stars).length;
              return (
                <button
                  key={stars}
                  type="button"
                  onClick={() => setStarFilter(stars)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    starFilter === stars ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <span>{stars}</span>
                  <Star className={`w-3 h-3 ${starFilter === stars ? 'fill-white text-white' : 'fill-amber-400 text-amber-400'}`} />
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ratings List */}
      {filteredRatings.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
          <Star className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">لا توجد تقييمات مطابقة</h3>
          <p className="text-xs text-slate-400">لم يتم العثور على تقييمات في نطاق البحث أو الفلتر المحدد.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs divide-y divide-slate-100">
          {filteredRatings.map((r) => (
            <div
              key={r.id}
              className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold font-mono text-[#124C46] bg-[#EAF3EF] px-2 py-0.5 rounded-md">
                    العقار: {r.propertyCode}
                  </span>

                  {/* Star Score */}
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= r.score ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                        }`}
                      />
                    ))}
                    <span className="text-xs font-bold font-mono text-slate-700 mr-1.5">
                      ({r.score}/5)
                    </span>
                  </div>

                  <span className="text-xs font-bold text-slate-700">
                    بواسطة: {r.userName || 'مستخدم مسجل'}
                  </span>
                </div>

                {r.comment ? (
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 max-w-2xl">
                    "{r.comment}"
                  </p>
                ) : (
                  <span className="text-xs text-slate-400 italic">بدون تعليق نصي</span>
                )}

                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{r.createdAt ? r.createdAt.split('T')[0] : 'غير مؤرخ'}</span>
                  </span>
                  {r.userPhone && (
                    <span className="font-mono" dir="ltr">{r.userPhone}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => setDeletingRating(r)}
                  className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1 border border-rose-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف التقييم</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRating && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                تأكيد حذف التقييم
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                هل أنت متأكد من حذف هذا التقييم نهائياً من قاعدة بيانات Supabase؟ سيتم إعادة احتساب متوسط تقييم العقار تلقائياً.
              </p>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-center gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setDeletingRating(null)}
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
