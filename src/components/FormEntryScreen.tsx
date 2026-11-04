import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Property, 
  PropertyPurpose, 
  PropertyUtilities, 
  TenantRequest, 
  AppUser, 
  PropertyFinishingStatus, 
  PaymentFrequency,
  LegalStatusOption,
  PropertyCategory,
  PropertyTypeItem,
  FormFieldDefinition
} from '../types/property';
import { DropdownCategory, UtilityOptionDefinition } from '../data/dropdownOptions';
import { 
  DEFAULT_PROPERTY_CATEGORIES, 
  DEFAULT_PROPERTY_TYPES, 
  APPROVED_FINISHING_STATUSES, 
  APPROVED_PAYMENT_FREQUENCIES, 
  DEFAULT_FORM_FIELD_DEFINITIONS,
  ASSIUT_DISTRICTS, 
  OTHER_DISTRICT_OPTION,
  getCategoryForType, 
  getTypesForCategory,
  hasFloorAndElevator,
  hasBedroomsAndBathrooms,
  isLandCategory,
  isFieldApplicable,
  normalizePropertyType,
  arePropertyTypesCompatible
} from '../data/propertyTaxonomy';
import { parseArabicVoiceTranscript } from '../utils/voiceParser';
import { ImageUploadField } from './ImageUploadField';
import { validateEgyptianPhone, normalizeEgyptianPhone, isValidEgyptianPhone } from '../utils/phoneValidator';
import { DEFAULT_SAKAN_PLACEHOLDER } from '../utils/constants';
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
  AlertTriangle,
  Info,
  X,
  ShieldCheck,
  Check,
  Home,
  Store,
  Briefcase,
  Warehouse,
  FileText
} from 'lucide-react';
import { RealEstateAgent, Assignment, PersonSearch } from './FlutterIcons';
import { safeStorageGetItem, safeSaveDraft, safeStorageRemoveItem } from '../utils/storageManager';
import { 
  dbSaveCustomDistrict, 
  dbFetchSystemFieldDefinitions, 
  dbFetchPropertyCategories, 
  dbFetchPropertyTypes 
} from '../lib/supabase';

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

  const draftStorageKey = isOffer ? 'asuit_form_draft_offer_v2' : 'asuit_form_draft_request_v2';

  // 1. Read saved draft with safe storage manager if not in editing mode
  const initialDraft = useMemo(() => {
    if (isEditing) return null;
    return safeStorageGetItem<any>(draftStorageKey, null);
  }, [isEditing, draftStorageKey]);

  // Initial category inference
  const initialPropertyType = editingProperty?.propertyType || editingTenantRequest?.propertyType || initialDraft?.propertyType || '';
  const initialCategoryId = editingProperty?.categoryId || editingTenantRequest?.categoryId || initialDraft?.categoryId || (initialPropertyType ? getCategoryForType(initialPropertyType).id : 'residential');

  // --- STATE VARIABLES ---
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialCategoryId);
  const [propertyType, setPropertyType] = useState<string>(initialPropertyType);
  const [purpose, setPurpose] = useState<PropertyPurpose>(
    editingProperty?.purpose || editingTenantRequest?.purpose || initialDraft?.purpose || 'rent'
  );

  // Price & Budget
  const [price, setPrice] = useState<number | ''>(
    editingProperty?.price !== undefined ? editingProperty.price : (initialDraft?.price ?? '')
  );
  const [minPrice, setMinPrice] = useState<number | ''>(
    editingTenantRequest?.minPrice !== undefined ? editingTenantRequest.minPrice : (initialDraft?.minPrice ?? '')
  );
  const [maxPrice, setMaxPrice] = useState<number | ''>(
    editingTenantRequest?.maxPrice !== undefined ? editingTenantRequest.maxPrice : (initialDraft?.maxPrice ?? '')
  );
  const [isNegotiable, setIsNegotiable] = useState<boolean>(
    editingProperty?.isNegotiable ?? initialDraft?.isNegotiable ?? false
  );
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency | string>(
    editingProperty?.paymentFrequency || editingTenantRequest?.paymentFrequency || initialDraft?.paymentFrequency || 'شهري'
  );
  const [deposit, setDeposit] = useState<number | ''>(
    editingProperty?.deposit !== undefined ? editingProperty.deposit : (initialDraft?.deposit ?? '')
  );

  // Area
  const [area, setArea] = useState<number | ''>(
    editingProperty?.area !== undefined ? editingProperty.area : (initialDraft?.area ?? '')
  );
  const [minArea, setMinArea] = useState<number | ''>(
    editingTenantRequest?.minArea !== undefined ? editingTenantRequest.minArea : (initialDraft?.minArea ?? '')
  );
  const [maxArea, setMaxArea] = useState<number | ''>(
    editingTenantRequest?.maxArea !== undefined ? editingTenantRequest.maxArea : (initialDraft?.maxArea ?? '')
  );

  // Location
  const initialDistrictValue = editingProperty?.customDistrict ? OTHER_DISTRICT_OPTION : (editingProperty?.district || editingTenantRequest?.preferredDistrict || initialDraft?.district || '');
  const [district, setDistrict] = useState<string>(initialDistrictValue);
  const [customDistrict, setCustomDistrict] = useState<string>(
    editingProperty?.customDistrict || editingTenantRequest?.customDistrict || initialDraft?.customDistrict || ''
  );
  const [preferredDistricts, setPreferredDistricts] = useState<string[]>(() => {
    if (editingTenantRequest?.preferredDistricts && editingTenantRequest.preferredDistricts.length > 0) {
      return editingTenantRequest.preferredDistricts;
    }
    if (editingTenantRequest?.preferredDistrict) {
      return [editingTenantRequest.preferredDistrict];
    }
    return initialDraft?.preferredDistricts || [];
  });
  const [address, setAddress] = useState<string>(
    editingProperty?.address || initialDraft?.address || ''
  );

  // Dynamic Categories and System Field Definitions loaded from Supabase cache
  const [categories, setCategories] = useState<PropertyCategory[]>(DEFAULT_PROPERTY_CATEGORIES);
  const [allPropertyTypes, setAllPropertyTypes] = useState<PropertyTypeItem[]>(DEFAULT_PROPERTY_TYPES);
  const [fieldDefinitions, setFieldDefinitions] = useState<FormFieldDefinition[]>(DEFAULT_FORM_FIELD_DEFINITIONS);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      dbFetchPropertyCategories(),
      dbFetchPropertyTypes(),
      dbFetchSystemFieldDefinitions(),
    ]).then(([cats, types, fields]) => {
      if (isMounted) {
        if (cats && cats.length > 0) setCategories(cats);
        if (types && types.length > 0) setAllPropertyTypes(types);
        if (fields && fields.length > 0) setFieldDefinitions(fields);
      }
    }).catch((err) => {
      console.warn('Dynamic taxonomy load notice:', err);
    });
    return () => { isMounted = false; };
  }, []);

  // Residential & Admin/Medical Core Specs
  const [bedrooms, setBedrooms] = useState<number | ''>(
    editingProperty?.bedrooms ?? editingTenantRequest?.bedrooms ?? initialDraft?.bedrooms ?? ''
  );
  const [bathrooms, setBathrooms] = useState<number | ''>(
    editingProperty?.bathrooms ?? editingTenantRequest?.bathrooms ?? initialDraft?.bathrooms ?? ''
  );
  const [floorLevel, setFloorLevel] = useState<number | ''>(
    editingProperty?.floorLevel ?? initialDraft?.floorLevel ?? ''
  );
  const [hasElevator, setHasElevator] = useState<boolean>(
    editingProperty?.hasElevator ?? initialDraft?.hasElevator ?? false
  );
  const [floorPreference, setFloorPreference] = useState<string>(
    editingTenantRequest?.floorPreference || initialDraft?.floorPreference || 'أي دور'
  );
  const [elevatorPreference, setElevatorPreference] = useState<boolean>(
    editingTenantRequest?.elevatorPreference ?? initialDraft?.elevatorPreference ?? false
  );
  const [finishingStatus, setFinishingStatus] = useState<PropertyFinishingStatus | string>(
    editingProperty?.finishingStatus || editingTenantRequest?.furnishingStatus || initialDraft?.finishingStatus || 'مشطبة'
  );

  // Specialized Fields State
  const [landType, setLandType] = useState<string>(
    editingProperty?.customFields?.landType || editingTenantRequest?.customFields?.landType || initialDraft?.customFields?.landType || 'سكنية داخل الكردون'
  );
  const [streetWidth, setStreetWidth] = useState<number | ''>(
    editingProperty?.customFields?.streetWidth || editingTenantRequest?.customFields?.streetWidth || initialDraft?.customFields?.streetWidth || ''
  );
  const [facadeWidth, setFacadeWidth] = useState<number | ''>(
    editingProperty?.customFields?.facadeWidth || (editingProperty?.facade ? Number(editingProperty.facade) : '') || (initialDraft?.customFields?.facadeWidth ?? '')
  );
  const [suitableActivity, setSuitableActivity] = useState<string>(
    editingProperty?.customFields?.suitableActivity || editingTenantRequest?.customFields?.suitableActivity || initialDraft?.customFields?.suitableActivity || 'تجاري عام'
  );
  const [hasStorageRoom, setHasStorageRoom] = useState<boolean>(
    editingProperty?.customFields?.hasStorageRoom ?? editingTenantRequest?.customFields?.hasStorageRoom ?? initialDraft?.customFields?.hasStorageRoom ?? false
  );
  const [ceilingHeight, setCeilingHeight] = useState<number | ''>(
    editingProperty?.customFields?.ceilingHeight || editingTenantRequest?.customFields?.ceilingHeight || initialDraft?.customFields?.ceilingHeight || ''
  );
  const [truckAccess, setTruckAccess] = useState<string>(
    editingProperty?.customFields?.truckAccess || editingTenantRequest?.customFields?.truckAccess || initialDraft?.customFields?.truckAccess || 'دخول تريلات ونقل ثقيل بسهولة'
  );
  const [powerCapacity, setPowerCapacity] = useState<string>(
    editingProperty?.customFields?.powerCapacity || editingTenantRequest?.customFields?.powerCapacity || initialDraft?.customFields?.powerCapacity || 'عداد صناعي 3 فاز (قوى محركة)'
  );
  const [readySetup, setReadySetup] = useState<string[]>(() => {
    const raw = editingProperty?.customFields?.readySetup || editingTenantRequest?.customFields?.readySetup || initialDraft?.customFields?.readySetup;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') return [raw];
    return [];
  });
  const [legalStatus, setLegalStatus] = useState<string>(
    editingProperty?.legalStatus || editingTenantRequest?.legalStatus || initialDraft?.legalStatus || 'مرخصة'
  );

  // Selected Utilities Map (Offer: available, Request: required)
  const [selectedUtilities, setSelectedUtilities] = useState<Record<string, string>>(() => {
    if (editingProperty?.utilities) {
      const map: Record<string, string> = {};
      Object.entries(editingProperty.utilities).forEach(([k, v]) => {
        if (v && v.available) map[k] = v.type || 'متوفر';
      });
      return map;
    }
    if (editingTenantRequest?.utilitiesRequired) {
      const map: Record<string, string> = {};
      editingTenantRequest.utilitiesRequired.forEach((k) => {
        map[k] = 'مطلوب';
      });
      return map;
    }
    return initialDraft?.selectedUtilities || {
      electricity: 'عداد كارت',
      water: 'عداد مياه مستقل',
      gas: 'غاز طبيعي',
    };
  });

  // Description & Title
  const [title, setTitle] = useState<string>(
    editingProperty?.title || initialDraft?.title || ''
  );
  const [notes, setNotes] = useState<string>(
    editingProperty?.description || editingTenantRequest?.notes || initialDraft?.notes || ''
  );

  // Images
  const [uploadedImages, setUploadedImages] = useState<string[]>(
    editingProperty?.images || editingTenantRequest?.images || initialDraft?.uploadedImages || []
  );
  const [imageUploadState, setImageUploadState] = useState({ isUploading: false, hasFailedUploads: false });

  // Contact Info (Pre-filled from currentUser)
  const defaultUserPhone = currentUser?.phone || '';
  const defaultUserName = currentUser?.name || '';
  const [contactName, setContactName] = useState<string>(
    editingProperty?.ownerName || editingTenantRequest?.tenantName || initialDraft?.contactName || defaultUserName || 'معلن العقار'
  );
  const [contactPhone, setContactPhone] = useState<string>(
    editingProperty?.contactPhone || editingProperty?.ownerPhone || editingTenantRequest?.tenantPhone || initialDraft?.contactPhone || defaultUserPhone || ''
  );
  const [whatsappPhone, setWhatsappPhone] = useState<string>(
    editingProperty?.whatsappPhone || initialDraft?.whatsappPhone || contactPhone || ''
  );
  const [isMediationRequested, setIsMediationRequested] = useState<boolean>(
    editingProperty?.isMediationRequested ?? initialDraft?.isMediationRequested ?? false
  );
  const [hasAgreedDeclaration, setHasAgreedDeclaration] = useState<boolean>(
    Boolean(editingProperty || editingTenantRequest || initialDraft?.hasAgreedDeclaration)
  );

  // Feedback, Errors, and Voice
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);

  // Refs for smooth auto-scroll to invalid fields
  const propertyTypeRef = useRef<HTMLDivElement | null>(null);
  const districtRef = useRef<HTMLDivElement | null>(null);
  const customDistrictRef = useRef<HTMLInputElement | null>(null);
  const priceRef = useRef<HTMLInputElement | null>(null);
  const areaRef = useRef<HTMLInputElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const declarationRef = useRef<HTMLLabelElement | null>(null);

  // Category switch helper
  const handleCategorySelect = (catId: string) => {
    setSelectedCategoryId(catId);
    const availableTypes = allPropertyTypes.filter((t) => t.categoryId === catId && t.isActive);
    if (availableTypes.length > 0 && !availableTypes.some((t) => t.name === propertyType)) {
      setPropertyType(availableTypes[0].name);
    }
  };

  // Keep category in sync if propertyType changes directly
  const handleTypeSelect = (typeName: string) => {
    setPropertyType(typeName);
    const matched = allPropertyTypes.find((t) => t.name === typeName);
    const catId = matched?.categoryId || getCategoryForType(typeName).id;
    if (catId !== selectedCategoryId) {
      setSelectedCategoryId(catId);
    }
    // Auto title suggestion for offers
    if (isOffer && !title) {
      setTitle(`${typeName} ${purpose === 'rent' ? 'للإيجار' : 'للبيع'} في ${district && district !== OTHER_DISTRICT_OPTION ? district : 'أسيوط'}`);
    }
  };

  // Available types for current category (dynamic or default)
  const currentCategoryTypes = useMemo(() => {
    const dynamicTypes = allPropertyTypes.filter((t) => t.categoryId === selectedCategoryId && t.isActive);
    if (dynamicTypes.length > 0) return dynamicTypes;
    return getTypesForCategory(selectedCategoryId);
  }, [allPropertyTypes, selectedCategoryId]);

  // Auto title generator
  useEffect(() => {
    if (isOffer && propertyType && district) {
      const distName = district === OTHER_DISTRICT_OPTION ? (customDistrict || 'أسيوط') : district;
      setTitle(`${propertyType} ${purpose === 'rent' ? 'للإيجار' : 'للبيع'} في ${distName}`);
    }
  }, [propertyType, purpose, district, customDistrict, isOffer]);

  // Auto-save draft
  useEffect(() => {
    if (isEditing) return;
    const draftPayload = {
      categoryId: selectedCategoryId,
      propertyType,
      purpose,
      price,
      minPrice,
      maxPrice,
      isNegotiable,
      paymentFrequency,
      deposit,
      area,
      minArea,
      maxArea,
      district,
      customDistrict,
      preferredDistricts,
      address,
      bedrooms,
      bathrooms,
      floorLevel,
      hasElevator,
      floorPreference,
      elevatorPreference,
      finishingStatus,
      selectedUtilities,
      customFields: {
        landType,
        streetWidth,
        facadeWidth,
        suitableActivity,
        hasStorageRoom,
        ceilingHeight,
        truckAccess,
        powerCapacity,
        readySetup,
      },
      legalStatus,
      title,
      notes,
      contactName,
      contactPhone,
      whatsappPhone,
      isMediationRequested,
      hasAgreedDeclaration,
      savedAt: new Date().toLocaleTimeString('ar-EG'),
    };
    safeSaveDraft(draftStorageKey, draftPayload);
  }, [
    isEditing, draftStorageKey, selectedCategoryId, propertyType, purpose,
    price, minPrice, maxPrice, isNegotiable, paymentFrequency, deposit,
    area, minArea, maxArea, district, customDistrict, preferredDistricts,
    address, bedrooms, bathrooms, floorLevel, hasElevator, floorPreference,
    elevatorPreference, finishingStatus, selectedUtilities, landType,
    streetWidth, facadeWidth, suitableActivity, hasStorageRoom, ceilingHeight,
    truckAccess, powerCapacity, readySetup, legalStatus, title, notes, contactName,
    contactPhone, whatsappPhone, isMediationRequested, hasAgreedDeclaration
  ]);

  // Calculate completion percentage
  const progressPercent = useMemo(() => {
    let score = 0;
    const maxScore = 7;
    if (selectedCategoryId) score++;
    if (propertyType) score++;
    if (district && (district !== OTHER_DISTRICT_OPTION || customDistrict.trim())) score++;
    if (isOffer ? (price !== '' && Number(price) > 0) : (maxPrice !== '' && Number(maxPrice) > 0)) score++;
    if (isOffer ? (area !== '' && Number(area) > 0) : (maxArea !== '' || minArea !== '')) score++;
    if (contactPhone && isValidEgyptianPhone(contactPhone)) score++;
    if (hasAgreedDeclaration) score++;
    return Math.round((score / maxScore) * 100);
  }, [selectedCategoryId, propertyType, district, customDistrict, isOffer, price, maxPrice, area, maxArea, minArea, contactPhone, hasAgreedDeclaration]);

  // Smooth scroll to target ref
  const scrollToRef = (ref: React.RefObject<HTMLElement | null>, fieldName: string) => {
    setInvalidField(fieldName);
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      ref.current.classList.add('ring-4', 'ring-rose-500', 'ring-offset-2', 'transition-all');
      setTimeout(() => {
        ref.current?.classList.remove('ring-4', 'ring-rose-500', 'ring-offset-2');
      }, 3000);
    }
  };

  // Toggle speech recognition
  const toggleRecording = async () => {
    if (isRecording) {
      stopVoice();
    } else {
      startVoice();
    }
  };

  const startVoice = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg('المتصفح لا يدعم التسجيل الصوتي المباشر، يمكنك الكتابة في الحقول.');
      return;
    }

    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.warn('Microphone permission check warning:', err);
        setVoiceStatus('يرجى السماح باستخدام الميكروفون من إعدادات المتصفح لبدء التحدث.');
        setIsRecording(false);
        return;
      }
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-EG';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
        setVoiceSeconds(0);
        setVoiceStatus('جاري الاستماع... تحدث بوضوح عن تفاصيل العقار أو طلبك');
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
          setVoiceSeconds((prev) => {
            if (prev >= 60) {
              stopVoice();
              return 60;
            }
            return prev + 1;
          });
        }, 1000);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript + ' ';
        }
        transcript = transcript.trim();
        if (transcript) {
          const parsed = parseArabicVoiceTranscript(
            transcript,
            DEFAULT_PROPERTY_TYPES.map((t) => t.name),
            ASSIUT_DISTRICTS
          );
          if (parsed.propertyType) handleTypeSelect(parsed.propertyType);
          if (parsed.purpose) setPurpose(parsed.purpose);
          if (parsed.district) setDistrict(parsed.district);
          if (parsed.area) {
            if (isOffer) setArea(Number(parsed.area));
            else setMaxArea(Number(parsed.area));
          }
          if (parsed.price) {
            if (isOffer) setPrice(Number(parsed.price));
            else setMaxPrice(Number(parsed.price));
          }
          if (parsed.bedrooms) setBedrooms(Number(parsed.bedrooms));
          if (parsed.bathrooms) setBathrooms(Number(parsed.bathrooms));
          if (parsed.description) setNotes(parsed.description);

          setVoiceStatus(`تم التعرف على: "${transcript.substring(0, 45)}..." وتم تعبئة الحقول تلقائياً!`);
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error === 'no-speech') {
          setVoiceStatus('في انتظار صوتك... تحدث بوضوح بالقرب من الميكروفون');
          return;
        }
        stopVoice();
        if (e.error === 'not-allowed') {
          setVoiceStatus('تم رفض إذن الميكروفون من المتصفح.');
        } else {
          setVoiceStatus('انتهت جلسة الاستماع.');
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

  // Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInvalidField(null);

    // 1. Validate Category & Property Type
    if (!propertyType) {
      setErrorMsg('يرجى اختيار نوع العقار للمتابعة.');
      scrollToRef(propertyTypeRef, 'propertyType');
      return;
    }

    // 2. Validate Location
    if (isOffer) {
      if (!district) {
        setErrorMsg('يرجى اختيار الحي أو المنطقة.');
        scrollToRef(districtRef, 'district');
        return;
      }
      if (district === OTHER_DISTRICT_OPTION && !customDistrict.trim()) {
        setErrorMsg('يرجى كتابة اسم المنطقة يدوياً.');
        scrollToRef(customDistrictRef, 'customDistrict');
        return;
      }
    } else {
      if (preferredDistricts.length === 0 && !district && !customDistrict.trim()) {
        setErrorMsg('يرجى تحديد حي واحد على الأقل للبحث.');
        scrollToRef(districtRef, 'district');
        return;
      }
      if (preferredDistricts.includes(OTHER_DISTRICT_OPTION) && !customDistrict.trim()) {
        setErrorMsg('يرجى كتابة اسم المنطقة اليدوية المطلوبة.');
        scrollToRef(customDistrictRef, 'customDistrict');
        return;
      }
    }

    // 3. Validate Price / Budget
    if (isOffer) {
      if (price === '' || Number(price) <= 0) {
        setErrorMsg('يرجى إدخال السعر بالجنيه المصري بشكل صحيح.');
        scrollToRef(priceRef, 'price');
        return;
      }
    } else {
      if (maxPrice === '' || Number(maxPrice) <= 0) {
        setErrorMsg('يرجى إدخال الحد الأقصى للميزانية المطلوبة بالجنيه المصري.');
        scrollToRef(priceRef, 'maxPrice');
        return;
      }
    }

    // 4. Validate Area
    if (isOffer) {
      if (area === '' || Number(area) <= 0) {
        setErrorMsg('يرجى إدخال المساحة الفعلية بالمتر المربع.');
        scrollToRef(areaRef, 'area');
        return;
      }
    }

    // 5. Validate Contact Phone
    const cleanPhone = contactPhone.trim();
    if (!cleanPhone || !isValidEgyptianPhone(cleanPhone)) {
      setErrorMsg('يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ (010, 011, 012, 015).');
      scrollToRef(phoneRef, 'phone');
      return;
    }

    // 6. Validate Terms Declaration
    if (!hasAgreedDeclaration) {
      setErrorMsg('يرجى الإقرار بصحة البيانات المدخلة للمتابعة.');
      scrollToRef(declarationRef, 'declaration');
      return;
    }

    // 7. Validate Image Upload Status (Strict Safety against Unuploaded/Corrupted Photos)
    if (imageUploadState.isUploading) {
      setErrorMsg('جاري استكمال رفع الصور سحابياً، يرجى الانتظار ثوانٍ حتى اكتمال الرفع قبل النشر.');
      return;
    }
    if (imageUploadState.hasFailedUploads) {
      setErrorMsg('تنبيه: يوجد صور لم تكتمل عملية رفعها السحابية بنجاح بسبب انقطاع أو ضعف الإنترنت. يرجى الضغط على "إعادة محاولة الرفع" أو حذف الصور المعلقة للمتابعة.');
      return;
    }

    // Resolved District & Multi-Districts
    const finalDistrict = isOffer
      ? (district === OTHER_DISTRICT_OPTION ? customDistrict.trim() : district)
      : (preferredDistricts.length > 0
          ? (preferredDistricts.includes(OTHER_DISTRICT_OPTION)
              ? (customDistrict.trim() || preferredDistricts.filter(d => d !== OTHER_DISTRICT_OPTION)[0] || 'أسيوط')
              : preferredDistricts[0])
          : (district === OTHER_DISTRICT_OPTION ? customDistrict.trim() : (district || 'أسيوط')));

    const finalPreferredDistricts = isOffer
      ? [finalDistrict]
      : (preferredDistricts.length > 0
          ? preferredDistricts.map(d => d === OTHER_DISTRICT_OPTION && customDistrict.trim() ? customDistrict.trim() : d)
          : [finalDistrict]);

    // Save custom district name asynchronously to Supabase for admin review
    if ((district === OTHER_DISTRICT_OPTION || preferredDistricts.includes(OTHER_DISTRICT_OPTION)) && customDistrict.trim()) {
      dbSaveCustomDistrict(customDistrict.trim(), cleanPhone);
    }

    const timestamp = new Date().toISOString().split('T')[0];

    // Build customFields payload
    const customFieldsPayload: Record<string, any> = {
      landType,
      streetWidth: streetWidth !== '' ? Number(streetWidth) : undefined,
      facadeWidth: facadeWidth !== '' ? Number(facadeWidth) : undefined,
      suitableActivity,
      hasStorageRoom,
      ceilingHeight: ceilingHeight !== '' ? Number(ceilingHeight) : undefined,
      truckAccess,
      powerCapacity,
      readySetup,
    };

    if (isOffer) {
      // Build Property Utilities
      const propUtilities: PropertyUtilities = {
        electricity: { available: Boolean(selectedUtilities['electricity']), type: selectedUtilities['electricity'] || 'عداد كارت' },
        water: { available: Boolean(selectedUtilities['water']), type: selectedUtilities['water'] || 'عداد مياه مستقل' },
        gas: { available: Boolean(selectedUtilities['gas']), type: selectedUtilities['gas'] || 'غاز طبيعي' },
        internet: { available: Boolean(selectedUtilities['internet']), type: selectedUtilities['internet'] || 'خط أرضي' },
        elevator: { available: Boolean(hasElevator), type: hasElevator ? 'أسانسير شغال' : 'بدون أسانسير' },
      };

      const finalProperty: Property = {
        id: editingProperty?.id || `prop-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        code: editingProperty?.code || `ASY-${Math.floor(100 + Math.random() * 900)}`,
        type: 'عرض',
        isApproved: editingProperty ? editingProperty.isApproved : (isAdmin || currentUser?.role === 'admin'),
        status: editingProperty ? editingProperty.status : (isAdmin ? 'approved' : 'pending_approval'),
        title: title.trim() || `${propertyType} ${purpose === 'rent' ? 'للإيجار' : 'للبيع'} في ${finalDistrict}`,
        description: notes.trim(),
        categoryId: selectedCategoryId,
        propertyType,
        purpose,
        legalStatus,
        price: Number(price),
        originalPrice: Number(price),
        isNegotiable,
        paymentFrequency: purpose === 'rent' ? paymentFrequency : undefined,
        deposit: deposit !== '' ? Number(deposit) : undefined,
        city: 'أسيوط',
        district: finalDistrict,
        customDistrict: district === OTHER_DISTRICT_OPTION ? customDistrict.trim() : undefined,
        address: address.trim() || finalDistrict,
        facade: facadeWidth !== '' ? `${facadeWidth} متر` : undefined,
        area: Number(area),
        bedrooms: bedrooms !== '' ? Number(bedrooms) : undefined,
        bathrooms: bathrooms !== '' ? Number(bathrooms) : undefined,
        floorLevel: floorLevel !== '' ? Number(floorLevel) : undefined,
        hasElevator,
        finishingStatus,
        utilities: propUtilities,
        paymentMethods: [purpose === 'rent' ? `دورية سداد ${paymentFrequency}` : 'كاش فوري'],
        customFields: customFieldsPayload,
        ownerName: contactName.trim() || defaultUserName || 'معلن العقار',
        ownerPhone: cleanPhone,
        contactPhone: cleanPhone,
        whatsappPhone: whatsappPhone.trim() || cleanPhone,
        isMediationRequested,
        source: 'إضافة مباشرة',
        images: uploadedImages.length > 0 ? uploadedImages : [DEFAULT_SAKAN_PLACEHOLDER],
        createdAt: editingProperty?.createdAt || timestamp,
        createdByAdmin: Boolean(isAdmin),
      };

      if (editingProperty && onUpdateProperty) {
        onUpdateProperty(finalProperty);
      } else if (onAddProperty) {
        onAddProperty(finalProperty);
      }
    } else {
      // Build Tenant Request
      const finalRequest: TenantRequest = {
        id: editingTenantRequest?.id || `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        requestCode: editingTenantRequest?.requestCode || `REQ-${Math.floor(100 + Math.random() * 900)}`,
        type: 'طلب',
        isApproved: editingTenantRequest ? editingTenantRequest.isApproved : (isAdmin || currentUser?.role === 'admin'),
        status: editingTenantRequest ? editingTenantRequest.status : (isAdmin ? 'approved' : 'pending_approval'),
        tenantName: contactName.trim() || defaultUserName || 'صاحب الطلب',
        tenantPhone: cleanPhone,
        categoryId: selectedCategoryId,
        preferredDistrict: finalDistrict,
        preferredDistricts: finalPreferredDistricts,
        customDistrict: (district === OTHER_DISTRICT_OPTION || preferredDistricts.includes(OTHER_DISTRICT_OPTION)) ? customDistrict.trim() : undefined,
        propertyType,
        purpose,
        legalStatus,
        minPrice: minPrice !== '' ? Number(minPrice) : undefined,
        maxPrice: Number(maxPrice),
        paymentFrequency: purpose === 'rent' ? paymentFrequency : undefined,
        minArea: minArea !== '' ? Number(minArea) : undefined,
        maxArea: maxArea !== '' ? Number(maxArea) : undefined,
        bedrooms: bedrooms !== '' ? Number(bedrooms) : undefined,
        bathrooms: bathrooms !== '' ? Number(bathrooms) : undefined,
        floorPreference: hasFloorAndElevator(selectedCategoryId, propertyType) ? floorPreference : undefined,
        elevatorPreference: hasFloorAndElevator(selectedCategoryId, propertyType) ? elevatorPreference : undefined,
        furnishingStatus: finishingStatus,
        utilitiesRequired: Object.keys(selectedUtilities),
        customFields: customFieldsPayload,
        urgency: 'immediate',
        notes: notes.trim(),
        images: uploadedImages.length > 0 ? uploadedImages : undefined,
        createdAt: editingTenantRequest?.createdAt || timestamp,
      };

      if (editingTenantRequest && onUpdateTenantRequest) {
        onUpdateTenantRequest(finalRequest);
      } else if (onAddTenantRequest) {
        onAddTenantRequest(finalRequest);
      }
    }

    // Clear saved draft on successful submission
    safeStorageRemoveItem(draftStorageKey);
    onBack();
  };

  // Section: نوع العملية (Purpose)
  const renderPurposeSection = (stepNum: number) => (
    <section className="bg-white rounded-3xl p-4 sm:p-5 border border-[#D6DEE5] shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-[#EAF3EF] text-[#124C46] flex items-center justify-center text-xs font-black">
            {stepNum}
          </span>
          <h2 className="text-sm sm:text-base font-black text-[#124C46]">نوع العملية</h2>
        </div>
        <span className="text-[11px] text-[#5D6B78] font-medium">بيع أو إيجار</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setPurpose('rent')}
          className={`py-3 px-4 rounded-2xl border font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            purpose === 'rent'
              ? 'bg-[#124C46] text-white border-[#124C46] shadow-xs'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <span>{isOffer ? 'معروض للإيجار' : 'طلب إيجار'}</span>
          {purpose === 'rent' && <Check className="w-4 h-4 text-[#D6A84F]" />}
        </button>

        <button
          type="button"
          onClick={() => setPurpose('sale')}
          className={`py-3 px-4 rounded-2xl border font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            purpose === 'sale'
              ? 'bg-[#124C46] text-white border-[#124C46] shadow-xs'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <span>{isOffer ? 'معروض للبيع' : 'طلب شراء'}</span>
          {purpose === 'sale' && <Check className="w-4 h-4 text-[#D6A84F]" />}
        </button>
      </div>
    </section>
  );

  // Section: المجموعة العقارية / (نوع العقار)
  const renderCategorySection = (stepNum: number) => (
    <section className="bg-white rounded-3xl p-4 sm:p-5 border border-[#D6DEE5] shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-[#EAF3EF] text-[#124C46] flex items-center justify-center text-xs font-black">
            {stepNum}
          </span>
          <h2 className="text-sm sm:text-base font-black text-[#124C46]">
            {isOffer ? 'المجموعة العقارية' : '(نوع العقار)'}
          </h2>
        </div>
        <span className="text-[11px] text-[#5D6B78] font-medium">اختر التصنيف الأساسي</span>
      </div>

      {/* 5 Category Selector Chips - في استمارة الطلب تظهر 4 خانات في السطر الواحد لتكون مدمجة وأنيقة */}
      <div className={!isOffer ? "grid grid-cols-4 sm:grid-cols-5 gap-1.5 sm:gap-2" : "grid grid-cols-2 sm:grid-cols-5 gap-2"}>
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategorySelect(cat.id)}
              className={`${!isOffer ? 'p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl gap-1' : 'p-3 rounded-2xl gap-1.5'} border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                isSelected
                  ? 'bg-[#124C46] text-white border-[#124C46] shadow-sm scale-[1.02]'
                  : 'bg-slate-50 hover:bg-slate-100/80 text-[#24313D] border-[#D6DEE5]'
              }`}
            >
              <div className={`${!isOffer ? 'w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl' : 'w-8 h-8 rounded-xl'} flex items-center justify-center ${
                isSelected ? 'bg-white/20 text-white' : 'bg-white text-[#124C46] border border-slate-200'
              }`}>
                {cat.id === 'residential' && <Home className={!isOffer ? "w-3.5 h-3.5 sm:w-4 sm:h-4" : "w-4 h-4"} />}
                {cat.id === 'commercial' && <Store className={!isOffer ? "w-3.5 h-3.5 sm:w-4 sm:h-4" : "w-4 h-4"} />}
                {cat.id === 'administrative_medical' && <Briefcase className={!isOffer ? "w-3.5 h-3.5 sm:w-4 sm:h-4" : "w-4 h-4"} />}
                {cat.id === 'lands' && <MapPin className={!isOffer ? "w-3.5 h-3.5 sm:w-4 sm:h-4" : "w-4 h-4"} />}
                {cat.id === 'industrial_storage' && <Warehouse className={!isOffer ? "w-3.5 h-3.5 sm:w-4 sm:h-4" : "w-4 h-4"} />}
              </div>
              <span className={`${!isOffer ? 'text-[10px] sm:text-xs' : 'text-xs'} font-bold leading-tight truncate max-w-full`}>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-Types under Selected Category */}
      <div ref={propertyTypeRef} className="pt-2">
        <label className="block text-xs font-bold text-[#5D6B78] mb-2">
          نوع الوحدة المحددة داخل ({categories.find((c) => c.id === selectedCategoryId)?.name || 'التصنيف'}):
        </label>
        <div className={!isOffer ? "grid grid-cols-4 gap-1.5 sm:gap-2" : "flex flex-wrap gap-1.5"}>
          {currentCategoryTypes.map((typeItem) => {
            const isTypeSelected = propertyType === typeItem.name;
            return (
              <button
                key={typeItem.id}
                type="button"
                onClick={() => handleTypeSelect(typeItem.name)}
                className={`${!isOffer ? 'px-1.5 py-1.5 sm:px-2.5 sm:py-2 text-[10px] sm:text-xs text-center truncate rounded-lg sm:rounded-xl' : 'px-3 py-1.5 rounded-xl text-xs'} font-bold border transition-all cursor-pointer ${
                  isTypeSelected
                    ? 'bg-[#124C46] text-white border-[#124C46] shadow-2xs scale-102'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
                title={typeItem.name}
              >
                {typeItem.name}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );

  return (
    <div className="bg-[#E8EDF1] min-h-screen pb-16 text-[#24313D] font-['Tajawal','Cairo',sans-serif] select-none" dir="rtl">
      
      {/* 1. Fixed Top AppBar - هيدر مميز وثابت لاستمارة طلب عقار */}
      <div className="sticky top-0 z-40 shadow-xs">
        <header className={
          !isOffer
            ? "bg-gradient-to-r from-[#0C3B36] via-[#124C46] to-[#1E675E] text-white border-b border-[#0A302C] px-3 sm:px-4 py-3 flex items-center justify-between"
            : "bg-white/95 backdrop-blur-md text-[#24313D] border-b border-[#D6DEE5] px-3 sm:px-4 py-3 flex items-center justify-between"
        }>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
                !isOffer
                  ? "bg-white/15 hover:bg-white/25 text-white border border-white/20 active:scale-95"
                  : "bg-slate-100 hover:bg-slate-200 text-[#124C46]"
              }`}
              title="رجوع"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div>
              {!isOffer ? (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#D6A84F] text-[#124C46] shadow-xs">
                      استمارة طلب وبحث
                    </span>
                    {isEditing && (
                      <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-full">
                        تعديل
                      </span>
                    )}
                  </div>
                  <h1 className="text-base sm:text-xl font-black text-white leading-tight font-['Tajawal','Cairo',sans-serif] mt-0.5">
                    تسجيل طلب عقار
                  </h1>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-[#EAF3EF] text-[#124C46] border-[#124C46]/20">
                      استمارة عرض وتسويق
                    </span>
                    {isEditing && (
                      <span className="text-[10px] bg-blue-50 text-blue-800 border border-blue-200 font-bold px-2 py-0.5 rounded-full">
                        تعديل
                      </span>
                    )}
                  </div>
                  <h1 className="text-base sm:text-lg font-black text-[#124C46] leading-tight">
                    {isEditing ? 'تعديل عرض العقار' : 'إضافة عرض عقار جديد'}
                  </h1>
                </div>
              )}
            </div>
          </div>

          {/* Progress & Fast Voice Assistant Button */}
          <div className="flex items-center gap-2">
            {isOffer && (
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] text-[#5D6B78] font-bold">نسبة الاكتمال</span>
                <span className="text-xs font-black text-[#124C46]">{progressPercent}%</span>
              </div>
            )}

            <button
              type="button"
              onClick={toggleRecording}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-xs ${
                isRecording 
                  ? 'bg-rose-600 text-white border-rose-700 animate-pulse' 
                  : !isOffer
                    ? 'bg-white/15 hover:bg-white/25 text-white border-white/20'
                    : 'bg-white hover:bg-[#F5F9F8] text-[#124C46] border-[#D6DEE5]'
              }`}
              title="التعبئة الصوتية الذكية"
            >
              {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className={`w-3.5 h-3.5 ${!isOffer ? 'text-[#D6A84F]' : 'text-amber-600'}`} />}
              <span className="hidden sm:inline">{isRecording ? `تسجيل (${voiceSeconds}ث)` : 'تعبئة بالصوت'}</span>
            </button>
          </div>
        </header>

        {/* 2. شريط اكتمال البيانات الثابت في الأعلى (Sticky) الخاص بطلب العقار مع النسبة المئوية في نهايته */}
        {!isOffer && (
          <div className="bg-[#E8EDF1]/95 backdrop-blur-md px-3 sm:px-4 py-2 border-b border-[#D6DEE5] shadow-xs">
            <div className="max-w-3xl mx-auto flex items-center gap-2.5 sm:gap-3">
              <div className="flex-1 bg-white rounded-full h-1.5 overflow-hidden border border-[#D6DEE5]">
                <div 
                  className="bg-gradient-to-r from-[#124C46] via-[#16856B] to-[#D6A84F] h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[11px] sm:text-xs font-black text-[#124C46] bg-white px-2 py-0.5 rounded-md border border-[#D6DEE5] shrink-0 font-['Tajawal','Cairo',sans-serif] shadow-2xs">
                %{progressPercent}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Voice Status Alert Bar */}
      {voiceStatus && (
        <div className="bg-[#124C46] text-white px-4 py-2 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">{voiceStatus}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setVoiceStatus(null)}
            className="text-white/70 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 space-y-4">

        {/* Completion Progress Bar - لعرض العقار فقط حيث يكون داخل الحاوية الأصلية */}
        {isOffer && (
          <div className="w-full bg-white rounded-full h-1.5 overflow-hidden border border-[#D6DEE5]">
            <div 
              className="bg-gradient-to-r from-[#124C46] via-[#16856B] to-[#D6A84F] h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Error Notice */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* STEP 1 & 2 حسب نوع الاستمارة:
              في طلب العقار: نوع العملية (1) ثم المجموعة العقارية بعنوان "(نوع العقار)" (2)
              في عرض العقار: المجموعة العقارية (1) ثم نوع العملية (2)
          */}
          {isOffer ? (
            <>
              {renderCategorySection(1)}
              {renderPurposeSection(2)}
            </>
          ) : (
            <>
              {renderPurposeSection(1)}
              {renderCategorySection(2)}
            </>
          )}

          {/* STEP 3: السعر والميزانية (Price & Budget) */}
          <section className="bg-white rounded-3xl p-4 sm:p-5 border border-[#D6DEE5] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#EAF3EF] text-[#124C46] flex items-center justify-center text-xs font-black">3</span>
                <h2 className="text-sm sm:text-base font-black text-[#124C46]">
                  {isOffer ? (purpose === 'rent' ? 'قيمة الإيجار ودورية السداد' : 'السعر الإجمالي للبيع') : 'الميزانية المتاحة'}
                </h2>
              </div>
              {/* حذف جملة "الجنيه المصري (ج.م)" من أعلى اليمين في استمارة طلب العقار */}
              {isOffer && (
                <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  الجنيه المصري (ج.م)
                </span>
              )}
            </div>

            {isOffer ? (
              /* OFFER: Exact Price & Negotiable Toggle */
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {purpose === 'rent' ? 'قيمة الإيجار المطلوب *' : 'السعر الإجمالي للعقار (كاش) *'}
                  </label>
                  <div className="relative">
                    <input
                      ref={priceRef}
                      type="number"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="مثال: 4500"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#124C46] text-sm font-black text-slate-900 bg-slate-50/70 focus:bg-white pl-14"
                    />
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ج.م
                    </span>
                  </div>
                </div>

                {/* دورية السداد (للإيجار فقط) */}
                {purpose === 'rent' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      دورية السداد المناسبة:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {APPROVED_PAYMENT_FREQUENCIES.map((freq) => (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => setPaymentFrequency(freq)}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            paymentFrequency === freq
                              ? 'bg-[#124C46] text-white border-[#124C46] shadow-2xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white'
                          }`}
                        >
                          {freq}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* خيار قابل للتفاوض: نعم / لا */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">السعر قابل للتفاوض البسيط؟</span>
                    <span className="text-[10px] text-slate-500">يتيح للعملاء المهتمين تقديم عروض قريبة</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsNegotiable(true)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isNegotiable ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      نعم
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsNegotiable(false)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        !isNegotiable ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      لا
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* REQUEST: Budget Range (من - إلى) - في سطر واحد بجانب بعضهما */
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      الحد الأدنى للميزانية (من):
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="مثال: 2000"
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#124C46] text-xs sm:text-sm font-black text-slate-900 bg-slate-50/70 focus:bg-white pl-10 sm:pl-14"
                      />
                      <span className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 text-[11px] sm:text-xs font-bold text-slate-400">
                        ج.م
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      الحد الأقصى للميزانية (إلى) *:
                    </label>
                    <div className="relative">
                      <input
                        ref={priceRef}
                        type="number"
                        min="0"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="مثال: 6000"
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#124C46] text-xs sm:text-sm font-black text-slate-900 bg-slate-50/70 focus:bg-white pl-10 sm:pl-14"
                      />
                      <span className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 text-[11px] sm:text-xs font-bold text-slate-400">
                        ج.م
                      </span>
                    </div>
                  </div>
                </div>

                {/* دورية الميزانية (للإيجار فقط) - مقتصرة على خيارين فقط (شهري / سنوي) في استمارة الطلب */}
                {purpose === 'rent' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      دورية سداد الميزانية المطلوبة:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['شهري', 'سنوي'].map((freq) => (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => setPaymentFrequency(freq)}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            paymentFrequency === freq
                              ? 'bg-[#124C46] text-white border-[#124C46] shadow-2xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white'
                          }`}
                        >
                          {freq}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* STEP 4: المساحة (Area in m²) */}
          <section className="bg-white rounded-3xl p-4 sm:p-5 border border-[#D6DEE5] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#EAF3EF] text-[#124C46] flex items-center justify-center text-xs font-black">4</span>
                <h2 className="text-sm sm:text-base font-black text-[#124C46]">المساحة بالمتر المربع (م²)</h2>
              </div>
              <span className="text-[11px] text-[#5D6B78] font-medium">وحدة ثابتة</span>
            </div>

            {isOffer ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  المساحة الفعلية للعقار (م²) *:
                </label>
                <div className="relative">
                  <input
                    ref={areaRef}
                    type="number"
                    min="1"
                    value={area}
                    onChange={(e) => setArea(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مثال: 120"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#124C46] text-sm font-black text-slate-900 bg-slate-50/70 focus:bg-white pl-14"
                  />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    م²
                  </span>
                </div>
              </div>
            ) : (
              /* في استمارة الطلب: الحد الأدنى وقباله الحد الأقصى في سطر واحد بجانب بعضهما */
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    الحد الأدنى للمساحة (من):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={minArea}
                      onChange={(e) => setMinArea(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="مثال: 90"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#124C46] text-xs sm:text-sm font-black text-slate-900 bg-slate-50/70 focus:bg-white pl-10 sm:pl-14"
                    />
                    <span className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 text-[11px] sm:text-xs font-bold text-slate-400">
                      م²
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    الحد الأقصى للمساحة (إلى):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={maxArea}
                      onChange={(e) => setMaxArea(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="مثال: 160"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#124C46] text-xs sm:text-sm font-black text-slate-900 bg-slate-50/70 focus:bg-white pl-10 sm:pl-14"
                    />
                    <span className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 text-[11px] sm:text-xs font-bold text-slate-400">
                      م²
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* STEP 5: الموقع والحي بأسيوط (Location & Multi-district for Requests) */}
          <section className="bg-white rounded-3xl p-4 sm:p-5 border border-[#D6DEE5] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#EAF3EF] text-[#124C46] flex items-center justify-center text-xs font-black">5</span>
                <h2 className="text-sm sm:text-base font-black text-[#124C46]">
                  {isOffer ? 'الموقع في محافظة أسيوط' : 'الأحياء والمناطق المستهدفة في أسيوط'}
                </h2>
              </div>
              <span className="text-[11px] text-[#5D6B78] font-medium">
                {isOffer ? 'حي أو منطقة واحدة' : 'تحديد متعدد مرن'}
              </span>
            </div>

            {isOffer ? (
              /* OFFER LOCATION: Single Dropdown + Custom District */
              <div ref={districtRef} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    الحي أو المنطقة للعقار المعروض *:
                  </label>
                  <select
                    value={district}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      if (e.target.value !== OTHER_DISTRICT_OPTION) {
                        setCustomDistrict('');
                      }
                    }}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#124C46] text-xs sm:text-sm font-bold text-slate-900"
                  >
                    <option value="">-- اختر الحي أو المنطقة --</option>
                    {ASSIUT_DISTRICTS.map((dist) => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                    <option value={OTHER_DISTRICT_OPTION}>-- غير ذلك (إدخال اسم المنطقة يدوياً) --</option>
                  </select>
                </div>

                {/* حقل إدخال اسم المنطقة يدوياً عند اختيار "غير ذلك" */}
                {district === OTHER_DISTRICT_OPTION && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5 animate-in fade-in">
                    <label className="block text-xs font-black text-amber-950">
                      اكتب اسم المنطقة أو القرية بالتحديد *:
                    </label>
                    <input
                      ref={customDistrictRef}
                      type="text"
                      value={customDistrict}
                      onChange={(e) => setCustomDistrict(e.target.value)}
                      placeholder="مثال: قرية بني غالب، مساكن نزلة عبد اللاه، بني حسين..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 focus:outline-hidden focus:ring-2 focus:ring-[#124C46] text-xs font-bold bg-white text-slate-900 placeholder:text-slate-400"
                    />
                    <span className="text-[10px] text-amber-800 font-medium block">
                      سيتم حفظ المنطقة تلقائياً وإتاحتها في إعلانك لمراجعتها وإضافتها للقائمة الرسمية لاحقاً.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              /* REQUEST LOCATION: Multi-Select Districts with Chips / Checkboxes */
              <div ref={districtRef} className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    اختر الأحياء المناسبة لطلبك (يمكنك اختيار أكثر من حي) *:
                  </label>
                  <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                    preferredDistricts.length > 0 
                      ? 'bg-[#EAF3EF] text-[#124C46] border border-[#124C46]/20' 
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {preferredDistricts.length > 0 ? `تم تحديد (${preferredDistricts.length}) مناطق` : 'لم يتم تحديد مناطق'}
                  </span>
                </div>

                {/* Quick actions for multi-select */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreferredDistricts([...ASSIUT_DISTRICTS])}
                    className="px-2.5 py-1 text-[11px] font-bold text-[#124C46] bg-[#EAF3EF] hover:bg-[#d5e8e1] rounded-lg transition-colors cursor-pointer"
                  >
                    تحديد جميع أحياء أسيوط
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreferredDistricts([]);
                      setCustomDistrict('');
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    مسح التحديد
                  </button>
                </div>

                {/* Multi-district Chips Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {ASSIUT_DISTRICTS.map((dist) => {
                    const isChecked = preferredDistricts.includes(dist);
                    return (
                      <button
                        key={dist}
                        type="button"
                        onClick={() => {
                          setPreferredDistricts((prev) => 
                            isChecked ? prev.filter((d) => d !== dist) : [...prev, dist]
                          );
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-right transition-all cursor-pointer flex items-center justify-between ${
                          isChecked
                            ? 'bg-[#124C46] text-white border-[#124C46] shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <span className="truncate">{dist}</span>
                        <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] shrink-0 mr-1.5 ${
                          isChecked ? 'bg-white text-[#124C46] font-black' : 'border border-slate-300 bg-white'
                        }`}>
                          {isChecked && '✓'}
                        </span>
                      </button>
                    );
                  })}

                  {/* خيار "غير ذلك" كـ Chip متعدد */}
                  <button
                    type="button"
                    onClick={() => {
                      const isOtherSelected = preferredDistricts.includes(OTHER_DISTRICT_OPTION);
                      if (isOtherSelected) {
                        setPreferredDistricts((prev) => prev.filter((d) => d !== OTHER_DISTRICT_OPTION));
                        setCustomDistrict('');
                      } else {
                        setPreferredDistricts((prev) => [...prev, OTHER_DISTRICT_OPTION]);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-right transition-all cursor-pointer flex items-center justify-between col-span-2 sm:col-span-3 ${
                      preferredDistricts.includes(OTHER_DISTRICT_OPTION)
                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                        : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100/70'
                    }`}
                  >
                    <span>-- منطقة أخرى غير موجودة بالقائمة (إدخال يدوي) --</span>
                    <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] shrink-0 mr-1.5 ${
                      preferredDistricts.includes(OTHER_DISTRICT_OPTION) ? 'bg-white text-amber-700 font-black' : 'border border-amber-300 bg-white'
                    }`}>
                      {preferredDistricts.includes(OTHER_DISTRICT_OPTION) && '✓'}
                    </span>
                  </button>
                </div>

                {/* حقل إدخال اسم المنطقة يدوياً عند تفعيل خيار "غير ذلك" في الطلب */}
                {preferredDistricts.includes(OTHER_DISTRICT_OPTION) && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5 animate-in fade-in">
                    <label className="block text-xs font-black text-amber-950">
                      اكتب اسم المنطقة أو القرية بالتحديد *:
                    </label>
                    <input
                      ref={customDistrictRef}
                      type="text"
                      value={customDistrict}
                      onChange={(e) => setCustomDistrict(e.target.value)}
                      placeholder="مثال: قرية بني غالب، مساكن نزلة عبد اللاه، بني حسين..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 focus:outline-hidden focus:ring-2 focus:ring-[#124C46] text-xs font-bold bg-white text-slate-900 placeholder:text-slate-400"
                    />
                    <span className="text-[10px] text-amber-800 font-medium block">
                      سيتم حفظ المنطقة تلقائياً مع طلبك ومراجعتها لإضافتها للقائمة الرسمية لاحقاً.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* العنوان التفصيلي الاختياري للعرض */}
            {isOffer && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  العنوان بالتفصيل (اختياري - الشارع، البرج، علامة مميزة):
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="مثال: شارع الجلاء متفرع من النميس، برج الأطباء بجوار صيدلية الإسعاف"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#124C46] text-xs font-medium text-slate-900"
                />
              </div>
            )}
          </section>

          {/* STEP 6: المواصفات المتخصصة ديناميكياً حسب نوع العقار (Specialized Specs) */}
          <section className="bg-white rounded-3xl p-4 sm:p-5 border border-[#D6DEE5] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#EAF3EF] text-[#124C46] flex items-center justify-center text-xs font-black">6</span>
                <h2 className="text-sm sm:text-base font-black text-[#124C46]">
                  مواصفات ({propertyType || 'العقار'})
                </h2>
              </div>
              <span className="text-[11px] text-[#124C46] font-bold bg-[#EAF3EF] px-2 py-0.5 rounded-full">
                حقول متخصصة تلقائياً
              </span>
            </div>

            {/* A. الغرف والحمامات (فقط للأنواع السكنية والإدارية والطبية المناسبة) */}
            {hasBedroomsAndBathrooms(selectedCategoryId, propertyType) && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {isOffer ? 'عدد الغرف الفعلي:' : 'عدد الغرف المطلوب:'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مثال: 3"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#124C46] text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {isOffer ? 'عدد الحمامات الفعلي:' : 'عدد الحمامات المطلوب:'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مثال: 2"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#124C46] text-xs font-bold text-slate-900"
                  />
                </div>
              </div>
            )}

            {/* B. الدور والأسانسير (فقط للعقارات السكنية والإدارية والتجارية، لا تظهر للأراضي) */}
            {hasFloorAndElevator(selectedCategoryId, propertyType) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {isOffer ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">الدور الفعلي للعقار:</label>
                    <input
                      type="number"
                      value={floorLevel}
                      onChange={(e) => setFloorLevel(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0 للأرضي، 1 للأول، 2 للثاني..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#124C46] text-xs font-bold text-slate-900"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">الدور المفضل:</label>
                    <select
                      value={floorPreference}
                      onChange={(e) => setFloorPreference(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#124C46] text-xs font-bold text-slate-900"
                    >
                      <option value="أي دور">أي دور متاح</option>
                      <option value="أرضي">دور أرضي</option>
                      <option value="أول أو ثان">أول أو ثان علوي</option>
                      <option value="متكرر بأسانسير">أدوار متكررة (بأسانسير)</option>
                      <option value="روف أو أخير">روف أو دور أخير</option>
                    </select>
                  </div>
                )}

                {/* الأسانسير */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-slate-800">
                    {isOffer ? 'توفر مصعد (أسانسير شغال):' : 'تفضيل وجود أسانسير:'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => isOffer ? setHasElevator(true) : setElevatorPreference(true)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        (isOffer ? hasElevator : elevatorPreference) ? 'bg-[#124C46] text-white border-[#124C46]' : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      نعم
                    </button>
                    <button
                      type="button"
                      onClick={() => isOffer ? setHasElevator(false) : setElevatorPreference(false)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        !(isOffer ? hasElevator : elevatorPreference) ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      لا يهم
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* C. حالة العقار (مشطبة، نصف تشطيب، مفروشة - الخيارات المعتمدة حصرياً) */}
            {!isLandCategory(selectedCategoryId, propertyType) && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  حالة التشطيب والفرش (الخيارات المعتمدة):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {APPROVED_FINISHING_STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setFinishingStatus(status)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                        finishingStatus === status
                          ? 'bg-[#124C46] text-white border-[#124C46] shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* D. الحقول المتخصصة للأراضي (Lands) */}
            {selectedCategoryId === 'lands' && (
              <div className="space-y-3 p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200">
                <span className="text-xs font-black text-amber-950 block">مواصفات الأرض:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">تصنيف الأرض:</label>
                    <select
                      value={landType}
                      onChange={(e) => setLandType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900"
                    >
                      <option value="سكنية داخل الكردون">سكنية داخل الكردون</option>
                      <option value="تجارية استثمارية">تجارية استثمارية</option>
                      <option value="صناعية مرخصة">صناعية مرخصة</option>
                      <option value="زراعية مسجلة">زراعية مسجلة</option>
                      <option value="صحراوية مستصلحة">صحراوية مستصلحة</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">عرض الشارع (بالمتر):</label>
                    <input
                      type="number"
                      value={streetWidth}
                      onChange={(e) => setStreetWidth(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="مثال: 12 أو 16 متر"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* E. الحقول المتخصصة للمحلات والتجاري (Commercial) */}
            {selectedCategoryId === 'commercial' && (
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-black text-[#124C46] block">مواصفات النشاط التجاري:</span>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">النشاط التجاري المناسب:</label>
                  <select
                    value={suitableActivity}
                    onChange={(e) => setSuitableActivity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900"
                  >
                    <option value="تجاري عام">تجاري عام (كافة الأنشطة)</option>
                    <option value="مطعم / كافيه">مطعم / كافيه</option>
                    <option value="صيدلية / طبي">صيدلية / نشاط طبي</option>
                    <option value="سوبر ماركت">سوبر ماركت وبقالة</option>
                    <option value="ملابس وأحذية">ملابس ومستلزمات</option>
                    <option value="معرض ومبيعات">معرض وتوزيع</option>
                  </select>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-slate-700">توفر مخزن أو صندرة ملحقة بالمحل:</span>
                  <button
                    type="button"
                    onClick={() => setHasStorageRoom(!hasStorageRoom)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      hasStorageRoom ? 'bg-[#124C46] text-white border-[#124C46]' : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {hasStorageRoom ? 'نعم متوفر' : 'غير متوفر'}
                  </button>
                </div>
              </div>
            )}

            {/* F. الحقول المتخصصة للصناعي والمخازن (Industrial & Storage) */}
            {selectedCategoryId === 'industrial_storage' && (
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-black text-[#124C46] block">مواصفات التخزين والصناعة:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ارتفاع السقف (بالمتر):</label>
                    <input
                      type="number"
                      value={ceilingHeight}
                      onChange={(e) => setCeilingHeight(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="مثال: 5 أو 6 أمتار"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">دخول سيارات النقل والتريلات:</label>
                    <select
                      value={truckAccess}
                      onChange={(e) => setTruckAccess(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900"
                    >
                      <option value="دخول تريلات ونقل ثقيل بسهولة">دخول تريلات ونقل ثقيل بسهولة</option>
                      <option value="سيارات نصف نقل وجامبو">سيارات نصف نقل وجامبو</option>
                      <option value="شارع متوسط للسيارات العادية">شارع متوسط للسيارات العادية</option>
                    </select>
                  </div>
                </div>

                {/* القدرة الكهربائية والعداد (powerCapacity) */}
                <div className="pt-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">القدرة الكهربائية والعداد (قوى محركة):</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      'عداد صناعي 3 فاز (قوى محركة)',
                      'عداد تجاري عادي',
                      'محول كهرباء خاص',
                    ].map((cap) => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => setPowerCapacity(cap)}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                          powerCapacity === cap
                            ? 'bg-[#124C46] text-white border-[#124C46] shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {cap}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* G. الحقول المتخصصة للإداري والطبي (Administrative & Medical - readySetup) */}
            {(selectedCategoryId === 'administrative_medical' || getCategoryForType(propertyType).id === 'administrative_medical') && (
              <div className="space-y-3 p-3.5 rounded-2xl bg-[#EAF3EF]/70 border border-[#124C46]/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#124C46] block">
                    {isOffer ? 'التجهيزات المتوفرة بالمقر / العيادة:' : 'التجهيزات المطلوبة للمقر / العيادة:'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">اختيار متعدد</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    'صالة انتظار عملاء',
                    'مكتب استقبال (ريسبشن)',
                    'مدخل خاص مستقل',
                    'تكييف مركزي',
                    'كاميرات مراقبة',
                    'غرفة أرشيف',
                  ].map((opt) => {
                    const isChecked = readySetup.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setReadySetup((prev) => 
                            isChecked ? prev.filter((item) => item !== opt) : [...prev, opt]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isChecked
                            ? 'bg-[#124C46] text-white border-[#124C46] shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>{opt}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-[#D6A84F]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* G. المرافق والخدمات (اختيار متعدد ديناميكي) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                {isOffer ? 'المرافق المتوفرة فعلياً:' : 'المرافق المطلوبة:'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key: 'electricity', label: 'عداد كهرباء' },
                  { key: 'water', label: 'عداد مياه' },
                  { key: 'gas', label: 'غاز طبيعي' },
                  { key: 'internet', label: 'خط أرضي / نت' },
                ].map((u) => {
                  const isChecked = Boolean(selectedUtilities[u.key]);
                  return (
                    <button
                      key={u.key}
                      type="button"
                      onClick={() => {
                        setSelectedUtilities((prev) => {
                          const updated = { ...prev };
                          if (updated[u.key]) {
                            delete updated[u.key];
                          } else {
                            updated[u.key] = 'متوفر';
                          }
                          return updated;
                        });
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                        isChecked
                          ? 'bg-[#EAF3EF] text-[#124C46] border-[#124C46]/40 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>{u.label}</span>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        isChecked ? 'bg-[#124C46] text-white' : 'border border-slate-300'
                      }`}>
                        {isChecked && '✓'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* STEP 7: الوصف والتفاصيل (Description / Notes) */}
          <section className="bg-white rounded-3xl p-4 sm:p-5 border border-[#D6DEE5] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#EAF3EF] text-[#124C46] flex items-center justify-center text-xs font-black">7</span>
                <h2 className="text-sm sm:text-base font-black text-[#124C46]">
                  {isOffer ? 'الوصف ومميزات العقار (اختياري)' : 'ملاحظات وتفاصيل الطلب (اختياري)'}
                </h2>
              </div>
              <span className="text-[11px] text-[#5D6B78] font-medium">سطور إيضاحية</span>
            </div>

            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isOffer ? "اكتب تفاصيل إضافية تبرز مميزات العقار، شروط التأمين، أو موعد المعاينة..." : "اكتب أي متطلبات خاصة بالطلب مثل القرب من جامعة أسيوط أو مستشفى معين..."}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#124C46] text-xs sm:text-sm font-medium text-slate-900 resize-none"
            />
          </section>

          {/* STEP 8: الصور (اختيارية في العرض والطلب - بدون رفع فيديو) */}
          <section className="bg-white rounded-3xl p-4 sm:p-5 border border-[#D6DEE5] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#EAF3EF] text-[#124C46] flex items-center justify-center text-xs font-black">8</span>
                <h2 className="text-sm sm:text-base font-black text-[#124C46]">
                  {isOffer ? 'صور العقار (اختيارية)' : 'صور مرجعية توضيحية (اختيارية)'}
                </h2>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {uploadedImages.length} صور
              </span>
            </div>

            <ImageUploadField
              images={uploadedImages}
              onChange={setUploadedImages}
              maxImages={8}
              onUploadStateChange={setImageUploadState}
            />
            <p className="text-[10px] text-slate-500 font-medium">
              ملاحظة: رفع الفيديو غير مدعوم داخل التطبيق للحفاظ على السرعة والخفة، ويمكن مشاركة الفيديوهات مباشرة عبر واتساب عند التواصل.
            </p>
          </section>

          {/* STEP 9: بيانات التواصل المباشر والنشر */}
          <section className="bg-white rounded-3xl p-4 sm:p-5 border border-[#D6DEE5] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#EAF3EF] text-[#124C46] flex items-center justify-center text-xs font-black">9</span>
                <h2 className="text-sm sm:text-base font-black text-[#124C46]">بيانات التواصل المباشر</h2>
              </div>
              <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                اتصال مباشر بدون وسيط
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المعلن / صاحب الإعلان:</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="الاسم"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#124C46] text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم هاتف التواصل للإعلان *:
                </label>
                <input
                  ref={phoneRef}
                  type="tel"
                  dir="ltr"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="01012345678"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#124C46] text-xs font-bold text-slate-900 text-right"
                />
                <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                  يمكنك تعديل رقم هاتف الإعلان دون التأثير على رقم حسابك الأساسي المسجل.
                </span>
              </div>
            </div>

            {/* الوساطة الاختيارية من إدارة سكن أسيوط */}
            {isOffer && (
              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMediationRequested}
                  onChange={(e) => setIsMediationRequested(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-[#124C46] focus:ring-[#124C46]"
                />
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900 block">طلب مساعدة ووساطة إدارة سكن أسيوط (اختياري)</span>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    يقوم فريقنا بالتنسيق وعرض العقار ومساعدة الطرفين في استيفاء الإجراءات بأعلى أمان.
                  </span>
                </div>
              </label>
            )}

            {/* إقرار صحة البيانات */}
            <label ref={declarationRef} className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#EAF3EF]/60 border border-[#124C46]/20 cursor-pointer">
              <input
                type="checkbox"
                checked={hasAgreedDeclaration}
                onChange={(e) => setHasAgreedDeclaration(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#124C46] focus:ring-[#124C46]"
              />
              <div className="text-right">
                <span className="text-xs font-bold text-[#124C46] block">
                  أقر بأن كافة البيانات والمواصفات المدخلة صحيحة ومطابقة للواقع بمحافظة أسيوط.
                </span>
                <span className="text-[10px] text-[#5D6B78] font-medium block">
                  أوافق على سياسة النشر ومراجعة الإعلانات الخاصة بمنظومة سكن أسيوط.
                </span>
              </div>
            </label>
          </section>

          {/* Submit Actions Button Bar */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              className="flex-1 py-3.5 px-6 rounded-2xl bg-[#124C46] hover:bg-[#0D3D38] text-white font-black text-sm sm:text-base transition-all shadow-md shadow-[#124C46]/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <CheckCircle2 className="w-5 h-5 text-[#D6A84F]" />
              <span>
                {isEditing 
                  ? 'حفظ التعديلات واعتماد الإعلان' 
                  : (isOffer ? 'نشر عرض العقار الآن' : 'تسجيل والبحث الفوري عن عروض')}
              </span>
            </button>

            <button
              type="button"
              onClick={onBack}
              className="py-3.5 px-5 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm border border-[#D6DEE5] cursor-pointer transition-all"
            >
              إلغاء
            </button>
          </div>

        </form>
      </div>

    </div>
  );
};
