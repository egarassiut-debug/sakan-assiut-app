import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  Clock,
  Target,
  ArrowUp,
  AlertTriangle
} from 'lucide-react';
import { RealEstateAgent, Assignment, HourglassTopRounded } from './FlutterIcons';
import { validatePropertyPayload, validateTenantRequestPayload, dbUpsertProfile } from '../lib/supabase';
import { safeStorageGetItem, safeSaveDraft, safeStorageRemoveItem } from '../utils/storageManager';

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

  const draftStorageKey = isOffer ? 'asuit_property_form_draft_offer' : 'asuit_property_form_draft_request';

  // 1. Read saved draft with safe storage manager if not in editing mode
  const initialDraft = useMemo(() => {
    if (isEditing) return null;
    return safeStorageGetItem<any>(draftStorageKey, null);
  }, [isEditing, draftStorageKey]);

  // Common Form State
  const [propertyType, setPropertyType] = useState<string>(
    editingProperty?.propertyType || editingTenantRequest?.propertyType || initialDraft?.propertyType || activePropertyTypes[0] || 'شقة سكنية'
  );
  const [purpose, setPurpose] = useState<PropertyPurpose>(
    editingProperty?.purpose || editingTenantRequest?.purpose || initialDraft?.purpose || 'rent'
  );
  const [district, setDistrict] = useState<string>(
    editingProperty?.district || editingTenantRequest?.preferredDistrict || initialDraft?.district || activeDistricts[0] || 'حي الجامعة'
  );
  const [address, setAddress] = useState(editingProperty?.address || initialDraft?.address || '');
  const [facade, setFacade] = useState(editingProperty?.facade || initialDraft?.facade || '');
  const [area, setArea] = useState<number | ''>(
    editingProperty ? editingProperty.area : (editingTenantRequest?.maxArea || editingTenantRequest?.minArea || initialDraft?.area || '')
  );
  const [notes, setNotes] = useState(editingProperty?.description || editingTenantRequest?.notes || initialDraft?.notes || '');
  const [contactName, setContactName] = useState(editingProperty?.ownerName || editingTenantRequest?.tenantName || initialDraft?.contactName || currentUser?.name || '');
  const [contactPhone, setContactPhone] = useState(editingProperty?.ownerPhone || editingTenantRequest?.tenantPhone || initialDraft?.contactPhone || currentUser?.phone || '');
  const [uploadedImages, setUploadedImages] = useState<string[]>(editingProperty?.images || initialDraft?.uploadedImages || []);
  const [hasAgreedDeclaration, setHasAgreedDeclaration] = useState(Boolean(editingProperty || editingTenantRequest || initialDraft?.hasAgreedDeclaration));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [submittedListingId, setSubmittedListingId] = useState('');

  // Validation Refs for Smooth Auto-Scroll
  const propertyTypeRef = useRef<HTMLSelectElement | null>(null);
  const districtRef = useRef<HTMLSelectElement | null>(null);
  const areaInputRef = useRef<HTMLInputElement | null>(null);
  const priceInputRef = useRef<HTMLInputElement | null>(null);
  const maxPriceInputRef = useRef<HTMLInputElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const contactNameInputRef = useRef<HTMLInputElement | null>(null);
  const declarationRef = useRef<HTMLLabelElement | null>(null);
  const floorLevelRef = useRef<HTMLInputElement | null>(null);
  const imagesSectionRef = useRef<HTMLDivElement | null>(null);
  const bottomErrorRef = useRef<HTMLDivElement | null>(null);
  const topErrorRef = useRef<HTMLDivElement | null>(null);

  const triggerValidationToast = (msg: string = 'يرجى استيفاء البيانات المطلوبة أولاً') => {
    setToastMsg(msg);
  };

  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  const scrollToError = (targetRef: React.RefObject<HTMLElement | null>, fieldName?: string) => {
    if (fieldName) {
      setInvalidField(fieldName);
    }
    setTimeout(() => {
      if (targetRef && targetRef.current) {
        targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add animated visual pulse ring to distinctly highlight the field for the user
        const el = targetRef.current;
        el.classList.add('ring-4', 'ring-rose-500', 'ring-offset-2', 'transition-all');
        setTimeout(() => {
          el.classList.remove('ring-4', 'ring-rose-500', 'ring-offset-2');
        }, 3000);

        if ('focus' in el && typeof (el as HTMLElement).focus === 'function') {
          try {
            (el as HTMLElement).focus({ preventScroll: true });
          } catch {
            // ignore
          }
        }
      } else if (bottomErrorRef.current) {
        bottomErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
  };

  // Direct Jump to the exact error field when user clicks 'الدخول للخطأ' or the error banner
  const jumpToCurrentError = () => {
    if (invalidField === 'phone') {
      scrollToError(phoneInputRef, 'phone');
    } else if (invalidField === 'area') {
      scrollToError(areaInputRef, 'area');
    } else if (invalidField === 'price') {
      scrollToError(priceInputRef, 'price');
    } else if (invalidField === 'maxPrice') {
      scrollToError(maxPriceInputRef, 'maxPrice');
    } else if (invalidField === 'district') {
      scrollToError(districtRef, 'district');
    } else if (invalidField === 'propertyType') {
      scrollToError(propertyTypeRef, 'propertyType');
    } else if (invalidField === 'declaration') {
      scrollToError(declarationRef, 'declaration');
    } else {
      // Intelligently check whichever field is missing or invalid
      if (!contactPhone || !isValidEgyptianPhone(contactPhone)) {
        scrollToError(phoneInputRef, 'phone');
      } else if (!area || Number(area) <= 0) {
        scrollToError(areaInputRef, 'area');
      } else if (isOffer && (!price || Number(price) <= 0)) {
        scrollToError(priceInputRef, 'price');
      } else if (!isOffer && (!maxPrice || Number(maxPrice) <= 0)) {
        scrollToError(maxPriceInputRef, 'maxPrice');
      } else if (!district) {
        scrollToError(districtRef, 'district');
      } else if (!propertyType) {
        scrollToError(propertyTypeRef, 'propertyType');
      } else if (topErrorRef.current) {
        topErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Direct Jump to the field specified in the admin note (e.g. photos, floor, price, etc.)
  const jumpToAdminNoteTarget = () => {
    const note = (editingProperty?.adminNote || editingTenantRequest?.adminNote || '').toLowerCase();
    if (note.includes('صور') || note.includes('واجهة') || note.includes('صورة') || note.includes('مدخل')) {
      if (imagesSectionRef.current) {
        imagesSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        imagesSectionRef.current.classList.add('ring-4', 'ring-amber-500', 'ring-offset-2', 'transition-all');
        setTimeout(() => imagesSectionRef.current?.classList.remove('ring-4', 'ring-amber-500', 'ring-offset-2'), 3000);
      }
    } else if (note.includes('دور') || note.includes('طابق')) {
      if (floorLevelRef.current) {
        floorLevelRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        floorLevelRef.current.classList.add('ring-4', 'ring-amber-500', 'ring-offset-2', 'transition-all');
        setTimeout(() => floorLevelRef.current?.classList.remove('ring-4', 'ring-amber-500', 'ring-offset-2'), 3000);
        floorLevelRef.current.focus?.({ preventScroll: true });
      }
    } else if (note.includes('سعر') || note.includes('إيجار') || note.includes('مبلغ') || note.includes('قيمة')) {
      scrollToError(priceInputRef, 'price');
    } else if (note.includes('مساحة')) {
      scrollToError(areaInputRef, 'area');
    } else if (note.includes('هاتف') || note.includes('رقم')) {
      scrollToError(phoneInputRef, 'phone');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // When opening an ad that needs completion, automatically focus on the note / target field
  useEffect(() => {
    if (editingProperty?.status === 'needs_completion' || editingTenantRequest?.status === 'needs_completion') {
      const timer = setTimeout(() => {
        jumpToAdminNoteTarget();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [editingProperty?.id, editingTenantRequest?.id]);

  // Draft auto-save indicator state
  const [hasRestoredDraft, setHasRestoredDraft] = useState<boolean>(() => Boolean(initialDraft && (initialDraft.title || initialDraft.address || initialDraft.area || initialDraft.price || initialDraft.notes || initialDraft.maxPrice)));
  const [lastSavedNotice, setLastSavedNotice] = useState<string | null>(() => initialDraft?.savedAt ? `تم استرجاع مسودة من ${initialDraft.savedAt}` : null);

  // Offer-specific state (عرض عقار)
  const [title, setTitle] = useState(editingProperty?.title || initialDraft?.title || '');
  const [price, setPrice] = useState<number | ''>(editingProperty ? editingProperty.price : (initialDraft?.price ?? ''));
  const [deposit, setDeposit] = useState<number | ''>(editingProperty?.deposit ?? (initialDraft?.deposit ?? ''));
  const [rentDurationMonths, setRentDurationMonths] = useState<number | ''>(editingProperty?.rentDurationMonths ?? (initialDraft?.rentDurationMonths ?? 12));
  const [bedrooms, setBedrooms] = useState<number | ''>(editingProperty?.bedrooms ?? (editingTenantRequest?.bedrooms ?? (initialDraft?.bedrooms ?? 3)));
  const [bathrooms, setBathrooms] = useState<number | ''>(editingProperty?.bathrooms ?? (editingTenantRequest?.bathrooms ?? (initialDraft?.bathrooms ?? 1)));
  const [totalFloors, setTotalFloors] = useState<number | ''>(editingProperty?.totalFloors ?? (initialDraft?.totalFloors ?? 8));
  const [floorLevel, setFloorLevel] = useState<number | ''>(editingProperty?.floorLevel ?? (initialDraft?.floorLevel ?? 3));
  const [hasElevator, setHasElevator] = useState(editingProperty?.hasElevator ?? (initialDraft?.hasElevator ?? true));
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>(
    editingProperty?.paymentMethods?.length ? editingProperty.paymentMethods : (initialDraft?.selectedPaymentMethods ?? [activePaymentMethods[0] || 'إيجار شهري مقدماً'])
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
  const [minPrice, setMinPrice] = useState<number | ''>(editingTenantRequest?.minPrice ?? (initialDraft?.minPrice ?? ''));
  const [maxPrice, setMaxPrice] = useState<number | ''>(editingTenantRequest?.maxPrice ?? (initialDraft?.maxPrice ?? 4000));
  const minArea = editingTenantRequest?.minArea ?? (initialDraft?.minArea ?? '');
  const maxArea = editingTenantRequest?.maxArea ?? (initialDraft?.maxArea ?? '');
  const urgency = editingTenantRequest?.urgency || initialDraft?.urgency || 'immediate';

  // Admin-specific state for 3rd-party coordination
  const [fee, setFee] = useState<number | ''>(editingProperty?.fee ?? (initialDraft?.fee ?? 200));
  const [inspectionDate, setInspectionDate] = useState<string>(editingProperty?.inspectionDate ?? (initialDraft?.inspectionDate ?? ''));

  // Land detection
  const isLand = propertyType.includes('أرض') || propertyType.includes('فضاء');

  // خريطة لحفظ اختيارات المستخدم بناءً على معرف المرفق من لوحة التحكم (Flutter: Map<String, String> selectedUtilities)
  const [selectedUtilities, setSelectedUtilities] = useState<Record<string, string>>(initialDraft?.selectedUtilities || {});

  // دالة مسح المسودة والبدء من جديد
  const handleClearDraft = () => {
    safeStorageRemoveItem(draftStorageKey);
    setHasRestoredDraft(false);
    setLastSavedNotice(null);
    setTitle('');
    setPrice('');
    setDeposit('');
    setRentDurationMonths(12);
    setAddress('');
    setFacade('');
    setArea('');
    setNotes('');
    setContactName(currentUser?.name || '');
    setContactPhone(currentUser?.phone || '');
    setUploadedImages([]);
    setHasAgreedDeclaration(false);
    setSelectedUtilities({});
    setMinPrice('');
    setMaxPrice(4000);
    setBedrooms(3);
    setBathrooms(1);
    setTotalFloors(8);
    setFloorLevel(3);
    setHasElevator(true);
  };

  // تأثير الحفظ التلقائي عند كتابة أو تعديل أي بيان داخل النموذج
  useEffect(() => {
    if (isEditing) return;

    const hasContent = Boolean(
      title?.trim() ||
      address?.trim() ||
      facade?.trim() ||
      notes?.trim() ||
      (area !== '' && Number(area) > 0) ||
      (price !== '' && Number(price) > 0) ||
      (minPrice !== '' && Number(minPrice) > 0) ||
      (uploadedImages && uploadedImages.length > 0) ||
      (contactName && contactName !== (currentUser?.name || '')) ||
      (contactPhone && contactPhone !== (currentUser?.phone || '')) ||
      (selectedUtilities && Object.keys(selectedUtilities).length > 0)
    );

    if (!hasContent) return;

    const timer = setTimeout(() => {
      try {
        const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        const draftObj = {
          propertyType,
          purpose,
          district,
          address,
          facade,
          area,
          notes,
          contactName,
          contactPhone,
          uploadedImages,
          hasAgreedDeclaration,
          title,
          price,
          deposit,
          rentDurationMonths,
          bedrooms,
          bathrooms,
          totalFloors,
          floorLevel,
          hasElevator,
          selectedPaymentMethods,
          selectedUtilities,
          minPrice,
          maxPrice,
          fee,
          inspectionDate,
          savedAt: timeStr,
        };
        safeSaveDraft(draftStorageKey, draftObj);
        setLastSavedNotice(`محفوظ تلقائياً في ${timeStr}`);
      } catch (err) {
        console.warn('Error auto-saving draft to storage', err);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [
    isEditing,
    draftStorageKey,
    propertyType,
    purpose,
    district,
    address,
    facade,
    area,
    notes,
    contactName,
    contactPhone,
    uploadedImages,
    hasAgreedDeclaration,
    title,
    price,
    deposit,
    rentDurationMonths,
    bedrooms,
    bathrooms,
    totalFloors,
    floorLevel,
    hasElevator,
    selectedPaymentMethods,
    selectedUtilities,
    minPrice,
    maxPrice,
    fee,
    inspectionDate,
    currentUser,
  ]);

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
          if (parsed.area) setArea(Number(parsed.area));
          if (parsed.price) {
            if (isOffer) setPrice(Number(parsed.price));
            else setMaxPrice(Number(parsed.price));
          }
          if (parsed.bedrooms !== undefined && parsed.bedrooms !== '') setBedrooms(Number(parsed.bedrooms));
          if (parsed.bathrooms !== undefined && parsed.bathrooms !== '') setBathrooms(Number(parsed.bathrooms));
          if (parsed.floorLevel !== undefined && parsed.floorLevel !== '') setFloorLevel(Number(parsed.floorLevel));
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
    setInvalidField(null);

    // 1. Strict Egyptian Mobile Validation (11 digits, 010/011/012/015)
    const phoneError = validateEgyptianPhone(contactPhone, 'رقم الهاتف للتواصل');
    if (phoneError) {
      setErrorMsg(`تنبيه: ${phoneError}`);
      setInvalidField('phone');
      triggerValidationToast('يرجى استيفاء البيانات المطلوبة أولاً');
      scrollToError(phoneInputRef);
      return;
    }

    const cleanContactPhone = normalizeEgyptianPhone(contactPhone);

    // 2. Area validation
    if (!area || Number(area) <= 0) {
      setErrorMsg('تنبيه: يرجى تحديد المساحة الإجمالية بالمتر المربع بشكل صحيح (أكبر من 0).');
      setInvalidField('area');
      triggerValidationToast('يرجى استيفاء البيانات المطلوبة أولاً');
      scrollToError(areaInputRef);
      return;
    }

    // 1. تجهيز الكود المعرف بنمط 'ASY-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}'
    const generatedListingId = `ASY-${Date.now().toString().substring(7)}`;
    const todayDate = new Date().toISOString().split('T')[0];

    if (isOffer) {
      if (!price || Number(price) <= 0) {
        setErrorMsg(
          isLand || purpose === 'sale'
            ? 'تنبيه: يرجى تحديد سعر البيع الإجمالي للعقار بالجنيه المصري.'
            : 'تنبيه: يرجى تحديد القيمة الإيجارية الشهرية للعقار بالجنيه المصري.'
        );
        setInvalidField('price');
        triggerValidationToast('يرجى استيفاء البيانات المطلوبة أولاً');
        scrollToError(priceInputRef);
        return;
      }

      if (!hasAgreedDeclaration) {
        setErrorMsg('تنبيه: يجب تفعيل خيار الموافقة على إقرار صحة البيانات والملكية للمتابعة.');
        setInvalidField('declaration');
        triggerValidationToast('يرجى استيفاء البيانات المطلوبة أولاً');
        scrollToError(declarationRef);
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

      const propertyPayloadToSave: Property = editingProperty
        ? {
            ...editingProperty,
            ...newListing,
            id: editingProperty.id,
            code: editingProperty.code,
            status: isAdmin ? 'approved' : 'pending',
            isApproved: isAdmin,
            adminNote: undefined,
          }
        : newListing;

      // 3. Pre-flight schema validation before sending to database
      const propValidation = validatePropertyPayload(propertyPayloadToSave);
      if (!propValidation.isValid) {
        setErrorMsg(propValidation.errorMessage || 'تنبيه: يرجى التحقق من استيفاء جميع بيانات العقار بدقة.');
        if (propValidation.field) setInvalidField(propValidation.field);
        triggerValidationToast('يرجى استيفاء البيانات المطلوبة أولاً');

        if (propValidation.field === 'phone') {
          scrollToError(phoneInputRef);
        } else if (propValidation.field === 'area') {
          scrollToError(areaInputRef);
        } else if (propValidation.field === 'price') {
          scrollToError(priceInputRef);
        } else if (propValidation.field === 'district') {
          scrollToError(districtRef);
        } else if (propValidation.field === 'propertyType') {
          scrollToError(propertyTypeRef);
        } else {
          scrollToError(bottomErrorRef);
        }
        return;
      }

      // Auto-save property owner to profiles table as 'صاحب عقار'
      dbUpsertProfile({
        fullName: propertyPayloadToSave.ownerName,
        phone: propertyPayloadToSave.ownerPhone,
        role: 'صاحب عقار',
      }).catch((e) => console.warn('Auto-save owner profile in form error:', e));

      if (editingProperty && onUpdateProperty) {
        onUpdateProperty(propertyPayloadToSave);
        setSubmittedListingId(editingProperty.code);
        setShowSuccessDialog(true);
      } else {
        if (onAddProperty) onAddProperty(propertyPayloadToSave);
        onBack();
      }
    } else {
      // Add Tenant Request (طلب عقار)
      if (!maxPrice || Number(maxPrice) <= 0) {
        setErrorMsg('تنبيه: يرجى تحديد أقصى ميزانية مقبولة لطلبك بالجنيه المصري.');
        setInvalidField('maxPrice');
        triggerValidationToast('يرجى استيفاء البيانات المطلوبة أولاً');
        scrollToError(maxPriceInputRef);
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

      const requestPayloadToSave: TenantRequest = editingTenantRequest
        ? {
            ...editingTenantRequest,
            ...newListing,
            id: editingTenantRequest.id,
            requestCode: editingTenantRequest.requestCode,
            status: 'pending_approval',
            isApproved: false,
            adminNote: undefined,
          }
        : newListing;

      // Pre-flight schema validation before sending to database
      const reqValidation = validateTenantRequestPayload(requestPayloadToSave);
      if (!reqValidation.isValid) {
        setErrorMsg(reqValidation.errorMessage || 'تنبيه: يرجى استيفاء جميع بيانات طلب العقار بشكل صحيح.');
        if (reqValidation.field) setInvalidField(reqValidation.field);
        triggerValidationToast('يرجى استيفاء البيانات المطلوبة أولاً');

        if (reqValidation.field === 'phone') {
          scrollToError(phoneInputRef);
        } else if (reqValidation.field === 'maxPrice') {
          scrollToError(maxPriceInputRef);
        } else if (reqValidation.field === 'district') {
          scrollToError(districtRef);
        } else if (reqValidation.field === 'propertyType') {
          scrollToError(propertyTypeRef);
        } else {
          scrollToError(bottomErrorRef);
        }
        return;
      }

      // Auto-save tenant to profiles table as 'مستأجر'
      dbUpsertProfile({
        fullName: requestPayloadToSave.tenantName,
        phone: requestPayloadToSave.tenantPhone,
        role: 'مستأجر',
      }).catch((e) => console.warn('Auto-save tenant profile in form error:', e));

      if (editingTenantRequest && onUpdateTenantRequest) {
        onUpdateTenantRequest(requestPayloadToSave);
        setSubmittedListingId(editingTenantRequest.requestCode || editingTenantRequest.id);
        setShowSuccessDialog(true);
      } else {
        if (onAddTenantRequest) onAddTenantRequest(requestPayloadToSave);
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
          <div className="bg-amber-50 border-2 border-amber-400 p-4 rounded-2xl text-amber-900 font-semibold space-y-2 shadow-xs animate-in fade-in">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-black text-sm text-amber-950">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>مطلوب استيفاء بيانات من إدارة التطبيق:</span>
              </div>
              <button
                type="button"
                onClick={jumpToAdminNoteTarget}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs inline-flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
              >
                <Target className="w-3.5 h-3.5" />
                <span>مكان الخطأ / المطلوب</span>
              </button>
            </div>
            <p className="text-xs text-amber-900 pr-7 font-bold">
              "{editingProperty?.adminNote || editingTenantRequest?.adminNote}"
            </p>
            <p className="text-[11px] text-amber-700 pr-7">
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

        {/* Top Error Alert */}
        {errorMsg && (
          <div 
            ref={topErrorRef}
            onClick={jumpToCurrentError}
            className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center justify-between gap-2 shadow-xs cursor-pointer hover:bg-rose-100/70 transition-all"
            title="انقر هنا للانتقال فوراً لمكان الخطأ"
          >
            <div className="flex items-center gap-2 flex-1">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                jumpToCurrentError();
              }}
              className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] shrink-0 inline-flex items-center gap-1 cursor-pointer transition-transform active:scale-95 shadow-2xs"
            >
              <Target className="w-3.5 h-3.5" />
              <span>الانتقال لمكان الخطأ</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Section 1: نوع العقار والغرض */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#002B49] flex items-center gap-2 border-b border-slate-100 pb-2">
              <Building2 className="w-4 h-4 text-[#FFB300]" />
              <span>البيانات الأساسية للعقار</span>
            </h3>

            {/* Property Type Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نوع العقار * <span className="text-slate-500 font-normal">(إجباري)</span>
              </label>
              <select
                ref={propertyTypeRef}
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
                  ref={districtRef}
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
                    ref={areaInputRef}
                    type="number"
                    value={area}
                    onChange={(e) => {
                      setArea(e.target.value ? Number(e.target.value) : '');
                      if (invalidField === 'area') setInvalidField(null);
                    }}
                    placeholder="مثال: 120"
                    required
                    className={`w-full pr-9 pl-3 py-2 rounded-xl border text-xs font-semibold focus:outline-hidden transition-all ${
                      invalidField === 'area'
                        ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-200'
                        : 'border-slate-200 bg-slate-50 focus:ring-1 focus:ring-[#002B49]'
                    }`}
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
                      ref={priceInputRef}
                      type="number"
                      value={price}
                      onChange={(e) => {
                        setPrice(e.target.value ? Number(e.target.value) : '');
                        if (invalidField === 'price') setInvalidField(null);
                      }}
                      placeholder="مثال: 3500"
                      required
                      className={`w-full pr-9 pl-3 py-2 rounded-xl border text-xs font-bold text-[#002B49] focus:outline-hidden transition-all ${
                        invalidField === 'price'
                          ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-200'
                          : 'border-slate-200 bg-slate-50 focus:ring-1 focus:ring-[#002B49]'
                      }`}
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
                    ref={maxPriceInputRef}
                    type="number"
                    value={maxPrice}
                    onChange={(e) => {
                      setMaxPrice(e.target.value ? Number(e.target.value) : '');
                      if (invalidField === 'maxPrice') setInvalidField(null);
                    }}
                    placeholder="مثال: 4500"
                    required
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold text-[#002B49] focus:outline-hidden transition-all ${
                      invalidField === 'maxPrice'
                        ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-200'
                        : 'border-slate-200 bg-slate-50 focus:ring-1 focus:ring-[#002B49]'
                    }`}
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
                        ref={floorLevelRef}
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
                    ref={contactNameInputRef}
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
                    ref={phoneInputRef}
                    type="tel"
                    dir="ltr"
                    value={contactPhone}
                    onChange={(e) => {
                      const norm = normalizeEgyptianPhone(e.target.value);
                      if (norm.length <= 11) setContactPhone(norm);
                      if (invalidField === 'phone') setInvalidField(null);
                    }}
                    placeholder="01012345678"
                    required
                    className={`w-full pr-9 pl-16 py-2 rounded-xl border text-xs font-bold text-slate-800 focus:outline-hidden text-right transition-all ${
                      invalidField === 'phone'
                        ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-200'
                        : 'border-slate-200 bg-slate-50 focus:ring-1 focus:ring-[#002B49]'
                    }`}
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
              <div ref={imagesSectionRef} className="rounded-2xl transition-all">
                <ImageUploadField
                  images={uploadedImages}
                  onChange={setUploadedImages}
                  maxImages={4}
                  maxCompressedSizeKB={250}
                />
              </div>
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
              <label 
                ref={declarationRef}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer text-xs select-none transition-all ${
                  invalidField === 'declaration'
                    ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-300 shadow-xs'
                    : 'bg-amber-50/70 border-amber-200/80 hover:bg-amber-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={hasAgreedDeclaration}
                  onChange={(e) => {
                    setHasAgreedDeclaration(e.target.checked);
                    if (invalidField === 'declaration') setInvalidField(null);
                  }}
                  className="mt-0.5 rounded text-[#002B49] focus:ring-[#002B49] w-4 h-4 cursor-pointer"
                />
                <span className="text-amber-950 font-medium leading-relaxed">
                  <strong>إقرار إجباري:</strong> أقر أنا المعلن بأنني المالك أو الوكيل الرسمي المفوض لهذا العقار، وأن جميع البيانات المدخلة صحيحة تماماً ومطابقة للمعاينة على أرض الواقع.
                </span>
              </label>
            )}
          </div>

          {/* Form Validation Summary Directly Above Submit Button */}
          {errorMsg && (
            <div 
              ref={bottomErrorRef}
              onClick={jumpToCurrentError}
              className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-400 text-rose-900 text-xs sm:text-sm font-bold flex items-start justify-between gap-3 shadow-md animate-in slide-in-from-bottom-2 duration-200 cursor-pointer hover:bg-rose-100/80 transition-all"
              title="انقر هنا للانتقال فوراً لمكان الخطأ في النموذج"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="w-8 h-8 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center shrink-0 text-rose-600 mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-1 text-right">
                  <span className="font-black text-rose-950 block text-xs sm:text-sm">
                    تنبيه بالبيانات الناقصة أو غير المستوفاة:
                  </span>
                  <p className="text-rose-700 font-semibold leading-relaxed text-xs sm:text-sm">{errorMsg}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  jumpToCurrentError();
                }}
                className="mt-0.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shrink-0 inline-flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>مكان الخطأ</span>
              </button>
            </div>
          )}

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

      {/* Floating Validation Toast Notification */}
      {toastMsg && (
        <div 
          onClick={jumpToCurrentError}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200 pointer-events-auto cursor-pointer max-w-sm w-full px-4"
          title="انقر هنا للانتقال فوراً لمكان الخطأ"
        >
          <div className="bg-[#002B49]/95 text-white p-3.5 rounded-2xl shadow-2xl border border-rose-400/40 flex items-center justify-between gap-3 backdrop-blur-md hover:bg-[#001D33] transition-all">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-rose-400" />
              </div>
              <div className="flex-1 text-right">
                <span className="text-xs sm:text-sm font-bold block text-white">{toastMsg}</span>
                <span className="text-[10px] text-amber-300 font-medium block mt-0.5">انقر هنا للدخول لمكان الخطأ فوراً</span>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                jumpToCurrentError();
              }}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <span>مكان الخطأ</span>
              <Target className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
