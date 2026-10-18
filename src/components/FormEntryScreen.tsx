import React, { useState, useRef, useMemo } from 'react';
import { Property, PropertyPurpose, PropertyUtilities, TenantRequest, AppUser } from '../types/property';
import { DropdownCategory, UtilityOptionDefinition } from '../data/dropdownOptions';
import { parseArabicVoiceTranscript } from '../utils/voiceParser';
import { ImageUploadField } from './ImageUploadField';
import { validateEgyptianPhone, normalizeEgyptianPhone, isValidEgyptianPhone } from '../utils/phoneValidator';
import {
  ArrowRight,
  Building2,
  MapPin,
  Maximize2,
  DollarSign,
  Bed,
  Bath,
  ArrowUpDown,
  Zap,
  Droplets,
  Flame,
  Wifi,
  Compass,
  Sparkles,
  AlertCircle,
  Mic,
  MicOff,
  CheckCircle2,
  Phone,
  User,
  Clock
} from 'lucide-react';
import { RealEstateAgent, Assignment, HourglassTopRounded } from './FlutterIcons';

interface FormEntryScreenProps {
  isOffer: boolean; // true = عرض عقار (متاح), false = طلب عقار (مطلوب)
  onBack: () => void;
  isAdmin?: boolean;
  onAddProperty?: (newProp: Property) => void;
  onAddTenantRequest?: (newReq: TenantRequest) => void;
  editingProperty?: Property | null;
  editingTenantRequest?: TenantRequest | null;
  onUpdateProperty?: (updatedProp: Property) => void;
  onUpdateTenantRequest?: (updatedReq: TenantRequest) => void;
  dropdownCategories: Record<string, DropdownCategory>;
  utilityDefinitions: UtilityOptionDefinition[];
  currentUser?: AppUser | null;
}

export const FormEntryScreen: React.FC<FormEntryScreenProps> = ({
  isOffer: propIsOffer,
  onBack,
  isAdmin = false,
  onAddProperty,
  onAddTenantRequest,
  editingProperty,
  editingTenantRequest,
  onUpdateProperty,
  onUpdateTenantRequest,
  dropdownCategories,
  utilityDefinitions,
  currentUser,
}) => {
  const isEditing = Boolean(editingProperty || editingTenantRequest);
  const isOffer = editingProperty ? true : editingTenantRequest ? false : propIsOffer;
  // Flutter-specified unit types
  const flutterUnitTypes = useMemo(() => [
    'شقة سكنية',
    'استوديو',
    'دوبلكس',
    'محل تجاري',
    'مقر إداري / مكتب',
    'سكن طلابي (ذكور)',
    'غرفة طلابات مشتركة',
    'غرفة عمال مشتركة',
    'روف سكنى',
    'مخزن / بدروم',
    'شاليه',
    'قطعة أرض فضاء',
    'عيادة طبية مجهزة'
  ], []);

  // Extract active options dynamically from parent state, ensuring flutter items are included
  const activePropertyTypes = useMemo(() => {
    const fromCategories = (dropdownCategories.propertyTypes?.items || [])
      .filter((i) => i.isActive)
      .map((i) => i.name);
    const combined = [...flutterUnitTypes];
    for (const item of fromCategories) {
      if (!combined.includes(item)) {
        combined.push(item);
      }
    }
    return combined;
  }, [dropdownCategories, flutterUnitTypes]);
  const activeDistricts = (dropdownCategories.districts?.items || [])
    .filter((i) => i.isActive)
    .map((i) => i.name);
  const activePaymentMethods = (dropdownCategories.paymentMethods?.items || [])
    .filter((i) => i.isActive)
    .map((i) => i.name);

  // Common Form State
  const [propertyType, setPropertyType] = useState<string>(
    editingProperty?.propertyType || editingTenantRequest?.propertyType || activePropertyTypes[0] || 'شقة سكنية'
  );
  const [purpose, setPurpose] = useState<PropertyPurpose>(
    editingProperty?.purpose || editingTenantRequest?.purpose || 'rent'
  );
  const [district, setDistrict] = useState<string>(
    editingProperty?.district || editingTenantRequest?.preferredDistrict || activeDistricts[0] || 'حي الجامعة'
  );
  const [address, setAddress] = useState(editingProperty?.address || '');
  const [facade, setFacade] = useState(editingProperty?.facade || '');
  const [area, setArea] = useState<number | ''>(
    editingProperty ? editingProperty.area : (editingTenantRequest?.maxArea || editingTenantRequest?.minArea || '')
  );
  const [notes, setNotes] = useState(editingProperty?.description || editingTenantRequest?.notes || '');
  const [contactName, setContactName] = useState(editingProperty?.ownerName || editingTenantRequest?.tenantName || currentUser?.name || '');
  const [contactPhone, setContactPhone] = useState(editingProperty?.ownerPhone || editingTenantRequest?.tenantPhone || currentUser?.phone || '');
  const [uploadedImages, setUploadedImages] = useState<string[]>(editingProperty?.images || []);
  const [hasAgreedDeclaration, setHasAgreedDeclaration] = useState(Boolean(editingProperty || editingTenantRequest));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [submittedListingId, setSubmittedListingId] = useState('');

  // Offer-specific state (عرض عقار)
  const [title, setTitle] = useState(editingProperty?.title || '');
  const [price, setPrice] = useState<number | ''>(editingProperty ? editingProperty.price : '');
  const [deposit, setDeposit] = useState<number | ''>(editingProperty?.deposit ?? '');
  const [rentDurationMonths, setRentDurationMonths] = useState<number | ''>(editingProperty?.rentDurationMonths ?? 12);
  const [bedrooms, setBedrooms] = useState<number | ''>(editingProperty?.bedrooms ?? (editingTenantRequest?.bedrooms ?? 3));
  const [bathrooms, setBathrooms] = useState<number | ''>(editingProperty?.bathrooms ?? (editingTenantRequest?.bathrooms ?? 1));
  const [totalFloors, setTotalFloors] = useState<number | ''>(editingProperty?.totalFloors ?? 8);
  const [floorLevel, setFloorLevel] = useState<number | ''>(editingProperty?.floorLevel ?? 3);
  const [hasElevator, setHasElevator] = useState(editingProperty?.hasElevator ?? true);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>(
    editingProperty?.paymentMethods?.length ? editingProperty.paymentMethods : [activePaymentMethods[0] || 'إيجار شهري مقدماً']
  );
  const [utilities] = useState<PropertyUtilities>(() => {
    if (editingProperty?.utilities) return editingProperty.utilities;
    return {
      electricity: { available: true, type: utilityDefinitions.find((u) => u.key === 'electricity')?.statusOptions[0] || 'عداد قديم' },
      water: { available: true, type: utilityDefinitions.find((u) => u.key === 'water')?.statusOptions[0] || 'عداد مياه مستقل' },
      gas: { available: true, type: utilityDefinitions.find((u) => u.key === 'gas')?.statusOptions[0] || 'غاز طبيعي فاتورة' },
      internet: { available: true, type: utilityDefinitions.find((u) => u.key === 'internet')?.statusOptions[0] || 'خط أرضي فايبر' },
      elevator: { available: true, type: utilityDefinitions.find((u) => u.key === 'elevator')?.statusOptions[0] || 'أسانسير شغال' },
    };
  });

  // Request-specific state (طلب عقار)
  const [minPrice, setMinPrice] = useState<number | ''>(editingTenantRequest?.minPrice ?? '');
  const [maxPrice, setMaxPrice] = useState<number | ''>(editingTenantRequest?.maxPrice ?? 4000);
  const minArea = editingTenantRequest?.minArea ?? '';
  const maxArea = editingTenantRequest?.maxArea ?? '';
  const urgency = editingTenantRequest?.urgency || 'immediate';

  // Admin-specific state for 3rd-party coordination
  const [fee, setFee] = useState<number | ''>(editingProperty?.fee ?? 200);
  const [inspectionDate, setInspectionDate] = useState<string>(editingProperty?.inspectionDate ?? '');

  // Land detection
  const isLand = propertyType.includes('أرض') || propertyType.includes('فضاء');

  // خريطة لحفظ اختيارات المستخدم بناءً على معرف المرفق من لوحة التحكم (Flutter: Map<String, String> selectedUtilities)
  const [selectedUtilities, setSelectedUtilities] = useState<Record<string, string>>({});

  // حساب نسبة اكتمال البيانات - Flutter DynamicFormEntryScreen calculateCompletionPercentage
  const calculateCompletionPercentage = () => {
    const totalFields = 11;
    let filledFields = 0;

    // الحقول الإجبارية الأساسية
    if (propertyType && propertyType.trim()) filledFields++;
    if (purpose && purpose.trim()) filledFields++;
    if (district && district.trim()) filledFields++;
    if (isOffer ? (price !== '' && Number(price) > 0) : (maxPrice !== '' && Number(maxPrice) > 0)) filledFields++;
    if (area !== '' && Number(area) > 0) filledFields++;
    if (contactName && contactName.trim()) filledFields++;
    if (contactPhone && contactPhone.trim()) filledFields++;
    if (hasAgreedDeclaration) filledFields++;

    // الحقول الاختيارية (المرافق والتجهيزات المربوطة بالأدمن)
    if (selectedUtilities['electricity']) filledFields++;
    if (selectedUtilities['gas']) filledFields++;
    if (selectedUtilities['water'] || (!isLand && hasElevator)) filledFields++;

    const ratio = filledFields / totalFields;
    return Math.min(Math.max(ratio, 0.0), 1.0);
  };

  const progress = calculateCompletionPercentage();
  const progressPercent = Math.round(progress * 100);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);

  // Property type handler
  const handleTypeChange = (newType: string) => {
    setPropertyType(newType);
    if (newType.includes('أرض') || newType.includes('فضاء')) {
      setPurpose('sale');
    }
  };

  // Toggle voice recognition
  const toggleRecording = () => {
    if (isRecording) {
      stopVoice();
    } else {
      startVoice();
    }
  };

  const startVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg('المتصفح لا يدعم التسجيل الصوتي المباشر، يمكنك الكتابة في الحقول.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-EG';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
        setVoiceSeconds(0);
        setVoiceStatus('جاري الاستماع... تحدث بوضوح عن تفاصيل العقار');
        timerRef.current = window.setInterval(() => {
          setVoiceSeconds((prev) => {
            if (prev >= 120) {
              stopVoice();
              return 120;
            }
            return prev + 1;
          });
        }, 1000);
      };

      let fullRecordedTranscript = '';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript + ' ';
        }
        fullRecordedTranscript = currentTranscript.trim();

        if (fullRecordedTranscript) {
          const parsed = parseArabicVoiceTranscript(
            fullRecordedTranscript,
            activePropertyTypes,
            activeDistricts,
            utilityDefinitions
          );
          if (parsed.propertyType) handleTypeChange(parsed.propertyType);
          if (parsed.purpose) setPurpose(parsed.purpose);
          if (parsed.district) setDistrict(parsed.district);
          if (parsed.area) setArea(parsed.area);
          if (parsed.price) {
            if (isOffer) setPrice(parsed.price);
            else setMaxPrice(parsed.price);
          }
          if (parsed.bedrooms !== undefined && parsed.bedrooms !== '') setBedrooms(parsed.bedrooms);
          if (parsed.bathrooms !== undefined && parsed.bathrooms !== '') setBathrooms(parsed.bathrooms);
          if (parsed.floorLevel !== undefined && parsed.floorLevel !== '') setFloorLevel(parsed.floorLevel);
          if (parsed.hasElevator !== undefined) setHasElevator(parsed.hasElevator);
          if (parsed.ownerPhone && parsed.ownerPhone !== '01000000000') setContactPhone(parsed.ownerPhone);
          if (parsed.address) setAddress(parsed.address);
          if (parsed.facade) setFacade(parsed.facade);
          if (parsed.description) setNotes(parsed.description);
          if (isOffer) {
            setTitle(`${parsed.propertyType} ${parsed.purpose === 'rent' ? 'للإيجار' : 'للبيع'} في ${parsed.district}`);
          }

          setVoiceStatus(`تم التعرف بوضوح: "${fullRecordedTranscript.substring(0, 50)}..." وتم تعبئة الحقول!`);
        }
      };

      recognition.onerror = (e: any) => {
        // Ignore minor noise/no-speech events without killing session prematurely
        if (e.error === 'no-speech') {
          return;
        }
        stopVoice();
        if (e.error === 'not-allowed') {
          setVoiceStatus('تم رفض إذن الميكروفون. يرجى تفعيله من إعدادات المتصفح.');
        } else {
          setVoiceStatus('انتهى التسجيل الصوتي.');
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setErrorMsg('تعذر تشغيل الميكروفون.');
    }
  };

  const stopVoice = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  // Flutter submitForm logic: تجهيز الكائن بحالة غير معتمدة لانتظار السداد والموافقة
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 1. Strict Egyptian Mobile Validation (11 digits, 010/011/012/015)
    const phoneError = validateEgyptianPhone(contactPhone, 'رقم الهاتف للتواصل');
    if (phoneError) {
      setErrorMsg(phoneError);
      return;
    }

    const cleanContactPhone = normalizeEgyptianPhone(contactPhone);

    if (!area || Number(area) <= 0) {
      setErrorMsg('يرجى تحديد المساحة بالمتر المربع.');
      return;
    }

    // 1. تجهيز الكود المعرف بنمط 'ASY-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}'
    const generatedListingId = `ASY-${Date.now().toString().substring(7)}`;
    const todayDate = new Date().toISOString().split('T')[0];

    if (isOffer) {
      if (!price || Number(price) <= 0) {
        setErrorMsg('يرجى تحديد السعر أو الإيجار.');
        return;
      }

      if (!hasAgreedDeclaration) {
        setErrorMsg('يجب الموافقة على إقرار صحة البيانات والملكية للمتابعة.');
        return;
      }

      const defaultLandImg = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80';
      const defaultAptImg = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80';

      // 1. تجهيز الكائن بحالة غير معتمدة لانتظار السداد والموافقة
      const newListing: Property = {
        id: generatedListingId,
        code: generatedListingId,
        type: 'عرض',
        status: isAdmin ? 'approved' : 'pending_approval',
        isApproved: isAdmin,
        title: title.trim() || (isLand ? `أرض فضاء ${area} م² في ${district}` : `${propertyType} بمساحة ${area} م² في ${district}`),
        description: notes.trim() || (isLand ? `قطعة أرض فضاء ممتازة بمساحة ${area} م² في أسيوط - ${district}` : `${propertyType} للـ${purpose === 'rent' ? 'إيجار' : 'بيع'} في ${district}`),
        propertyType,
        purpose: isLand ? 'sale' : purpose,
        price: Number(price),
        deposit: !isLand && purpose === 'rent' && deposit ? Number(deposit) : undefined,
        rentDurationMonths: !isLand && purpose === 'rent' && rentDurationMonths ? Number(rentDurationMonths) : undefined,
        city: 'أسيوط',
        district,
        address: address.trim() || district,
        facade: facade.trim() || undefined,
        area: Number(area),
        bedrooms: !isLand && bedrooms !== '' ? Number(bedrooms) : undefined,
        bathrooms: !isLand && bathrooms !== '' ? Number(bathrooms) : undefined,
        totalFloors: !isLand && totalFloors !== '' ? Number(totalFloors) : undefined,
        floorLevel: !isLand && floorLevel !== '' ? Number(floorLevel) : undefined,
        hasElevator: !isLand ? hasElevator : false,
        utilities: isLand
          ? {
              electricity: { available: false, type: 'غير متوفر' },
              water: { available: false, type: 'غير متوفر' },
              gas: { available: false, type: 'غير متوفر' },
              internet: { available: false, type: 'غير متوفر' },
              elevator: { available: false, type: 'بدون أسانسير' },
            }
          : {
              ...utilities,
              ...(selectedUtilities['electricity'] ? { electricity: { available: true, type: selectedUtilities['electricity'] } } : {}),
              ...(selectedUtilities['water'] ? { water: { available: true, type: selectedUtilities['water'] } } : {}),
              ...(selectedUtilities['gas'] ? { gas: { available: true, type: selectedUtilities['gas'] } } : {}),
              ...(selectedUtilities['internet'] ? { internet: { available: true, type: selectedUtilities['internet'] } } : {}),
              ...(selectedUtilities['elevator'] ? { elevator: { available: true, type: selectedUtilities['elevator'] } } : {}),
            },
        paymentMethods: isLand ? ['كاش فوري (للبيع)'] : selectedPaymentMethods,
        ownerName: contactName.trim() || 'مالك العقار',
        ownerPhone: cleanContactPhone,
        source: isAdmin ? 'إدارة المنظومة (نشر مباشر)' : 'مالك مباشر',
        images: uploadedImages.length > 0 ? uploadedImages : [isLand ? defaultLandImg : defaultAptImg],
        createdByAdmin: isAdmin,
        fee: isAdmin && fee ? Number(fee) : undefined,
        inspectionDate: isAdmin && inspectionDate ? inspectionDate : undefined,
        createdAt: todayDate,
        viewsCount: 1,
      };

      if (editingProperty && onUpdateProperty) {
        onUpdateProperty({
          ...editingProperty,
          ...newListing,
          id: editingProperty.id,
          code: editingProperty.code,
          status: isAdmin ? 'approved' : 'pending',
          isApproved: isAdmin,
          adminNote: undefined,
        });
        setSubmittedListingId(editingProperty.code);
        setShowSuccessDialog(true);
      } else {
        if (onAddProperty) onAddProperty(newListing);
        onBack();
      }
    } else {
      // Add Tenant Request (طلب عقار)
      if (!maxPrice || Number(maxPrice) <= 0) {
        setErrorMsg('يرجى تحديد الميزانية القصوى.');
        return;
      }

      // 1. تجهيز الكائن بحالة معتمدة مباشرة لو أدمن، أو قيد المراجعة لو مستخدم عادي
      const newListing: TenantRequest = {
        id: generatedListingId,
        requestCode: generatedListingId,
        type: 'طلب',
        status: isAdmin ? 'approved' : 'pending_approval',
        isApproved: isAdmin,
        tenantName: contactName.trim() || 'مواطن باحث عن عقار',
        tenantPhone: cleanContactPhone,
        propertyType,
        purpose: isLand ? 'sale' : purpose,
        preferredDistrict: district,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: Number(maxPrice),
        minArea: minArea ? Number(minArea) : undefined,
        maxArea: maxArea ? Number(maxArea) : Number(area) || undefined,
        bedrooms: !isLand && bedrooms !== '' ? Number(bedrooms) : undefined,
        bathrooms: !isLand && bathrooms !== '' ? Number(bathrooms) : undefined,
        urgency,
        notes: notes.trim(),
        createdAt: todayDate,
      };

      if (editingTenantRequest && onUpdateTenantRequest) {
        onUpdateTenantRequest({
          ...editingTenantRequest,
          ...newListing,
          id: editingTenantRequest.id,
          requestCode: editingTenantRequest.requestCode,
          status: 'pending_approval',
          isApproved: false,
          adminNote: undefined,
        });
        setSubmittedListingId(editingTenantRequest.requestCode || editingTenantRequest.id);
        setShowSuccessDialog(true);
      } else {
        if (onAddTenantRequest) onAddTenantRequest(newListing);
        onBack();
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-24 text-slate-800 animate-in fade-in duration-150">
      {/* Flutter Style AppBar */}
      <header className="sticky top-0 z-30 bg-[#002B49] text-white shadow-md">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-white"
            title="رجوع"
            aria-label="رجوع"
          >
            <ArrowRight className="w-6 h-6" />
          </button>

          <div className="text-center">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
              {isEditing
                ? editingProperty
                  ? `تعديل واستيفاء عرض العقار (${editingProperty.code})`
                  : `تعديل واستيفاء طلب العقار (${editingTenantRequest?.requestCode || editingTenantRequest?.id})`
                : isAdmin
                ? isOffer
                  ? 'إضافة عرض عقار (إدارة المنظومة)'
                  : 'إضافة طلب عقار (إدارة المنظومة)'
                : isOffer
                ? 'إضافة عرض عقار (متاح)'
                : 'إضافة طلب عقار (مطلوب)'}
            </h1>
            <p className="text-[11px] text-[#FFB300] font-semibold">
              {isEditing
                ? 'تحديث البيانات وإعادة الإرسال لمراجعة الإدارة'
                : isAdmin
                ? 'نشر فوري ومباشر معتمد مع تحديد الرسوم وتاريخ المعاينة'
                : isOffer
                ? 'للمالك أو الوسيط العقاري'
                : 'للباحث عن سكن أو شراء'}
            </p>
          </div>

          <div className="w-10 flex items-center justify-center">
            {isOffer ? (
              <RealEstateAgent className="w-6 h-6 text-[#FFB300]" />
            ) : (
              <Assignment className="w-6 h-6 text-[#FFB300]" />
            )}
          </div>
        </div>
      </header>

      {/* Main Content Form */}
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* ملاحظة الإدارة لاستيفاء البيان عند التعديل */}
        {(editingProperty?.adminNote || editingTenantRequest?.adminNote) && (
          <div className="bg-amber-50 border-2 border-amber-400 p-4 rounded-2xl text-amber-900 font-semibold space-y-1 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2 font-black text-sm text-amber-950">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>مطلوب استيفاء بيانات من إدارة التطبيق:</span>
            </div>
            <p className="text-xs text-amber-900 pr-7 font-bold">
              "{editingProperty?.adminNote || editingTenantRequest?.adminNote}"
            </p>
            <p className="text-[11px] text-amber-700 pr-7 pt-1">
              برجاء تعديل البيانات الناقصة أو توضيحها في النموذج، ثم الضغط على حفظ أسفل الصفحة لإعادة الإرسال للإدارة للمراجعة والاعتماد.
            </p>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* دائرِة نسبة اكتمال ملء البيانات - Flutter Completion Card */}
        {/* ------------------------------------------------------------- */}
        <div className="bg-[#002B49] text-white p-4 sm:p-5 rounded-2xl shadow-md flex items-center gap-4">
          <div className="relative w-[55px] h-[55px] shrink-0 flex items-center justify-center">
            {/* SVG Circular Progress Indicator */}
            <svg className="w-[55px] h-[55px] -rotate-90" viewBox="0 0 55 55">
              <circle
                cx="27.5"
                cy="27.5"
                r="22"
                fill="none"
                stroke="rgba(255, 255, 255, 0.24)"
                strokeWidth="5"
              />
              <circle
                cx="27.5"
                cy="27.5"
                r="22"
                fill="none"
                stroke="#FFB300"
                strokeWidth="5"
                strokeDasharray={2 * Math.PI * 22}
                strokeDashoffset={2 * Math.PI * 22 * (1 - progress)}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs sm:text-[13px] font-bold text-white">
              {progressPercent}%
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm sm:text-base font-bold text-white">
              نسبة اكتمال الإعلان
            </h4>
            <p className="text-[11px] text-white/70 mt-1 leading-relaxed">
              كلما أضفت بيانات اختيارية أكثر، زادت فرصة قبول وثقة الإعلان لدى الإدارة والمشترين.
            </p>
          </div>
        </div>

        {/* Voice Dictation Card Banner */}
        <div className="bg-linear-to-r from-[#002B49] to-[#00406C] rounded-2xl p-4 text-white shadow-md flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[#FFB300] text-xs font-bold">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>المساعد الصوتي الذكي</span>
            </div>
            <p className="text-xs text-white/80">
              تحدث بدلاً من الكتابة لتعبئة نموذج {isOffer ? 'العرض' : 'الطلب'} تلقائياً
            </p>
            {voiceStatus && (
              <p className="text-[11px] text-amber-200 font-medium">{voiceStatus}</p>
            )}
          </div>

          <button
            type="button"
            onClick={toggleRecording}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-transform active:scale-95 shadow-md shrink-0 ${
              isRecording
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-[#FFB300] hover:bg-[#FFA000] text-black'
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="w-4 h-4" />
                <span>إيقاف ({voiceSeconds}ث)</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 text-black" />
                <span>تسجيل صوتي</span>
              </>
            )}
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: نوع العقار والغرض */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#002B49] flex items-center gap-2 border-b border-slate-100 pb-2">
              <Building2 className="w-4 h-4 text-[#FFB300]" />
              <span>البيانات الأساسية للعقار</span>
            </h3>

            {/* Property Type Dropdown (قائمة منسدلة نظيفة مطابقة لـ DropdownButtonFormField وقائمة المنطقة) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نوع العقار * <span className="text-slate-500 font-normal">(إجباري)</span>
              </label>
              <select
                value={propertyType}
                onChange={(e) => handleTypeChange(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#002B49] transition-all cursor-pointer"
              >
                <option value="" disabled>اختر نوع العقار...</option>
                {activePropertyTypes.map((type) => (
                  <option key={type} value={type} className="text-xs">
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Notice if Land (قطعة أرض فضاء) */}
            {isLand && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-medium space-y-1">
                <span className="font-bold block text-amber-800">
                  📍 وضع قطعة أرض فضاء:
                </span>
                <p>
                  تم تلقائياً إخفاء حقول المباني والإيجار والعدادات (الغرف، الحمامات، الطوابق، مدة الإيجار، والأسانسير).
                  يظهر فقط: المساحة، السعر، الحي، العنوان، والواجهة.
                </p>
              </div>
            )}

            {/* Purpose: Sale vs Rent (Only visible if NOT land) */}
            {!isLand && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الغرض من العقار
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPurpose('rent')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      purpose === 'rent'
                        ? 'bg-[#002B49] text-[#FFB300] border-[#002B49] shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    إيجار سكني / تجاري
                  </button>
                  <button
                    type="button"
                    onClick={() => setPurpose('sale')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      purpose === 'sale'
                        ? 'bg-[#002B49] text-[#FFB300] border-[#002B49] shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    بيع وتمليك كاش
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: الموقع والتسعير (إجباري *) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-[14px] font-bold text-[#002B49] flex items-center gap-2 border-b border-slate-100 pb-2">
              <MapPin className="w-4 h-4 text-[#FFB300]" />
              <span>الموقع والتسعير (إجباري *)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* District */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المنطقة / الحي بأسيوط
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
                >
                  {activeDistricts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Area */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المساحة الإجمالية (م²) * <span className="text-slate-500 font-normal">(إجباري)</span>
                </label>
                <div className="relative">
                  <Maximize2 className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    value={area}
                    onChange={(e) => setArea(e.target.value ? Number(e.target.value) : '')}
                    placeholder="مثال: 120"
                    required
                    className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                العنوان بالتفصيل أو الشارع
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="مثال: شارع الجمهورية المتفرع من شارع المحطة"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
              />
            </div>

            {/* Facade / الواجهة (متاحة للأرض والعقارات) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الواجهة (إن وجد)
              </label>
              <div className="relative">
                <Compass className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={facade}
                  onChange={(e) => setFacade(e.target.value)}
                  placeholder="مثال: بحرية على شارع رئيسي بعرض 16 متر"
                  className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
                />
              </div>
            </div>

            {/* Pricing Section */}
            {isOffer ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isLand || purpose === 'sale' ? 'السعر الإجمالي (ج.م) * (إجباري)' : 'الإيجار الشهري (ج.م) * (إجباري)'}
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                      placeholder="مثال: 3500"
                      required
                      className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-[#002B49] focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
                    />
                  </div>
                </div>

                {!isLand && purpose === 'rent' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      مبلغ التأمين (ج.م)
                    </label>
                    <input
                      type="number"
                      value={deposit}
                      onChange={(e) => setDeposit(e.target.value ? Number(e.target.value) : '')}
                      placeholder="مثال: 3500"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الحد الأدنى للميزانية (ج.م)
                  </label>
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : '')}
                    placeholder="مثال: 2000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    أقصى ميزانية مقبولة (ج.م) * <span className="text-slate-500 font-normal">(إجباري)</span>
                  </label>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : '')}
                    placeholder="مثال: 4500"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-[#002B49] focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: تفاصيل الغرف والمباني (مخفية كلياً إذا كان أرض فضاء) */}
          {!isLand && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-[#002B49] flex items-center gap-2 border-b border-slate-100 pb-2">
                <Bed className="w-4 h-4 text-[#FFB300]" />
                <span>مواصفات وتجهيزات المبنى</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    عدد الغرف
                  </label>
                  <div className="relative">
                    <Bed className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      value={bedrooms}
                      onChange={(e) => setBedrooms(e.target.value ? Number(e.target.value) : '')}
                      className="w-full pr-8 pl-2 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    عدد الحمامات
                  </label>
                  <div className="relative">
                    <Bath className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      value={bathrooms}
                      onChange={(e) => setBathrooms(e.target.value ? Number(e.target.value) : '')}
                      className="w-full pr-8 pl-2 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-hidden"
                    />
                  </div>
                </div>

                {isOffer && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        رقم الطابق
                      </label>
                      <input
                        type="number"
                        value={floorLevel}
                        onChange={(e) => setFloorLevel(e.target.value ? Number(e.target.value) : '')}
                        placeholder="3"
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        إجمالي الأدوار
                      </label>
                      <input
                        type="number"
                        value={totalFloors}
                        onChange={(e) => setTotalFloors(e.target.value ? Number(e.target.value) : '')}
                        placeholder="8"
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-hidden"
                      />
                    </div>
                  </>
                )}
              </div>

              {isOffer && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-700">توفر مصعد (أسانسير) بالعمارة:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setHasElevator(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        hasElevator ? 'bg-[#002B49] text-[#FFB300]' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      يوجد أسانسير
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasElevator(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        !hasElevator ? 'bg-[#002B49] text-[#FFB300]' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      بدون أسانسير
                    </button>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* 2. المرافق والتجهيزات (مربوطة ديناميكياً بلوحة التحكم) */}
              {/* ------------------------------------------------------------- */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-[#FFB300]" />
                    <span>المرافق والتجهيزات (مربوطة ديناميكياً بلوحة التحكم)</span>
                  </span>
                  <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-bold">
                    يزيد اكتمال الإعلان
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {utilityDefinitions.map((utility) => {
                    const selectedVal = selectedUtilities[utility.key] || selectedUtilities[utility.id] || '';
                    return (
                      <div key={utility.id || utility.key}>
                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                          {utility.key === 'electricity' && <Zap className="w-3.5 h-3.5 text-amber-500" />}
                          {utility.key === 'water' && <Droplets className="w-3.5 h-3.5 text-blue-500" />}
                          {utility.key === 'gas' && <Flame className="w-3.5 h-3.5 text-orange-500" />}
                          {utility.key === 'internet' && <Wifi className="w-3.5 h-3.5 text-indigo-500" />}
                          {utility.key === 'elevator' && <ArrowUpDown className="w-3.5 h-3.5 text-teal-500" />}
                          <span>{utility.name}</span>
                        </label>
                        <select
                          value={selectedVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedUtilities((prev) => {
                              const updated = { ...prev };
                              if (val) {
                                updated[utility.key] = val;
                                updated[utility.id] = val;
                              } else {
                                delete updated[utility.key];
                                delete updated[utility.id];
                              }
                              return updated;
                            });
                          }}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-[#002B49] text-slate-800"
                        >
                          <option value="">-- لم يتم التحديد (اختياري) --</option>
                          {utility.statusOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Section 4: مدة الإيجار وطرق الدفع والخدمات (مخفية كلياً إذا كان أرض فضاء) */}
          {!isLand && isOffer && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-[#002B49] flex items-center gap-2 border-b border-slate-100 pb-2">
                <Clock className="w-4 h-4 text-[#FFB300]" />
                <span>مدة الإيجار وطرق السداد</span>
              </h3>

              {purpose === 'rent' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    مدة عقد الإيجار (بالأشهر)
                  </label>
                  <input
                    type="number"
                    value={rentDurationMonths}
                    onChange={(e) => setRentDurationMonths(e.target.value ? Number(e.target.value) : '')}
                    placeholder="12 شهر"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  طرق الدفع المفضلة
                </label>
                <div className="flex flex-wrap gap-2">
                  {activePaymentMethods.map((method) => {
                    const isSelected = selectedPaymentMethods.includes(method);
                    return (
                      <button
                        type="button"
                        key={method}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedPaymentMethods((prev) => prev.filter((m) => m !== method));
                          } else {
                            setSelectedPaymentMethods((prev) => [...prev, method]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-[#002B49] text-[#FFB300] border-[#002B49]'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {method}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Section 5: معلومات التواصل والوصف */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#002B49] flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-[#FFB300]" />
              <span>بيانات الاتصال والتواصل</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الاسم بالكامل
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="مثال: م. أحمد عبد الرحيم"
                    className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم الهاتف (واتساب / اتصال)*
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    dir="ltr"
                    value={contactPhone}
                    onChange={(e) => {
                      const norm = normalizeEgyptianPhone(e.target.value);
                      if (norm.length <= 11) setContactPhone(norm);
                    }}
                    placeholder="01012345678"
                    required
                    className="w-full pr-9 pl-16 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#002B49] text-right"
                  />
                  {isValidEgyptianPhone(contactPhone) ? (
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      صحيح
                    </span>
                  ) : contactPhone.length > 0 ? (
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono font-bold">
                      {contactPhone.length}/11
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                  <span>11 رقماً يبدأ بـ (010، 011، 012، 015)</span>
                  {contactPhone.length >= 3 && (
                    <span className={`font-bold ${['010','011','012','015'].includes(contactPhone.substring(0,3)) ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {contactPhone.startsWith('010') ? 'فودافون' : contactPhone.startsWith('011') ? 'اتصالات' : contactPhone.startsWith('012') ? 'أورنج' : contactPhone.startsWith('015') ? 'وي' : 'بادئة غير صحيحة'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ملاحظات وتفاصيل إضافية
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي مميزات إضافية، شروط خاصة، أو تفاصيل ترغب في توضيحها..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
              />
            </div>

            {/* Photos Upload (Optional: Device Camera & Mobile Gallery - up to 4 images, compressed <= 250KB per image) */}
            {isOffer && (
              <ImageUploadField
                images={uploadedImages}
                onChange={setUploadedImages}
                maxImages={4}
                maxCompressedSizeKB={250}
              />
            )}

            {/* Admin Financial & Inspection Coordination */}
            {isAdmin && (
              <div className="bg-amber-50/80 p-4 rounded-2xl border-2 border-amber-300 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    بيانات المعاينة الميدانية والرسوم (إدارة المنظومة)
                  </span>
                  <span className="text-[10px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full shadow-2xs">
                    نشر مباشر ومعتمد فوراً
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">رسوم المعاينة (ج.م)</label>
                    <input
                      type="number"
                      value={fee}
                      onChange={(e) => setFee(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="200"
                      className="w-full p-2.5 text-xs bg-white rounded-xl border border-amber-300 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">تاريخ المعاينة الميدانية</label>
                    <input
                      type="date"
                      value={inspectionDate}
                      onChange={(e) => setInspectionDate(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white rounded-xl border border-amber-300 font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Legal Declaration (إقرار الملكية والصحة) */}
            {isOffer && (
              <label className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={hasAgreedDeclaration}
                  onChange={(e) => setHasAgreedDeclaration(e.target.checked)}
                  className="mt-0.5 rounded text-[#002B49] focus:ring-[#002B49] w-4 h-4"
                />
                <span className="text-amber-950 font-medium leading-relaxed">
                  <strong>إقرار إجباري:</strong> أقر أنا المعلن بأنني المالك أو الوكيل الرسمي المفوض لهذا العقار، وأن جميع البيانات المدخلة صحيحة تماماً ومطابقة للمعاينة على أرض الواقع.
                </span>
              </label>
            )}
          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-2xl bg-[#002B49] hover:bg-[#001D33] text-[#FFB300] font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all active:scale-[0.99] cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5 text-[#FFB300]" />
              <span>
                {isEditing
                  ? 'حفظ واستيفاء البيانات وإعادة الإرسال للمراجعة'
                  : isAdmin
                  ? 'نشر الإعلان مباشرة (معتمد فوراً من الإدارة)'
                  : isOffer
                  ? 'نشر عرض العقار الآن (متاح)'
                  : 'إرسال وتسجيل طلب العقار (مطلوب)'}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Flutter AlertDialog: إظهار رسالة التنبيه الفورية للمستخدم */}
      {showSuccessDialog && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="bg-white w-full max-w-sm p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-150 text-right"
            style={{ borderRadius: '15px' }}
          >
            {/* Title */}
            <div className="flex items-center gap-2">
              <HourglassTopRounded className="w-6 h-6 text-[#FFB300] shrink-0" />
              <h3 className="text-[16px] font-bold text-slate-900 leading-none">
                {isAdmin ? 'تم نشر الإعلان بنجاح' : 'تم تسجيل الطلب'}
              </h3>
            </div>

            {/* Content */}
            <div className="space-y-2.5">
              <p className="text-[13px] leading-[1.5] text-slate-700">
                {isAdmin
                  ? 'تم إضافة ونشر الإعلان مباشرة بنجاح دون الحاجة لمراجعة إدارية، وهو متاح الآن في عروض المنصة.'
                  : 'تم تسجيل طلبك بنجاح! الإعلان حالياً قيد المراجعة وفي انتظار سداد رسوم النشر والموافقة الإدارية ليظهر على المنصة.'}
              </p>
              {submittedListingId && (
                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                  <span>كود الإعلان:</span>
                  <span className="font-mono font-bold text-sm text-[#002B49]">{submittedListingId}</span>
                </div>
              )}
            </div>

            {/* Actions: ElevatedButton(style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF002B49)), onPressed: Navigator.pop(ctx); Navigator.pop(context); child: const Text('حسناً', style: TextStyle(color: Colors.white))) */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessDialog(false); // إغلاق النافذة
                  onBack(); // العودة للشاشة الرئيسية
                }}
                style={{ backgroundColor: '#002B49' }}
                className="px-6 py-2 rounded-xl text-white font-bold text-sm hover:opacity-95 active:scale-95 transition-all shadow-md cursor-pointer"
              >
                حسناً
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
