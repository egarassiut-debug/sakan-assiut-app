import React, { useState, useMemo } from 'react';
import { TrendPost, AppUser } from '../../types/property';
import { 
  TrendingUp, Search, Filter, CheckCircle2, XCircle, Trash2, Pin, 
  AlertTriangle, RefreshCw, X, User, Calendar, Image as ImageIcon
} from 'lucide-react';
import { logAuditEvent } from '../../utils/auditManager';

interface AdminTrendPostsSectionProps {
  currentUser?: AppUser | null;
  trendPosts: TrendPost[];
  onUpdateStatus: (postId: string, status: 'active' | 'approved' | 'rejected' | 'pending' | 'removed', isApproved?: boolean) => Promise<boolean>;
  onDeletePost: (postId: string) => Promise<boolean>;
  onRefresh?: () => void;
}

export const AdminTrendPostsSection: React.FC<AdminTrendPostsSectionProps> = ({
  currentUser,
  trendPosts,
  onUpdateStatus,
  onDeletePost,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingPost, setDeletingPost] = useState<TrendPost | null>(null);

  const filteredPosts = useMemo(() => {
    return trendPosts.filter((post) => {
      const isApproved = post.status === 'approved' || post.status === 'active' || post.isApproved;
      const isRejected = post.status === 'rejected';
      const isPending = !isApproved && !isRejected;

      if (activeTab === 'pending' && !isPending) return false;
      if (activeTab === 'approved' && !isApproved) return false;
      if (activeTab === 'rejected' && !isRejected) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesAuthor = (post.authorName || '').toLowerCase().includes(q);
        const matchesPhone = (post.authorPhone || '').includes(q);
        const matchesContent = (post.content || '').toLowerCase().includes(q);
        if (!matchesAuthor && !matchesPhone && !matchesContent) return false;
      }
      return true;
    });
  }, [trendPosts, activeTab, searchQuery]);

  const countPending = trendPosts.filter(
    (p) => !p.isApproved && p.status !== 'approved' && p.status !== 'active' && p.status !== 'rejected'
  ).length;
  const countApproved = trendPosts.filter((p) => p.status === 'approved' || p.status === 'active' || p.isApproved).length;
  const countRejected = trendPosts.filter((p) => p.status === 'rejected').length;

  const handleApprove = async (post: TrendPost) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const success = await onUpdateStatus(post.id, 'approved', true);
      if (success) {
        logAuditEvent({
          userName: currentUser?.name || 'مدير المنظومة',
          userPhone: currentUser?.phone || '01000000000',
          userRole: currentUser?.role || 'admin',
          action: 'STATUS_CHANGE',
          entityType: 'trend_post',
          entityId: post.id,
          entityCode: post.authorName,
          oldValues: { status: post.status },
          newValues: { status: 'approved', isApproved: true },
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (post: TrendPost) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const success = await onUpdateStatus(post.id, 'rejected', false);
      if (success) {
        logAuditEvent({
          userName: currentUser?.name || 'مدير المنظومة',
          userPhone: currentUser?.phone || '01000000000',
          userRole: currentUser?.role || 'admin',
          action: 'STATUS_CHANGE',
          entityType: 'trend_post',
          entityId: post.id,
          entityCode: post.authorName,
          oldValues: { status: post.status },
          newValues: { status: 'rejected', isApproved: false },
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingPost || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const success = await onDeletePost(deletingPost.id);
      if (success) {
        logAuditEvent({
          userName: currentUser?.name || 'مدير المنظومة',
          userPhone: currentUser?.phone || '01000000000',
          userRole: currentUser?.role || 'admin',
          action: 'DELETE',
          entityType: 'trend_post',
          entityId: deletingPost.id,
          entityCode: deletingPost.authorName,
          oldValues: deletingPost,
        });
        setDeletingPost(null);
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
              <TrendingUp className="w-5 h-5 text-amber-600" />
              <span>إدارة منشورات ترند ويوميات سكن أسيوط</span>
              <span className="text-xs bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full font-mono font-bold">
                {filteredPosts.length} / {trendPosts.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              مراجعة المنشورات والطلبات المباشرة، اعتمادها أو رفضها مع إدارة الحذف في قاعدة بيانات Supabase.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                title="تحديث منشورات الترند"
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
              activeTab === 'all' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل ({trendPosts.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pending' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            بانتظار المراجعة ({countPending})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('approved')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'approved' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>معتمدة ({countApproved})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rejected')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'rejected' ? 'bg-slate-700 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>مرفوضة ({countRejected})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ابحث باسم الكاتب، رقم الهاتف، أو نص المنشور..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-600 transition-all"
          />
        </div>
      </div>

      {/* Posts List */}
      {filteredPosts.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
          <TrendingUp className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">لا توجد منشورات ترند مطابقة للبحث</h3>
          <p className="text-xs text-slate-400">جرّب تغيير التبويب أو مسح كلمة البحث.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs divide-y divide-slate-100">
          {filteredPosts.map((post) => {
            const isApproved = post.status === 'approved' || post.status === 'active' || post.isApproved;
            const isRejected = post.status === 'rejected';
            const isPending = !isApproved && !isRejected;

            return (
              <div
                key={post.id}
                className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Image thumbnail if present */}
                  {post.image ? (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 shrink-0 overflow-hidden">
                      <img src={post.image} alt="Trend preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 font-bold text-sm border border-amber-200">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold text-slate-800">
                        {post.authorName || 'مستخدم مسجل'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono" dir="ltr">
                        {post.authorPhone}
                      </span>

                      {/* Status */}
                      {isApproved && (
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          معتمد ومنشور
                        </span>
                      )}
                      {isPending && (
                        <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          بانتظار المراجعة
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          مرفوض
                        </span>
                      )}

                      {post.isPinned && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Pin className="w-3 h-3" />
                          مثبت
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-line max-w-3xl">
                      {post.content}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{post.createdAt ? post.createdAt.split('T')[0] : ''}</span>
                      </span>
                      <span>الإعجابات: {post.likesCount || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {isPending && (
                    <button
                      type="button"
                      onClick={() => handleApprove(post)}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>اعتماد</span>
                    </button>
                  )}

                  {!isRejected && (
                    <button
                      type="button"
                      onClick={() => handleReject(post)}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>رفض</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setDeletingPost(post)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="حذف المنشور نهائياً"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Modal */}
      {deletingPost && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                تأكيد حذف منشور الترند
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                هل أنت متأكد من حذف هذا المنشور نهائياً من قاعدة بيانات Supabase؟
              </p>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-center gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setDeletingPost(null)}
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
