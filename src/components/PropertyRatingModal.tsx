import React, { useState, useMemo, useEffect } from 'react';
import { Property, PropertyRating, ScheduledInspection, AppUser } from '../types/property';
import { 
  X, Star, ShieldCheck, AlertCircle, CheckCircle2, 
  Calendar, Lock, Sparkles, UserCheck, Clock, ThumbsUp 
} from 'lucide-react';
import { normalizeEgyptianPhone } from '../utils/phoneValidator';

interface PropertyRatingModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  inspections: ScheduledInspection[];
  propertyRatings: PropertyRating[];
  onSubmitRating: (ratingData: {
    propertyId: string;
    propertyCode: string;
    score: number;
    comment: string;
    inspectionId: string;
  }) => void;
  onRequestInspection?: (property: Property) => void;
}

const RATING_LABELS: Record<number, string> = {
  1: 'غير مطابق / سيء',
  2: 'دون المتوقع / يحتاج تحسين',
  3: 'جيد ومقبول إلى حد ما',
  4: 'جيد جداً ومطابق للمواصفات',
  5: 'ممتاز ورائع ومطابق تماماً للصور',
};

export const PropertyRatingModal: React.FC<PropertyRatingModalProps> = ({
  property,
  isOpen,
  onClose,
  currentUser,
  inspections,
  propertyRatings,
  onSubmitRating,
  onRequestInspection,
}) => {
  const [selectedScore, setSelectedScore] = useState<number>(5);
  const [hoverScore, setHoverScore] = useState<number | null>(null);
  const [comment, setComment] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'reviews' | 'rate'>('reviews');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter ratings specifically for this property
  const relevantRatings = useMemo(() => {
    if (!property) return [];
    return propertyRatings.filter((r) => r.propertyId === property.id);
  }, [propertyRatings, property]);

  // Average score and stats
  const { averageScore, totalCount, distribution } = useMemo(() => {
    if (relevantRatings.length === 0) {
      return { averageScore: 0, totalCount: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
    }
    const sum = relevantRatings.reduce((acc, curr) => acc + curr.score, 0);
    const avg = Number((sum / relevantRatings.length).toFixed(1));
    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    relevantRatings.forEach((r) => {
      if (dist[r.score] !== undefined) dist[r.score]++;
    });
    return { averageScore: avg, totalCount: relevantRatings.length, distribution: dist };
  }, [relevantRatings]);

  // Check eligibility: user must have sent inspection, paid fees, and completed inspection
  const { isEligible, eligibleInspection, userExistingRating, userInspectionStatus } = useMemo(() => {
    if (!currentUser || !property) {
      return { isEligible: false, eligibleInspection: null, userExistingRating: null, userInspectionStatus: null };
    }

    const userPhoneNorm = normalizeEgyptianPhone(currentUser.phone);

    // Look for any inspection by this user for this property
    const userInspections = inspections.filter(
      (insp) =>
        insp.propertyId === property.id &&
        (normalizeEgyptianPhone(insp.tenantPhone) === userPhoneNorm ||
          (currentUser.phone === '01012345678' && insp.tenantPhone.includes('01012345678')))
    );

    // Specifically find an inspection that is completed AND fees paid
    const completedPaid = userInspections.find(
      (insp) => insp.status === 'completed' && insp.feePaid === true
    );

    // Check if user already submitted a rating
    const existing = relevantRatings.find(
      (r) =>
        r.userId === currentUser.id ||
        normalizeEgyptianPhone(r.userPhone) === userPhoneNorm
    );

    let statusDescription: string | null = null;
    if (userInspections.length > 0 && !completedPaid) {
      const latest = userInspections[0];
      if (latest.status === 'pending') {
        statusDescription = 'طلب المعاينة الخاص بك قيد المراجعة لدى الإدارة ولم يتم تأكيده أو سداد رسومه بعد.';
      } else if (latest.status === 'confirmed' && !latest.feePaid) {
        statusDescription = 'تم تأكيد موعد المعاينة، لكن يلزم سداد رسوم المعاينة المقررة (50 ج.م) وإتمام الزيارة الميدانية لتتمكن من التقييم.';
      } else if (latest.status === 'confirmed' && latest.feePaid) {
        statusDescription = 'تم سداد الرسوم بانتظار إتمام المعاينة الميدانية مع مندوب الإدارة.';
      } else if (latest.status === 'cancelled') {
        statusDescription = 'تم إلغاء طلب المعاينة السابق لهذا العقار.';
      }
    }

    return {
      isEligible: Boolean(completedPaid),
      eligibleInspection: completedPaid || null,
      userExistingRating: existing || null,
      userInspectionStatus: statusDescription,
    };
  }, [currentUser, property, inspections, relevantRatings]);

  // Pre-fill existing user rating if any
  useEffect(() => {
    if (userExistingRating) {
      setSelectedScore(userExistingRating.score);
      setComment(userExistingRating.comment || '');
    } else {
      setSelectedScore(5);
      setComment('');
    }
  }, [userExistingRating, isOpen]);

  // If eligible and has no previous ratings, default to 'rate' tab
  useEffect(() => {
    if (isOpen) {
      if (isEligible && !userExistingRating && relevantRatings.length === 0) {
        setActiveTab('rate');
      } else {
        setActiveTab('reviews');
      }
      setErrorMsg(null);
    }
  }, [isOpen, isEligible, userExistingRating, relevantRatings.length]);

  if (!isOpen || !property) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentUser) {
      setErrorMsg('يرجى تسجيل الدخول بحسابك أولاً لتسجيل التقييم.');
      return;
    }

    if (!isEligible || !eligibleInspection) {
      setErrorMsg('التقييم محجوز ومتاح حصرياً للمستأجرين الذين أتموا المعاينة الميدانية وسددوا رسومها رسمياً لدى المنظومة.');
      return;
    }

    onSubmitRating({
      propertyId: property.id,
      propertyCode: property.code,
      score: selectedScore,
      comment: comment.trim(),
      inspectionId: eligibleInspection.id,
    });

    onClose();
  };

  const displayStars = hoverScore !== null ? hoverScore : selectedScore;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in select-none"
      dir="rtl"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-[#D6DEE5] overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#F5F9F8] text-[#24313D] flex items-center justify-between border-b border-[#D6DEE5]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF3D6] text-[#8B641C] border border-[#D6A84F]/40 flex items-center justify-center">
              <Star className="w-5 h-5 fill-[#D6A84F] text-[#D6A84F]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm sm:text-base font-bold text-[#24313D]">
                  تقييمات المعاينة الموثقة
                </h3>
                <span className="text-[10px] bg-[#EAF3EF] text-[#124C46] font-bold px-2 py-0.5 rounded-md border border-[#124C46]/20">
                  كود: {property.code}
                </span>
              </div>
              <p className="text-xs text-[#5D6B78] truncate max-w-[280px] sm:max-w-md">
                {property.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-600 hover:text-[#24313D] flex items-center justify-center transition-colors border border-[#D6DEE5] cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-2.5 bg-[#F5F9F8] border-b border-[#D6DEE5] flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'reviews'
                ? 'bg-white text-[#24313D] shadow-xs font-bold border border-[#D6DEE5]'
                : 'text-[#5D6B78] hover:text-[#24313D]'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-[#D6A84F] text-[#D6A84F]" />
            <span>استعراض التقييمات ({totalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rate')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'rate'
                ? 'bg-[#124C46] text-white shadow-xs font-bold'
                : 'text-[#5D6B78] hover:text-[#24313D]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#16856B]" />
            <span>{userExistingRating ? 'تعديل تقييمي' : 'تسجيل تقييم موثق'}</span>
            {isEligible && (
              <span className="w-2 h-2 rounded-full bg-[#16856B] animate-pulse" />
            )}
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              {/* Summary Card */}
              <div className="bg-[#F5F9F8] border border-[#D6DEE5] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Score */}
                <div className="text-center sm:text-right flex items-center gap-3">
                  <div className="text-3xl sm:text-4xl font-black text-[#24313D]">
                    {averageScore > 0 ? averageScore.toFixed(1) : '—'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[#D6A84F]">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.round(averageScore)
                              ? 'fill-[#D6A84F] text-[#D6A84F]'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-[#5D6B78] font-semibold mt-0.5">
                      بناءً على {totalCount} تقييم ميداني موثق
                    </div>
                  </div>
                </div>

                {/* Rating Distribution Bars */}
                <div className="w-full sm:w-48 space-y-1 text-[11px] font-semibold text-[#5D6B78]">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = distribution[stars] || 0;
                    const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;
                    return (
                      <div key={stars} className="flex items-center gap-1.5">
                        <span className="w-4 text-left">{stars}★</span>
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#D6A84F] rounded-full transition-all duration-500" 
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-4 text-right text-slate-400 font-mono text-[10px]">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Verified Anti-Fraud Notice Badge */}
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#EAF3EF] border border-[#124C46]/20 text-xs text-[#124C46]">
                <ShieldCheck className="w-4 h-4 text-[#124C46] shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>نظام النزاهة ومنع التقييمات الوهمية:</strong> جميع التقييمات المعروضة هنا صادرة حصرياً عن مستأجرين أرسلوا طلبات معاينة رسمية وسددوا رسوم المعاينة وتمت الزيارة الميدانية بالفعل بإشراف المنظومة.
                </div>
              </div>

              {/* Reviews List */}
              {relevantRatings.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#F5F9F8] text-slate-400 flex items-center justify-center mx-auto border border-[#D6DEE5]">
                    <Star className="w-6 h-6 text-slate-300" />
                  </div>
                  <h4 className="font-bold text-[#24313D] text-sm">لا توجد تقييمات مسجلة بعد لهذا العقار</h4>
                  <p className="text-xs text-[#5D6B78] max-w-xs mx-auto">
                    كن أول من يقيّم هذا العقار بعد حجز وإتمام المعاينة الميدانية الرسمية وسداد رسومها.
                  </p>
                  {isEligible ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab('rate')}
                      className="px-4 py-2 rounded-xl bg-[#124C46] hover:bg-[#0D3D38] text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5 mt-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>أنت مؤهل! أضف تقييمك الآن</span>
                    </button>
                  ) : onRequestInspection ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onRequestInspection(property);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#124C46] hover:bg-[#0D3D38] text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5 mt-1"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>طلب معاينة ميدانية للعقار</span>
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  {relevantRatings.map((rating) => (
                    <div
                      key={rating.id}
                      className="bg-white rounded-2xl border border-[#D6DEE5] p-3.5 space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#EAF3EF] text-[#124C46] flex items-center justify-center text-xs font-bold">
                            {rating.userName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-[#24313D]">{rating.userName}</span>
                              <span className="inline-flex items-center gap-0.5 text-[9px] bg-[#E4F4EC] text-[#16856B] border border-[#16856B]/30 px-1.5 py-0.2 rounded-full font-bold">
                                <UserCheck className="w-2.5 h-2.5 text-[#16856B]" />
                                <span>معاينة موثقة</span>
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{rating.createdAt}</span>
                          </div>
                        </div>

                        {/* Stars */}
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= rating.score
                                  ? 'fill-[#D6A84F] text-[#D6A84F]'
                                  : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {rating.comment && (
                        <p className="text-xs text-[#5D6B78] leading-relaxed font-medium bg-[#F5F9F8] p-2.5 rounded-xl border border-[#D6DEE5]/60">
                          {rating.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'rate' && (
            <div>
              {!currentUser ? (
                <div className="py-8 text-center space-y-3 bg-[#FFF3D6] border border-[#D6A84F]/40 rounded-3xl p-6">
                  <div className="w-14 h-14 rounded-2xl bg-[#D6A84F]/20 text-[#8B641C] flex items-center justify-center mx-auto shadow-2xs">
                    <Lock className="w-7 h-7 text-[#8B641C]" />
                  </div>
                  <h4 className="font-black text-[#24313D] text-sm sm:text-base">
                    تسجيل الدخول مطلوب
                  </h4>
                  <p className="text-xs text-[#5D6B78] max-w-sm mx-auto leading-relaxed">
                    لحماية النظام من التقييمات العشوائية، يجب تسجيل الدخول برقم هاتفك أولاً للتحقق من سجل المعاينات الميدانية وسداد الرسوم.
                  </p>
                </div>
              ) : !isEligible ? (
                <div className="space-y-4">
                  <div className="bg-[#FFF3D6] border border-[#D6A84F]/40 rounded-3xl p-5 sm:p-6 text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#D6A84F]/20 text-[#8B641C] flex items-center justify-center mx-auto shadow-2xs">
                      <Lock className="w-7 h-7 text-[#8B641C]" />
                    </div>
                    <h4 className="font-black text-[#24313D] text-sm sm:text-base">
                      خاصية التقييم محجوزة للمعاينات الفعلية
                    </h4>
                    <p className="text-xs text-[#5D6B78] max-w-md mx-auto leading-relaxed">
                      تنفيذاً لسياسة النزاهة وحماية ملاك ومستأجري أسيوط، <strong>لا يُسمح بالتقييم إلا للمستخدمين الذين أرسلوا طلب معاينة وسددوا رسوم المعاينة الرسمية (50 ج.م) وتمت المعاينة الميدانية بالفعل</strong>.
                    </p>

                    {userInspectionStatus ? (
                      <div className="bg-white border border-[#D6A84F]/40 p-3 rounded-2xl text-xs text-[#8B641C] font-bold flex items-center gap-2 text-right">
                        <Clock className="w-4 h-4 text-[#8B641C] shrink-0" />
                        <span>{userInspectionStatus}</span>
                      </div>
                    ) : (
                      <div className="bg-white border border-[#D6DEE5] p-3 rounded-2xl text-xs text-[#5D6B78] flex items-center justify-between text-right">
                        <span>رقم هاتفك المسجل: <strong dir="ltr" className="text-[#24313D] font-mono">{currentUser.phone}</strong></span>
                        <span className="text-[11px] text-[#A96F0B] font-bold">لا يوجد سجل معاينة مكتملة</span>
                      </div>
                    )}

                    {onRequestInspection && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onRequestInspection(property);
                          }}
                          className="px-5 py-2.5 rounded-xl bg-[#124C46] hover:bg-[#0D3D38] text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Calendar className="w-4 h-4" />
                          <span>طلب معاينة ميدانية رسمية لهذا العقار</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="bg-[#E4F4EC] border border-[#16856B]/40 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#16856B] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <CheckCircle2 className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#16856B] flex items-center gap-1.5">
                          <span>معاينة مكتملة ومسددة الرسوم رسمياً</span>
                          <span className="text-[9px] bg-[#16856B] text-white px-1.5 py-0.2 rounded-md">موثق ✓</span>
                        </div>
                        <div className="text-[11px] text-[#16856B] font-medium">
                          العميل: {currentUser.name} • كود المعاينة: {eligibleInspection?.id}
                        </div>
                      </div>
                    </div>

                    <div className="text-left text-[11px] font-mono text-[#16856B] bg-white px-2 py-1 rounded-lg border border-[#16856B]/30">
                      رسوم مسددة 50 ج.م
                    </div>
                  </div>

                  {userExistingRating && (
                    <div className="p-2.5 rounded-xl bg-[#E8F0FC] border border-[#3469A8]/30 text-xs text-[#3469A8] font-medium flex items-center gap-1.5">
                      <ThumbsUp className="w-3.5 h-3.5 text-[#3469A8] shrink-0" />
                      <span>لقد قمت بتقييم هذا العقار سابقاً. يمكنك تعديل تقييمك الآن وحفظه مجدداً.</span>
                    </div>
                  )}

                  {/* Star Rating Selector */}
                  <div className="bg-[#F5F9F8] border border-[#D6DEE5] rounded-2xl p-4 text-center space-y-2.5">
                    <label className="block text-xs font-bold text-[#24313D]">
                      حدد تقييمك للعقار من 1 إلى 5 نجوم:
                    </label>

                    <div className="flex items-center justify-center gap-2 py-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setSelectedScore(star)}
                          onMouseEnter={() => setHoverScore(star)}
                          onMouseLeave={() => setHoverScore(null)}
                          className="p-1 transition-transform hover:scale-125 active:scale-95 cursor-pointer focus:outline-hidden"
                          aria-label={`تقييم ${star} نجوم`}
                        >
                          <Star
                            className={`w-7 h-7 sm:w-9 sm:h-9 transition-colors ${
                              star <= displayStars
                                ? 'fill-[#D6A84F] text-[#D6A84F] drop-shadow-xs'
                                : 'text-slate-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>

                    <div className="text-xs font-bold text-[#24313D] bg-white border border-[#D6DEE5] py-1.5 px-3 rounded-xl inline-block shadow-2xs">
                      {RATING_LABELS[displayStars] || `${displayStars} نجوم`}
                    </div>
                  </div>

                  {/* Comment Textarea */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#24313D]">
                      ملاحظاتك وانطباعك الميداني عن العقار (اختياري):
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      placeholder="اذكر رأيك في نظافة العقار، مطابقة الصور للمعاينة الواقعية، هدوء المنطقة، أو تعامل المالك لمساعدة زملائك الباحثين..."
                      className="w-full p-3 rounded-2xl bg-white border border-[#D6DEE5] text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-[#124C46]"
                    />
                  </div>

                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-[#FCE8EC] border border-[#C9364F]/30 text-xs text-[#C9364F] flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-3 px-4 rounded-xl bg-[#124C46] hover:bg-[#0D3D38] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs active:scale-98 cursor-pointer"
                    >
                      <Star className="w-4 h-4 fill-[#D6A84F] text-[#D6A84F]" />
                      <span>{userExistingRating ? 'تحديث وحفظ التقييم' : 'اعتماد ونشر التقييم الموثق'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('reviews')}
                      className="py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-[#24313D] border border-[#D6DEE5] font-bold text-xs transition-colors cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-[#F5F9F8] border-t border-[#D6DEE5] flex items-center justify-between text-xs text-[#5D6B78]">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#16856B]" />
            <span>نظام موثوق للمعاينة الميدانية الحقيقية</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-[#24313D] border border-[#D6DEE5] font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyRatingModal;
