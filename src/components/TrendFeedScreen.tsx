import React, { useState, useRef, useMemo, useEffect } from 'react';
import { TrendPost, TrendSettings, AppUser } from '../types/property';
import { DEFAULT_TREND_SETTINGS, INITIAL_TREND_POSTS, calculateExpiryDate } from '../data/initialTrendPosts';
import { safeStorageGetItem, safeStorageSetItem } from '../utils/storageManager';
import { logAuditEvent } from '../utils/auditManager';
import { useBackLayer } from '../utils/navigationHistory';
import { 
  Zap, 
  Send, 
  Image as ImageIcon, 
  X, 
  Phone, 
  MessageCircle, 
  Clock, 
  Heart, 
  Share2, 
  ShieldCheck, 
  Trash2, 
  Settings2, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  Pin,
  Calendar,
  Lock,
  Plus,
  Check,
  Ban
} from 'lucide-react';

interface TrendFeedScreenProps {
  currentUser: AppUser | null;
  isAdmin: boolean;
  onOpenLogin?: () => void;
  onAddToast?: (toast: { type: 'success' | 'error' | 'info' | 'warning'; title: string; message: string }) => void;
}

/**
 * دالة مساعدة لضغط الصور تلقائياً عبر HTML5 Canvas قبل التخزين أو الإرسال
 */
const compressImageFile = (file: File, maxWidth = 1200, quality = 0.75): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const TrendFeedScreen: React.FC<TrendFeedScreenProps> = ({
  currentUser,
  isAdmin,
  onOpenLogin,
  onAddToast,
}) => {
  // 1. Settings State (Admin-controlled post retention)
  const [trendSettings, setTrendSettings] = useState<TrendSettings>(() => {
    return safeStorageGetItem<TrendSettings>('asuit_trend_settings', DEFAULT_TREND_SETTINGS);
  });

  // 2. Posts State (stored in localStorage with pending & approval workflow)
  const [posts, setPosts] = useState<TrendPost[]>(() => {
    const saved = safeStorageGetItem<TrendPost[] | null>('asuit_trend_posts', null);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
    return INITIAL_TREND_POSTS.map(p => ({
      ...p,
      isApproved: true,
      status: (p.status || 'approved') as any,
    }));
  });

  // Filter posts based on expiration and approval permissions:
  // - Approved posts: visible to everyone
  // - Pending/Unapproved posts: visible to Admin OR the post author only
  const activePosts = useMemo(() => {
    const now = Date.now();
    return posts
      .filter((post) => {
        if (post.status === 'removed' || post.status === 'rejected') {
          return isAdmin; // Admins can see rejected for audit
        }
        if (!post.expiresAt) return true;
        const expiryTime = new Date(post.expiresAt).getTime();
        if (expiryTime <= now) return false;

        // Approval visibility logic
        const isApproved = post.isApproved !== false && post.status !== 'pending';
        const isAuthor = currentUser?.phone && currentUser.phone === post.authorPhone;

        if (isAdmin || isAuthor) {
          return true; // Author and Admin see unapproved/pending posts
        }

        return isApproved;
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [posts, isAdmin, currentUser]);

  // Sync to safe storage
  useEffect(() => {
    safeStorageSetItem('asuit_trend_posts', posts);
  }, [posts]);

  // Sync settings
  useEffect(() => {
    safeStorageSetItem('asuit_trend_settings', trendSettings);
  }, [trendSettings]);

  // 3. Publisher Form State
  // Strictly enforce default author contact from currentUser (القاعدة العامة لبيانات التواصل)
  const defaultAuthorName = currentUser?.name || 'مواطن من أسيوط';
  const defaultAuthorPhone = currentUser?.phone || '01000000000';

  const [content, setContent] = useState('');
  const [screenshotImage, setScreenshotImage] = useState<string | null>(null);
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const screenshotInputRef = useRef<HTMLInputElement | null>(null);
  const extraImagesInputRef = useRef<HTMLInputElement | null>(null);

  // Likes tracking in localStorage
  const [likedPosts, setLikedPosts] = useState<string[]>(() => {
    return safeStorageGetItem<string[]>('asuit_trend_user_likes', []);
  });

  // Lightbox modal for previewing full images
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Admin Settings Modal
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);
  const [selectedExpiryDays, setSelectedExpiryDays] = useState(trendSettings.expiryDays);

  // Back Navigation layers for Trend sub-modals (Priority 88)
  useBackLayer({
    id: 'trend_preview_image',
    isOpen: Boolean(previewImage),
    priority: 88,
    onClose: () => setPreviewImage(null),
  });

  useBackLayer({
    id: 'trend_admin_settings',
    isOpen: isAdminSettingsOpen,
    priority: 88,
    onClose: () => setIsAdminSettingsOpen(false),
  });

  // Character limit
  const charLimit = trendSettings.maxCharacters || 220;
  const remainingChars = charLimit - content.length;

  // Handle main screenshot select with automatic compression
  const handleScreenshotSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('يرجى اختيار ملف صورة صالح للاسكرينة (JPG, PNG, WebP)');
      return;
    }

    setIsCompressing(true);
    try {
      const compressed = await compressImageFile(file, 1200, 0.75);
      setScreenshotImage(compressed);
      setErrorMsg(null);
    } catch {
      setErrorMsg('حدث خطأ أثناء معالجة وضغط الصورة، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsCompressing(false);
    }
  };

  // Handle additional property images (Max 2 images) with automatic compression
  const handleExtraImagesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const availableSlots = 2 - additionalImages.length;
    if (availableSlots <= 0) {
      setErrorMsg('الحد الأقصى للصور الإضافية هو صورتان فقط للعقار.');
      return;
    }

    const filesToProcess = files.slice(0, availableSlots);
    setIsCompressing(true);
    try {
      const compressedResults: string[] = [];
      for (const f of filesToProcess) {
        if (f.type.startsWith('image/')) {
          const c = await compressImageFile(f, 1000, 0.72);
          compressedResults.push(c);
        }
      }
      setAdditionalImages(prev => [...prev, ...compressedResults].slice(0, 2));
      setErrorMsg(null);
    } catch {
      setErrorMsg('تعذر ضغط بعض الصور الإضافية.');
    } finally {
      setIsCompressing(false);
    }
  };

  const removeExtraImage = (index: number) => {
    setAdditionalImages(prev => prev.filter((_, i) => i !== index));
  };

  // Submit new Trend post (Pending approval system)
  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!content.trim()) {
      setErrorMsg('يرجى كتابة نص المنشور للمتابعة.');
      return;
    }

    if (!currentUser) {
      if (onOpenLogin) {
        onOpenLogin();
      } else {
        setErrorMsg('يجب تسجيل الدخول برقم هاتفك للنشر في الترند.');
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date();
      const expiresAt = calculateExpiryDate(trendSettings.expiryDays, now);
      const isAutoApproved = isAdmin;

      const newPost: TrendPost = {
        id: `trend-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        authorName: defaultAuthorName,
        authorPhone: defaultAuthorPhone,
        authorRole: isAdmin 
          ? 'إدارة المنظومة الرسمية' 
          : (currentUser.role === 'owner' ? 'مالك عقار' : (currentUser.role === 'broker' ? 'وسيط معتمد' : 'مواطن / مستخدم موثق')),
        content: content.trim(),
        image: screenshotImage || undefined,
        screenshotUrl: screenshotImage || undefined,
        additionalImages: additionalImages.length > 0 ? additionalImages : undefined,
        createdAt: now.toISOString(),
        expiresAt,
        likesCount: 0,
        status: isAutoApproved ? 'approved' : 'pending',
        isApproved: isAutoApproved,
      };

      setPosts((prev) => [newPost, ...prev]);

      // Central audit logging
      logAuditEvent({
        userName: defaultAuthorName,
        userPhone: defaultAuthorPhone,
        userRole: currentUser.role || 'user',
        action: 'CREATE',
        entityType: 'trend_post',
        entityId: newPost.id,
        newValues: newPost,
      });

      setContent('');
      setScreenshotImage(null);
      setAdditionalImages([]);
      if (screenshotInputRef.current) screenshotInputRef.current.value = '';
      if (extraImagesInputRef.current) extraImagesInputRef.current.value = '';

      if (onAddToast) {
        if (isAutoApproved) {
          onAddToast({
            type: 'success',
            title: 'تم نشر المنشور في الترند بنجاح ⚡',
            message: `سيبقى متاحاً لمدة ${trendSettings.expiryDays} يوماً.`,
          });
        } else {
          onAddToast({
            type: 'info',
            title: 'تم إرسال المنشور للمراجعة الإدارية 📝',
            message: 'سيظهر منشورك للعامة فور مراجعته واعتماده الفوري من إدارة سكن أسيوط.',
          });
        }
      }
    } catch (err) {
      setErrorMsg('حدث خطأ أثناء النشر، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin approval of pending trend post
  const handleApprovePost = (postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, isApproved: true, status: 'approved' };
      }
      return p;
    }));

    logAuditEvent({
      userName: currentUser?.name || 'مدير المنظومة',
      userPhone: currentUser?.phone || '01002345678',
      userRole: 'admin',
      action: 'STATUS_CHANGE',
      entityType: 'trend_post',
      entityId: postId,
      newValues: { status: 'approved', isApproved: true },
    });

    if (onAddToast) {
      onAddToast({
        type: 'success',
        title: 'تم اعتماد المنشور',
        message: 'أصبح المنشور معتمداً ومتاحاً في تايملاين الترند للجميع.',
      });
    }
  };

  // Admin rejection of trend post
  const handleRejectPost = (postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, isApproved: false, status: 'rejected' };
      }
      return p;
    }));

    logAuditEvent({
      userName: currentUser?.name || 'مدير المنظومة',
      userPhone: currentUser?.phone || '01002345678',
      userRole: 'admin',
      action: 'STATUS_CHANGE',
      entityType: 'trend_post',
      entityId: postId,
      newValues: { status: 'rejected', isApproved: false },
    });

    if (onAddToast) {
      onAddToast({
        type: 'warning',
        title: 'تم رفض المنشور',
        message: 'تم نقل المنشور إلى قائمة المرفوضات.',
      });
    }
  };

  // Toggle Like
  const handleToggleLike = (postId: string) => {
    const isLiked = likedPosts.includes(postId);
    const nextLiked = isLiked
      ? likedPosts.filter((id) => id !== postId)
      : [...likedPosts, postId];
    setLikedPosts(nextLiked);
    safeStorageSetItem('asuit_trend_user_likes', nextLiked);

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const currentCount = p.likesCount || 0;
          return {
            ...p,
            likesCount: isLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
          };
        }
        return p;
      })
    );
  };

  // Delete Post (Admin or Post Author)
  const handleDeletePost = (postId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المنشور نهائياً من الترند؟')) {
      const targetPost = posts.find(p => p.id === postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));

      logAuditEvent({
        userName: currentUser?.name || 'مستخدم',
        userPhone: currentUser?.phone || '01000000000',
        userRole: currentUser?.role || 'user',
        action: 'DELETE',
        entityType: 'trend_post',
        entityId: postId,
        oldValues: targetPost,
      });

      if (onAddToast) {
        onAddToast({
          type: 'info',
          title: 'تم حذف المنشور',
          message: 'تم إزالة البوست من قائمة اليوميات والترند.',
        });
      }
    }
  };

  // Share post text/link
  const handleSharePost = async (post: TrendPost) => {
    const shareText = `من ترند سكن أسيوط:\n"${post.content}"\nللتواصل مع ${post.authorName}: ${post.authorPhone}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      if (onAddToast) {
        onAddToast({
          type: 'success',
          title: 'تم نسخ محتوى المنشور',
          message: 'يمكنك الآن مشاركته في أي تطبيق أو محادثة.',
        });
      }
    }
  };

  // Save Admin Settings
  const handleSaveAdminSettings = () => {
    const updated: TrendSettings = {
      ...trendSettings,
      expiryDays: selectedExpiryDays,
    };
    setTrendSettings(updated);
    setIsAdminSettingsOpen(false);

    setPosts((prev) =>
      prev.map((p) => ({
        ...p,
        expiresAt: calculateExpiryDate(selectedExpiryDays, new Date(p.createdAt)),
      }))
    );

    if (onAddToast) {
      onAddToast({
        type: 'success',
        title: 'تم تحديث مدة بقاء اليوميات ⚙️',
        message: `تم ضبط مدة بقاء البوستات على ${selectedExpiryDays} يوماً بنجاح.`,
      });
    }
  };

  // Calculate remaining days for display
  const getRemainingDays = (expiresAt: string) => {
    try {
      const diffMs = new Date(expiresAt).getTime() - Date.now();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    } catch {
      return 30;
    }
  };

  // Relative time helper in Arabic
  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = Date.now();
      const past = new Date(dateStr).getTime();
      const diffSec = Math.floor((now - past) / 1000);

      if (diffSec < 60) return 'الآن';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `منذ ${diffHour} ساعة`;
      const diffDays = Math.floor(diffHour / 24);
      if (diffDays === 1) return 'منذ يوم';
      if (diffDays === 2) return 'منذ يومين';
      return `منذ ${diffDays} أيام`;
    } catch {
      return 'حديثاً';
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4 pb-28 font-['Cairo']">
      
      {/* 1. Header Banner with Spark Icon ⚡ */}
      <div className="bg-gradient-to-r from-[#124C46] via-[#103D38] to-[#0A2925] text-white rounded-3xl p-4 sm:p-5 shadow-sm border border-emerald-900/40 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#D6A84F] text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
              <Zap className="w-6 h-6 fill-current text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  ترند ويوميات سكن أسيوط
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-[#D6A84F] border border-[#D6A84F]/30 flex items-center gap-1">
                  <span>لحظي</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 mt-1 leading-relaxed">
                يوميات سريعة، لقطات شاشة، وفرص عقارية مباشرة من أهالي أسيوط.
              </p>
            </div>
          </div>

          {/* Admin Control Button */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setSelectedExpiryDays(trendSettings.expiryDays);
                setIsAdminSettingsOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#D6A84F] border border-[#D6A84F]/40 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
              title="تحكم الإدارة بمدة بقاء البوستات"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">مدة البقاء: {trendSettings.expiryDays} يوماً</span>
              <span className="sm:hidden">{trendSettings.expiryDays} يوم</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Instructional Guidance & Policy Banner (شروط ورسالة الترند الإرشادية) */}
      <div className="bg-gradient-to-l from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 text-xs text-amber-950 flex items-start gap-3 shadow-2xs">
        <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
          <Zap className="w-4 h-4 fill-current" />
        </div>
        <div className="space-y-1">
          <p className="font-bold leading-relaxed text-slate-900">
            قسم الترند مخصص حصرياً للاسكرينات والمنشورات المنقولة من الفيسبوك ووسائل التواصل.
          </p>
          <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
            <span className="font-bold text-amber-950">ملاحظة هامة:</span> لا يظهر أي بوست في التايملاين إلا بعد المراجعة والموافقة الفورية من الإدارة.
          </p>
        </div>
      </div>

      {/* 3. Top Quick Publisher Box (مربع نشر سريع مع الاسكرينة وصورتين إضافيتين) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#D6DEE5] shadow-xs space-y-3">
        {/* Author Identity Banner (Strictly auto-filled from currentUser) */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#124C46] text-[#D6A84F] font-bold flex items-center justify-center text-xs shadow-xs">
              {defaultAuthorName.slice(0, 1)}
            </div>
            <div>
              <span className="font-bold text-slate-800 block text-xs">{defaultAuthorName}</span>
              <span className="text-[11px] text-slate-500 font-mono">{defaultAuthorPhone}</span>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#124C46] border border-emerald-200 text-[10px] font-bold">
            <ShieldCheck className="w-3 h-3 text-[#124C46]" />
            <span>تعبئة تلقائية موثقة</span>
          </span>
        </div>

        {/* Text Input Box */}
        <form onSubmit={handlePublish} className="space-y-3">
          <div className="relative">
            <textarea
              rows={2}
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, charLimit))}
              placeholder="اكتب نصاً قصيراً (سطرين) أو فرصة سريعة منقولة..."
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 text-slate-900 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-1 focus:ring-[#124C46] focus:bg-white resize-none transition-all placeholder:text-slate-400"
            />
            <span className={`absolute bottom-2 left-3 text-[10px] font-bold ${
              remainingChars <= 20 ? 'text-rose-500' : 'text-slate-400'
            }`}>
              {remainingChars} حرف
            </span>
          </div>

          {/* Attached Images Grid (Main Screenshot + Up to 2 Extra Images) */}
          {(screenshotImage || additionalImages.length > 0) && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block">المرفقات المختارة:</span>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Main Screenshot */}
                {screenshotImage && (
                  <div className="relative border-2 border-emerald-500/80 rounded-2xl overflow-hidden bg-slate-100 h-24 w-28 group shadow-xs">
                    <img
                      src={screenshotImage}
                      alt="الاسكرينة الأساسية"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-[#124C46] text-white text-[9px] font-bold rounded-md">
                      الاسكرينة
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshotImage(null);
                        if (screenshotInputRef.current) screenshotInputRef.current.value = '';
                      }}
                      className="absolute top-1 left-1 w-5 h-5 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white flex items-center justify-center transition-colors shadow-md cursor-pointer"
                      title="إلغاء الاسكرينة"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Additional Images (Max 2) */}
                {additionalImages.map((img, idx) => (
                  <div key={idx} className="relative border border-slate-200 rounded-2xl overflow-hidden bg-slate-100 h-24 w-24 group shadow-xs">
                    <img
                      src={img}
                      alt={`صورة إضافية ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-slate-800 text-white text-[9px] font-bold rounded-md">
                      صورة {idx + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExtraImage(idx)}
                      className="absolute top-1 left-1 w-5 h-5 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white flex items-center justify-center transition-colors shadow-md cursor-pointer"
                      title="إلغاء الصورة"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Publisher Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              {/* 1. Main Screenshot Upload */}
              <input
                ref={screenshotInputRef}
                type="file"
                accept="image/*"
                onChange={handleScreenshotSelect}
                className="hidden"
                id="trend-screenshot-upload"
              />
              <label
                htmlFor="trend-screenshot-upload"
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#124C46] border border-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="إرفاق اسكرينة الفيسبوك الأساسية"
              >
                <ImageIcon className="w-3.5 h-3.5 text-[#124C46]" />
                <span>إرفاق الاسكرينة</span>
              </label>

              {/* 2. Extra Images Upload (Max 2) */}
              <input
                ref={extraImagesInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleExtraImagesSelect}
                disabled={additionalImages.length >= 2}
                className="hidden"
                id="trend-extra-images-upload"
              />
              <label
                htmlFor="trend-extra-images-upload"
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                  additionalImages.length >= 2 
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 cursor-pointer shadow-2xs'
                }`}
                title="إرفاق صورتين كحد أقصى للعقار"
              >
                <Plus className="w-3.5 h-3.5 text-slate-600" />
                <span>صور العقار ({additionalImages.length}/2)</span>
              </label>

              {isCompressing && (
                <span className="text-[10px] text-amber-600 font-bold animate-pulse">
                  جاري ضغط الصور تلقائياً...
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !content.trim() || isCompressing}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer ${
                content.trim() && !isSubmitting && !isCompressing
                  ? 'bg-[#124C46] hover:bg-[#0D3D38] text-white active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>نشر في الترند</span>
            </button>
          </div>
        </form>
      </div>

      {/* 4. Feed List (عرض المنشورات بالتسلسل الزمني الأحدث أولاً) */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1 text-xs text-slate-600 font-bold">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#D6A84F]" />
            <span>المنشورات واليوميات الحالية ({activePosts.length})</span>
          </div>
          <span className="text-[11px] text-slate-500 font-normal">الأحدث أولاً</span>
        </div>

        {activePosts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-[#D6DEE5] p-6 space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">لا توجد منشورات حالياً في الترند</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              كن أول من يشارك فرصة عقارية أو اسكرينة من خلال مربع النشر أعلاه!
            </p>
          </div>
        ) : (
          activePosts.map((post) => {
            const isLiked = likedPosts.includes(post.id);
            const remainingDays = getRemainingDays(post.expiresAt);
            const isAuthor = currentUser?.phone === post.authorPhone;
            const isPending = post.isApproved === false || post.status === 'pending';
            const isRejected = post.status === 'rejected';

            return (
              <article
                key={post.id}
                className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${
                  post.isPinned ? 'border-[#D6A84F]/80 ring-1 ring-[#D6A84F]/30' : 'border-[#D6DEE5]'
                } ${isPending ? 'bg-amber-50/20' : ''}`}
              >
                {/* Pinned Tag */}
                {post.isPinned && (
                  <div className="bg-[#FFF3D6] text-[#8B641C] px-4 py-1 text-[11px] font-bold border-b border-[#D6A84F]/30 flex items-center gap-1.5">
                    <Pin className="w-3 h-3 text-[#D6A84F] fill-current rotate-45" />
                    <span>منشور مثبت من الإدارة</span>
                  </div>
                )}

                {/* Pending Approval Notice for Author or Admin */}
                {isPending && (
                  <div className="bg-amber-100/80 text-amber-900 px-4 py-1.5 text-xs font-bold border-b border-amber-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>قيد المراجعة الإدارية (لا يظهر للعامة حتى الموافقة)</span>
                    </div>

                    {/* Admin Action Buttons for Pending Post */}
                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleApprovePost(post.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>اعتماد</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectPost(post.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                        >
                          <Ban className="w-3 h-3" />
                          <span>رفض</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {isRejected && (
                  <div className="bg-rose-100 text-rose-900 px-4 py-1.5 text-xs font-bold border-b border-rose-200 flex items-center gap-1.5">
                    <Ban className="w-3.5 h-3.5 text-rose-700" />
                    <span>تم رفض هذا المنشور من الإدارة</span>
                  </div>
                )}

                <div className="p-4 sm:p-5 space-y-3">
                  {/* Author Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#124C46] to-[#0D3D38] text-[#D6A84F] font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                        {post.authorName.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-sm truncate">{post.authorName}</h4>
                          {post.authorRole && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                              {post.authorRole}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span>{formatTimeAgo(post.createdAt)}</span>
                          <span>•</span>
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.2 rounded-md font-bold text-[10px] border border-amber-200/60">
                            متبقي {remainingDays} يوم للحذف
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Post Options (Delete for Admin or Author) */}
                    {(isAdmin || isAuthor) && (
                      <button
                        type="button"
                        onClick={() => handleDeletePost(post.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                        title="حذف المنشور"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Post Content */}
                  <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-line font-medium">
                    {post.content}
                  </p>

                  {/* Attached Images Gallery: Main Screenshot + Extra Images */}
                  {(post.image || post.screenshotUrl || (post.additionalImages && post.additionalImages.length > 0)) && (
                    <div className="space-y-2">
                      {/* Main Image */}
                      {(post.image || post.screenshotUrl) && (
                        <div 
                          onClick={() => setPreviewImage(post.screenshotUrl || post.image || null)}
                          className="relative rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer group max-h-80"
                        >
                          <img
                            src={post.screenshotUrl || post.image}
                            alt="الاسكرينة الأساسية"
                            className="w-full h-auto max-h-80 object-cover group-hover:scale-101 transition-transform"
                            loading="lazy"
                          />
                          <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-xl bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="w-3 h-3 text-[#D6A84F]" />
                            <span>انقر لتكبير الصورة</span>
                          </div>
                        </div>
                      )}

                      {/* Extra Images Thumbnails */}
                      {post.additionalImages && post.additionalImages.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {post.additionalImages.map((extraImg, idx) => (
                            <div
                              key={idx}
                              onClick={() => setPreviewImage(extraImg)}
                              className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer h-28 group"
                            >
                              <img
                                src={extraImg}
                                alt={`صورة عقار ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* UI Layout Fix: Unified Single Horizontal Action Row (اتصال، واتساب، إعجاب، مشاركة) في صف واحد */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5 w-full">
                    {/* Direct Phone Call Button */}
                    <a
                      href={`tel:${post.authorPhone}`}
                      className="flex-1 py-2 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#124C46] border border-emerald-300 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition-all active:scale-95 min-w-0"
                      title={`اتصال مباشر بـ ${post.authorName}`}
                    >
                      <Phone className="w-3.5 h-3.5 text-[#124C46] shrink-0" />
                      <span className="truncate">اتصال ({post.authorPhone})</span>
                    </a>

                    {/* Standardized WhatsApp Chat Button (#25D366) */}
                    <a
                      href={`https://wa.me/20${post.authorPhone.startsWith('0') ? post.authorPhone.substring(1) : post.authorPhone}?text=${encodeURIComponent(
                        `السلام عليكم أ/ ${post.authorName}، بخصوص منشورك في ترند سكن أسيوط: "${post.content.slice(0, 70)}..."`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition-all active:scale-95 shrink-0"
                      title="محادثة واتساب مباشرة"
                    >
                      <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>واتساب</span>
                    </a>

                    {/* Like Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleLike(post.id)}
                      className={`p-2 rounded-xl transition-all flex items-center justify-center gap-1 text-xs font-bold cursor-pointer shrink-0 border border-slate-200/70 ${
                        isLiked
                          ? 'text-rose-600 bg-rose-50 border-rose-200'
                          : 'hover:bg-slate-100 text-slate-600 bg-slate-50'
                      }`}
                      title="إعجاب بالمنشور"
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-current text-rose-600' : ''}`} />
                      <span>{post.likesCount || 0}</span>
                    </button>

                    {/* Share Button */}
                    <button
                      type="button"
                      onClick={() => handleSharePost(post)}
                      className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 bg-slate-50 border border-slate-200/70 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                      title="مشاركة المنشور"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Lightbox Image Preview Modal */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 cursor-zoom-out animate-in fade-in duration-150"
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="صورة مكبرة"
              className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain mx-auto shadow-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 left-3 w-8 h-8 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-rose-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Admin Settings Modal */}
      {isAdminSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-[#124C46]" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">إعدادات مدة بقاء اليوميات</h3>
              </div>
              <button
                onClick={() => setIsAdminSettingsOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              اختر مدة بقاء البوستات في قسم الترند قبل أن يتم حذفها تلقائياً من المنظومة:
            </p>

            <div className="grid grid-cols-3 gap-2.5">
              {[7, 14, 30, 60, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setSelectedExpiryDays(days)}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    selectedExpiryDays === days
                      ? 'bg-[#124C46] text-white border-[#124C46] shadow-sm font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 text-xs font-semibold'
                  }`}
                >
                  <span className="block text-sm font-bold">{days}</span>
                  <span className="text-[10px] opacity-80">يوماً</span>
                </button>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAdminSettingsOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveAdminSettings}
                className="px-5 py-2 rounded-xl bg-[#124C46] hover:bg-[#0D3D38] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                حفظ الإعدادات
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
