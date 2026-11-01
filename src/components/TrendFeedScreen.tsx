import React, { useState, useRef, useMemo, useEffect } from 'react';
import { TrendPost, TrendSettings, AppUser } from '../types/property';
import { DEFAULT_TREND_SETTINGS, INITIAL_TREND_POSTS, calculateExpiryDate } from '../data/initialTrendPosts';
import { safeStorageGetItem, safeStorageSetItem } from '../utils/storageManager';
import { 
  Flame, 
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
  Lock
} from 'lucide-react';

interface TrendFeedScreenProps {
  currentUser: AppUser | null;
  isAdmin: boolean;
  onOpenLogin?: () => void;
  onAddToast?: (toast: { type: 'success' | 'error' | 'info'; title: string; message: string }) => void;
}

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

  // 2. Posts State (stored in localStorage)
  const [posts, setPosts] = useState<TrendPost[]>(() => {
    const saved = safeStorageGetItem<TrendPost[] | null>('asuit_trend_posts', null);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
    return INITIAL_TREND_POSTS;
  });

  // Auto-cleanup: Filter out expired posts
  const activePosts = useMemo(() => {
    const now = Date.now();
    return posts
      .filter((post) => {
        if (post.status === 'removed') return false;
        if (!post.expiresAt) return true;
        const expiryTime = new Date(post.expiresAt).getTime();
        return expiryTime > now;
      })
      .sort((a, b) => {
        // Pinned posts first, then latest
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [posts]);

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
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Likes tracking in localStorage
  const [likedPosts, setLikedPosts] = useState<string[]>(() => {
    return safeStorageGetItem<string[]>('asuit_trend_user_likes', []);
  });

  // Lightbox modal for previewing full images
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Admin Settings Modal
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);
  const [selectedExpiryDays, setSelectedExpiryDays] = useState(trendSettings.expiryDays);

  // Handle character limit
  const charLimit = trendSettings.maxCharacters || 180;
  const remainingChars = charLimit - content.length;

  // Handle image upload from file or screenshot
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 5 ميجابايت');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage(reader.result as string);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  // Submit new Trend post
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

      const newPost: TrendPost = {
        id: `trend-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        authorName: defaultAuthorName,
        authorPhone: defaultAuthorPhone,
        authorRole: isAdmin 
          ? 'إدارة المنظومة الرسمية' 
          : (currentUser.role === 'owner' ? 'مالك عقار' : (currentUser.role === 'broker' ? 'وسيط معتمد' : 'مواطن / مستخدم موثق')),
        content: content.trim(),
        image: attachedImage || undefined,
        createdAt: now.toISOString(),
        expiresAt,
        likesCount: 0,
        status: 'active',
      };

      setPosts((prev) => [newPost, ...prev]);
      setContent('');
      setAttachedImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (onAddToast) {
        onAddToast({
          type: 'success',
          title: 'تم نشر التحديث في الترند بنجاح 🔥',
          message: `سيبقى المنشور متاحاً لمدة ${trendSettings.expiryDays} يوماً للتواصل المباشر.`,
        });
      }
    } catch (err) {
      setErrorMsg('حدث خطأ أثناء النشر، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
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
      setPosts((prev) => prev.filter((p) => p.id !== postId));
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

    // Also update existing active posts expiry if requested
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
  const formatTimeAgo = (createdAt: string) => {
    try {
      const diffMs = Date.now() - new Date(createdAt).getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) return 'الآن';
      if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      if (diffDays === 1) return 'أمس';
      if (diffDays === 2) return 'منذ يومين';
      if (diffDays <= 7) return `منذ ${diffDays} أيام`;
      return new Date(createdAt).toLocaleDateString('ar-EG', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4 pb-28 font-['Cairo']">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-[#124C46] via-[#103D38] to-[#0A2925] text-white rounded-3xl p-4 sm:p-5 shadow-sm border border-emerald-900/40 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#D6A84F] text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
              <Flame className="w-6 h-6 fill-current text-white animate-bounce-subtle" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  ترند ويوميات سكن أسيوط
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-[#D6A84F] border border-[#D6A84F]/30">
                  بث مباشر 🔴
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

      {/* 2. Top Quick Publisher Box (مربع نشر سريع) */}
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
            <span>بيانات موثقة تلقائياً</span>
          </span>
        </div>

        {/* Text Input Box */}
        <form onSubmit={handlePublish} className="space-y-3">
          <div className="relative">
            <textarea
              rows={2}
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, charLimit))}
              placeholder="اكتب تحديثاً قصيراً (سطرين) أو فرصة سريعة في أسيوط اليوم..."
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 text-slate-900 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-1 focus:ring-[#124C46] focus:bg-white resize-none transition-all placeholder:text-slate-400"
            />
            <span className={`absolute bottom-2 left-3 text-[10px] font-bold ${
              remainingChars <= 20 ? 'text-rose-500' : 'text-slate-400'
            }`}>
              {remainingChars} حرف
            </span>
          </div>

          {/* Attached Image Preview */}
          {attachedImage && (
            <div className="relative inline-block border border-slate-200 rounded-2xl overflow-hidden bg-slate-100 max-h-48 group">
              <img
                src={attachedImage}
                alt="المعاينة المرفقة"
                className="max-h-40 w-auto object-cover rounded-xl"
              />
              <button
                type="button"
                onClick={() => {
                  setAttachedImage(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white flex items-center justify-center transition-colors shadow-md cursor-pointer"
                title="إلغاء إرفاق الصورة"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Publisher Action Bar */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                id="trend-image-upload"
              />
              <label
                htmlFor="trend-image-upload"
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 shadow-2xs"
                title="إرفاق صورة أو اسكرينة"
              >
                <ImageIcon className="w-3.5 h-3.5 text-[#124C46]" />
                <span className="hidden sm:inline">إرفاق صورة / اسكرين</span>
                <span className="sm:hidden">صورة</span>
              </label>

              <span className="text-[10px] text-slate-500 font-medium">
                ⏳ الحذف التلقائي بعد {trendSettings.expiryDays} يوماً
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                content.trim() && !isSubmitting
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

      {/* 3. Feed List (عرض المنشورات بالتسلسل الزمني الأحدث أولاً) */}
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
              <Flame className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">لا توجد منشورات حالياً في الترند</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              كن أول من يشارك فرصة عقارية أو تحديثاً في أسيوط اليوم من خلال مربع النشر أعلاه!
            </p>
          </div>
        ) : (
          activePosts.map((post) => {
            const isLiked = likedPosts.includes(post.id);
            const remainingDays = getRemainingDays(post.expiresAt);
            const isAuthor = currentUser?.phone === post.authorPhone;

            return (
              <article
                key={post.id}
                className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${
                  post.isPinned ? 'border-[#D6A84F]/80 ring-1 ring-[#D6A84F]/30' : 'border-[#D6DEE5]'
                }`}
              >
                {/* Pinned Tag */}
                {post.isPinned && (
                  <div className="bg-[#FFF3D6] text-[#8B641C] px-4 py-1 text-[11px] font-bold border-b border-[#D6A84F]/30 flex items-center gap-1.5">
                    <Pin className="w-3 h-3 text-[#D6A84F] fill-current rotate-45" />
                    <span>منشور مثبت من الإدارة</span>
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

                  {/* Attached Image / Screenshot */}
                  {post.image && (
                    <div 
                      onClick={() => setPreviewImage(post.image || null)}
                      className="relative rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer group max-h-80"
                    >
                      <img
                        src={post.image}
                        alt="مرفق الترند"
                        className="w-full h-auto max-h-80 object-cover group-hover:scale-101 transition-transform"
                        loading="lazy"
                      />
                      <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-xl bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="w-3 h-3 text-[#D6A84F]" />
                        <span>انقر لتكبير الصورة</span>
                      </div>
                    </div>
                  )}

                  {/* Direct Contact & Interaction Bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                    
                    {/* Primary Direct Actions: زر اتصال + زر واتساب مباشر */}
                    <div className="flex items-center gap-2">
                      {/* Direct Phone Call Button */}
                      <a
                        href={`tel:${post.authorPhone}`}
                        className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#124C46] border border-emerald-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
                        title={`اتصال مباشر بـ ${post.authorName}`}
                      >
                        <Phone className="w-3.5 h-3.5 text-[#124C46]" />
                        <span>اتصال ({post.authorPhone})</span>
                      </a>

                      {/* Direct WhatsApp Chat Button */}
                      <a
                        href={`https://wa.me/20${post.authorPhone.startsWith('0') ? post.authorPhone.substring(1) : post.authorPhone}?text=${encodeURIComponent(
                          `السلام عليكم أ/ ${post.authorName}، بخصوص منشورك في ترند سكن أسيوط: "${post.content.slice(0, 70)}..."`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
                        title="محادثة واتساب مباشرة"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>واتساب</span>
                      </a>
                    </div>

                    {/* Social Interactions: Like & Share */}
                    <div className="flex items-center gap-1 text-slate-500">
                      <button
                        type="button"
                        onClick={() => handleToggleLike(post.id)}
                        className={`p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-bold cursor-pointer ${
                          isLiked
                            ? 'text-rose-600 bg-rose-50'
                            : 'hover:bg-slate-100 text-slate-600'
                        }`}
                        title="إعجاب بالمنشور"
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-current text-rose-600' : ''}`} />
                        <span>{post.likesCount || 0}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSharePost(post)}
                        className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                        title="مشاركة المنشور"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* 4. Admin Settings Modal (التحكم بمدة بقاء البوست) */}
      {isAdminSettingsOpen && (
        <div 
          onClick={() => setIsAdminSettingsOpen(false)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in select-none"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Settings2 className="w-4 h-4 text-[#124C46]" />
                <span>إعدادات مدة بقاء اليوميات (الترند)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminSettingsOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              حدد المدة الزمنية لبقاء منشورات الترند قبل أن يقوم النظام بحذفها وأرشفتها تلقائياً للحفاظ على حيوية وتحديث المنصة.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                اختر مدة الصلاحية:
              </label>

              {[
                { days: 7, label: 'أسبوع واحد (7 أيام)' },
                { days: 15, label: 'أسبوعان (15 يوماً)' },
                { days: 30, label: 'شهر كامل (30 يوماً - الموصى به)' },
                { days: 60, label: 'شهران (60 يوماً)' },
                { days: 90, label: 'ثلاثة أشهر (90 يوماً)' },
              ].map((opt) => (
                <label
                  key={opt.days}
                  onClick={() => setSelectedExpiryDays(opt.days)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                    selectedExpiryDays === opt.days
                      ? 'border-[#124C46] bg-[#EAF3EF] text-[#124C46] font-bold shadow-2xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium'
                  }`}
                >
                  <span className="text-xs">{opt.label}</span>
                  <input
                    type="radio"
                    name="expiryDays"
                    checked={selectedExpiryDays === opt.days}
                    onChange={() => setSelectedExpiryDays(opt.days)}
                    className="accent-[#124C46]"
                  />
                </label>
              ))}
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveAdminSettings}
                className="flex-1 py-2 rounded-xl bg-[#124C46] hover:bg-[#0D3D38] text-white font-bold text-xs transition-colors shadow-xs"
              >
                حفظ الإعدادات وتطبيقها
              </button>
              <button
                type="button"
                onClick={() => setIsAdminSettingsOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Lightbox Modal for Full Image View */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 left-0 text-white hover:text-amber-400 p-2 flex items-center gap-1 text-xs font-bold"
            >
              <X className="w-5 h-5" />
              <span>إغلاق</span>
            </button>
            <img
              src={previewImage}
              alt="عرض الصورة المرفقة بالكامل"
              className="max-h-[85vh] w-auto object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}

    </div>
  );
};
export default TrendFeedScreen;
