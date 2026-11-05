import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Property, PropertyPurpose, PropertyUtilities, TenantRequest, AppUser } from '../types/property';
import { DropdownCategory, UtilityOptionDefinition } from '../data/dropdownOptions';
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
  Info,
  X,
  ShieldCheck,
  Home,
  Store,
  Warehouse,
  Truck,
  Check,
  Tag,
  HelpCircle,
  Layers,
  SlidersHorizontal
} from 'lucide-react';
import { RealEstateAgent, Assignment, HourglassTopRounded } from './FlutterIcons';
import { 
  validatePropertyPayload, 
  validateTenantRequestPayload, 
  dbUpsertProfile,
  dbFetchPropertyGroups,
  dbFetchPropertyTypes,
  dbFetchFormFieldDefinitions,
  dbFetchDistricts
} from '../lib/supabase';
import { safeStorageGetItem, safeSaveDraft, safeStorageRemoveItem, safeStorageSetItem } from '../utils/storageManager';
import {
  INITIAL_PROPERTY_GROUPS,
  INITIAL_PROPERTY_TYPES,
  INITIAL_FIELD_DEFINITIONS,
  FINISHING_OPTIONS,
  PAYMENT_FREQUENCIES,
  ASSIUT_DISTRICTS_LIST,
  UTILITIES_BY_GROUP,
  getGroupForPropertyType,
} from '../data/formConfig';
import { PropertyGroupId, PropertyGroupDefinition, PropertyTypeDefinition, FormFieldDefinition } from '../types/formConfig';


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

  const draftStorageKey = isOffer ? 'asuit_property_form_draft_offer_v2' : 'asuit_property_form_draft_request_v2';

  // 1. Read saved draft with safe storage manager if not in editing mode
  const initialDraft = useMemo(() => {
    if (isEditing) return null;
    return safeStorageGetItem<any>(draftStorageKey, null);
  }, [isEditing, draftStorageKey]);

  // Initial group calculation
  const initialGroupId = useMemo<PropertyGroupId>(() => {
    if (editingProperty?.propertyGroup) return editingProperty.propertyGroup as PropertyGroupId;
    if (editingTenantRequest?.propertyGroup) return editingTenantRequest.propertyGroup as PropertyGroupId;
    if (editingProperty?.propertyType) return getGroupForPropertyType(editingProperty.propertyType);
    if (editingTenantRequest?.propertyType) return getGroupForPropertyType(editingTenantRequest.propertyType);
    if (initialDraft?.selectedGroup) return initialDraft.selectedGroup;
    return 'residential';
  }, [editingProperty, editingTenantRequest, initialDraft]);

  // Dynamic Form Config (Live-synced with Admin Panel & Supabase)
  const [activeGroups, setActiveGroups] = useState<PropertyGroupDefinition[]>(() => {
    return safeStorageGetItem<PropertyGroupDefinition[]>('ardaw_dynamic_groups', INITIAL_PROPERTY_GROUPS);
  });
  const [activeTypes, setActiveTypes] = useState<PropertyTypeDefinition[]>(() => {
    return safeStorageGetItem<PropertyTypeDefinition[]>('ardaw_dynamic_types', INITIAL_PROPERTY_TYPES);
  });
  const [activeDistricts, setActiveDistricts] = useState<string[]>(() => {
    return safeStorageGetItem<string[]>('ardaw_dynamic_districts', ASSIUT_DISTRICTS_LIST);
  });
  const [activeFieldDefinitions, setActiveFieldDefinitions] = useState<FormFieldDefinition[]>(() => {
    return safeStorageGetItem<FormFieldDefinition[]>('ardaw_dynamic_fields', INITIAL_FIELD_DEFINITIONS);
  });

  useEffect(() => {
    const handler = () => {
      setActiveGroups(safeStorageGetItem<PropertyGroupDefinition[]>('ardaw_dynamic_groups', INITIAL_PROPERTY_GROUPS));
      setActiveTypes(safeStorageGetItem<PropertyTypeDefinition[]>('ardaw_dynamic_types', INITIAL_PROPERTY_TYPES));
      setActiveDistricts(safeStorageGetItem<string[]>('ardaw_dynamic_districts', ASSIUT_DISTRICTS_LIST));
      setActiveFieldDefinitions(safeStorageGetItem<FormFieldDefinition[]>('ardaw_dynamic_fields', INITIAL_FIELD_DEFINITIONS));
    };
    window.addEventListener('ardaw_form_config_updated', handler);

    // Initial background sync from Supabase
    dbFetchPropertyGroups().then((res) => {
      if (res && res.length > 0) {
        setActiveGroups(res);
        safeStorageSetItem('ardaw_dynamic_groups', res);
      }
    }).catch(() => {});

    dbFetchPropertyTypes().then((res) => {
      if (res && res.length > 0) {
        setActiveTypes(res);
        safeStorageSetItem('ardaw_dynamic_types', res);
      }
    }).catch(() => {});

    dbFetchFormFieldDefinitions().then((res) => {
      if (res && res.length > 0) {
        setActiveFieldDefinitions(res);
        safeStorageSetItem('ardaw_dynamic_fields', res);
      }
    }).catch(() => {});

    dbFetchDistricts().then((res) => {
      if (res && res.length > 0) {
        setActiveDistricts(res);
        safeStorageSetItem('ardaw_dynamic_districts', res);
      }
    }).catch(() => {});

    return () => window.removeEventListener('ardaw_form_config_updated', handler);
  }, []);

  // Group selection state
  const [selectedGroup, setSelectedGroup] = useState<PropertyGroupId>(initialGroupId);

  // Property sub-types available for current group
  const availableSubTypes = useMemo(() => {
    return activeTypes.filter((t) => ((t as any).categoryId || t.groupId) === selectedGroup && t.isActive);
  }, [selectedGroup, activeTypes]);

  // Initial type
  const initialPropertyType = useMemo(() => {
    const editType = editingProperty?.propertyType || editingTenantRequest?.propertyType || initialDraft?.propertyType;
    if (editType) return editType;
    return availableSubTypes[0]?.name || 'شقة سكنية';
  }, [editingProperty, editingTenantRequest, initialDraft, availableSubTypes]);


  // Common Form State
  const [propertyType, setPropertyType] = useState<string>(initialPropertyType);
  const [purpose, setPurpose] = useState<PropertyPurpose>(
    editingProperty?.purpose || editingTenantRequest?.purpose || (selectedGroup === 'lands' ? 'sale' : 'rent')
  );

  // Location State
  const [district, setDistrict] = useState<string>(
    editingProperty?.district || editingTenantRequest?.preferredDistrict || initialDraft?.district || ASSIUT_DISTRICTS_LIST[0]
  );
  const [customDistrict, setCustomDistrict] = useState<string>(
    editingProperty?.customDistrict || editingTenantRequest?.customDistrict || initialDraft?.customDistrict || ''
  );
  // For Request form: Multi-district support
  const [preferredDistricts, setPreferredDistricts] = useState<string[]>(() => {
    if (editingTenantRequest?.preferredDistricts && editingTenantRequest.preferredDistricts.length > 0) {
      return editingTenantRequest.preferredDistricts;
    }
    if (editingTenantRequest?.preferredDistrict) {
      return [editingTenantRequest.preferredDistrict];
    }
    if (initialDraft?.preferredDistricts) {
      return initialDraft.preferredDistricts;
    }
    return [ASSIUT_DISTRICTS_LIST[0]];
  });

  const [address, setAddress] = useState(editingProperty?.address || initialDraft?.address || '');
  const [facade, setFacade] = useState(editingProperty?.facade || initialDraft?.facade || '');
  const [legalStatus, setLegalStatus] = useState<string>(
    editingProperty?.legalStatus || editingTenantRequest?.legalStatus || initialDraft?.legalStatus || 'مرخصة'
  );

  // Price & Budget State
  const [price, setPrice] = useState<number | ''>(editingProperty ? editingProperty.price : (initialDraft?.price ?? ''));
  const [isNegotiable, setIsNegotiable] = useState<boolean>(editingProperty?.isNegotiable ?? initialDraft?.isNegotiable ?? true);
  const [paymentFrequency, setPaymentFrequency] = useState<string>(
    editingProperty?.paymentFrequency || editingTenantRequest?.paymentFrequency || initialDraft?.paymentFrequency || 'شهرياً'
  );
  const [deposit, setDeposit] = useState<number | ''>(editingProperty?.deposit ?? (initialDraft?.deposit ?? ''));
  const [rentDurationMonths, setRentDurationMonths] = useState<number | ''>(editingProperty?.rentDurationMonths ?? (initialDraft?.rentDurationMonths ?? ''));

  // Request-specific budget range
  const [minPrice, setMinPrice] = useState<number | ''>(editingTenantRequest?.minPrice ?? (initialDraft?.minPrice ?? ''));
  const [maxPrice, setMaxPrice] = useState<number | ''>(editingTenantRequest?.maxPrice ?? (initialDraft?.maxPrice ?? ''));

  // Area State
  const [area, setArea] = useState<number | ''>(
    editingProperty ? editingProperty.area : (editingTenantRequest?.maxArea || editingTenantRequest?.minArea || initialDraft?.area || '')
  );
  const [minArea, setMinArea] = useState<number | ''>(editingTenantRequest?.minArea ?? (initialDraft?.minArea ?? ''));
  const [maxArea, setMaxArea] = useState<number | ''>(editingTenantRequest?.maxArea ?? (initialDraft?.maxArea ?? ''));

  // Specialized Contextual Attributes
  const [bedrooms, setBedrooms] = useState<number | ''>(
    editingProperty?.bedrooms ?? (editingTenantRequest?.bedrooms ?? (initialDraft?.bedrooms ?? ''))
  );
  const [bathrooms, setBathrooms] = useState<number | ''>(
    editingProperty?.bathrooms ?? (editingTenantRequest?.bathrooms ?? (initialDraft?.bathrooms ?? ''))
  );
  const [floorLevel, setFloorLevel] = useState<number | ''>(editingProperty?.floorLevel ?? (initialDraft?.floorLevel ?? ''));
  const [totalFloors, setTotalFloors] = useState<number | ''>(editingProperty?.totalFloors ?? (initialDraft?.totalFloors ?? ''));
  const [hasElevator, setHasElevator] = useState<boolean>(editingProperty?.hasElevator ?? (initialDraft?.hasElevator ?? false));
  const [finishingStatus, setFinishingStatus] = useState<string>(
    editingProperty?.finishingStatus || (editingTenantRequest as any)?.furnishingStatus || initialDraft?.finishingStatus || 'مشطبة'
  );
  const [streetWidth, setStreetWidth] = useState<number | ''>(
    editingProperty?.streetWidth ?? (editingTenantRequest?.streetWidth ?? (initialDraft?.streetWidth ?? ''))
  );
  const [ceilingHeight, setCeilingHeight] = useState<number | ''>(
    editingProperty?.ceilingHeight ?? (editingTenantRequest?.ceilingHeight ?? (initialDraft?.ceilingHeight ?? ''))
  );
  const [truckAccess, setTruckAccess] = useState<boolean>(
    editingProperty?.truckAccess ?? (editingTenantRequest?.truckAccess ?? (initialDraft?.truckAccess ?? true))
  );
  const [suitableActivity, setSuitableActivity] = useState<string>(
    editingProperty?.suitableActivity || (editingTenantRequest?.suitableActivity || (initialDraft?.suitableActivity ?? ''))
  );

  // Dynamic custom fields state
  const [customFields, setCustomFields] = useState<Record<string, any>>(() => {
    return (
      (editingProperty as any)?.customFields ||
      (editingProperty?.specifications as any)?.customFields ||
      (editingTenantRequest as any)?.customFields ||
      (editingTenantRequest?.specifications as any)?.customFields ||
      initialDraft?.customFields ||
      {}
    );
  });

  const handleCustomFieldChange = (key: string, val: any) => {
    setCustomFields((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const CORE_FORM_FIELDS = useMemo(() => new Set([
    'purpose', 'propertyGroup', 'propertyType', 'district', 'price', 'area',
    'legalStatus', 'bedrooms', 'bathrooms', 'floorLevel', 'totalFloors',
    'finishingStatus', 'hasElevator', 'streetWidth', 'ceilingHeight',
    'truckAccess', 'suitableActivity', 'images', 'description', 'notes',
    'contactPhone', 'contactName', 'tenantPhone', 'tenantName', 'minPrice', 'maxPrice'
  ]), []);

  const applicableDynamicFields = useMemo(() => {
    return activeFieldDefinitions
      .filter((field) => {
        if (field.isActive === false) return false;
        if (CORE_FORM_FIELDS.has(field.fieldKey)) return false;

        // 1. Form Scope: offer / request / both
        if (isOffer && field.formScope === 'request_only') return false;
        if (!isOffer && field.formScope === 'offer_only') return false;

        // 2. Operation Scope: sale / rent / both
        if (purpose === 'sale' && field.operationScope === 'rent_only') return false;
        if (purpose === 'rent' && field.operationScope === 'sale_only') return false;

        // 3. Category / Group Scope
        const groups = (field.applicableCategories || field.applicableGroups || []);
        if (groups.length > 0 && !groups.includes('all') && !groups.includes(selectedGroup)) {
          return false;
        }

        // 4. Property Type Scope
        if (field.applicableTypes && field.applicableTypes.length > 0 && !field.applicableTypes.includes(propertyType)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const orderA = isOffer ? (a.sortOrderOffer ?? 0) : (a.sortOrderRequest ?? 0);
        const orderB = isOffer ? (b.sortOrderOffer ?? 0) : (b.sortOrderRequest ?? 0);
        return orderA - orderB;
      });
  }, [activeFieldDefinitions, isOffer, purpose, selectedGroup, propertyType, CORE_FORM_FIELDS]);

  // Group utilities selection
  const [selectedGroupUtilities, setSelectedGroupUtilities] = useState<string[]>(() => {
    if (initialDraft?.selectedGroupUtilities) return initialDraft.selectedGroupUtilities;
    return ['electricity', 'water'];
  });

  // Description / Title / Notes
  const [title, setTitle] = useState(editingProperty?.title || initialDraft?.title || '');
  const [notes, setNotes] = useState(editingProperty?.description || editingTenantRequest?.notes || initialDraft?.notes || '');

  // Contact Info (Pre-filled from currentUser)
  const [contactName, setContactName] = useState(
    editingProperty?.ownerName ||
    editingTenantRequest?.tenantName ||
    initialDraft?.contactName ||
    currentUser?.name ||
    ''
  );
  const [contactPhone, setContactPhone] = useState(
    editingProperty?.ownerPhone ||
    editingTenantRequest?.tenantPhone ||
    initialDraft?.contactPhone ||
    currentUser?.phone ||
    ''
  );

  const [uploadedImages, setUploadedImages] = useState<string[]>(editingProperty?.images || (editingTenantRequest?.images || []));
  const [hasAgreedDeclaration, setHasAgreedDeclaration] = useState(Boolean(editingProperty || isEditing));

  // Admin coordination fields
  const [fee, setFee] = useState<number | ''>(editingProperty?.fee ?? '');
  const [inspectionDate, setInspectionDate] = useState<string>(editingProperty?.inspectionDate ?? '');

  // UI / Feedback States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [submittedListingId, setSubmittedListingId] = useState('');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [lastSavedNotice, setLastSavedNotice] = useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);

  // Validation Refs for Smooth Auto-Scroll
  const propertyTypeRef = useRef<HTMLSelectElement | null>(null);
  const districtRef = useRef<HTMLSelectElement | null>(null);
  const legalStatusRef = useRef<HTMLSelectElement | null>(null);
  const areaInputRef = useRef<HTMLInputElement | null>(null);
  const priceInputRef = useRef<HTMLInputElement | null>(null);
  const maxPriceInputRef = useRef<HTMLInputElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const declarationRef = useRef<HTMLLabelElement | null>(null);
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

  // When group changes, ensure propertyType belongs to the group
  const handleGroupSelect = (newGroupId: PropertyGroupId) => {
    setSelectedGroup(newGroupId);
    const groupTypes = activeTypes.filter((t) => ((t as any).categoryId || t.groupId) === newGroupId && t.isActive);
    if (!groupTypes.some((t) => t.name === propertyType)) {
      if (groupTypes.length > 0) {
        setPropertyType(groupTypes[0].name);
      }
    }
    if (newGroupId === 'lands') {
      setPurpose('sale');
    }
  };

  // Toast / error autoscroll
  const scrollToError = (targetRef: React.RefObject<HTMLElement | null>, fieldName?: string) => {
    if (fieldName) setInvalidField(fieldName);
    setTimeout(() => {
      if (targetRef && targetRef.current) {
        targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const el = targetRef.current;
        el.classList.add('ring-4', 'ring-rose-500', 'ring-offset-2', 'transition-all');
        setTimeout(() => el.classList.remove('ring-4', 'ring-rose-500', 'ring-offset-2'), 3000);
        if ('focus' in el && typeof (el as HTMLElement).focus === 'function') {
          try { (el as HTMLElement).focus({ preventScroll: true }); } catch {}
        }
      } else if (bottomErrorRef.current) {
        bottomErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
  };

  const jumpToCurrentError = () => {
    if (invalidField === 'phone') scrollToError(phoneInputRef, 'phone');
    else if (invalidField === 'area') scrollToError(areaInputRef, 'area');
    else if (invalidField === 'price') scrollToError(priceInputRef, 'price');
    else if (invalidField === 'maxPrice') scrollToError(maxPriceInputRef, 'maxPrice');
    else if (invalidField === 'legalStatus') scrollToError(legalStatusRef, 'legalStatus');
    else if (invalidField === 'declaration') scrollToError(declarationRef, 'declaration');
    else {
      if (!contactPhone || !isValidEgyptianPhone(contactPhone)) scrollToError(phoneInputRef, 'phone');
      else if (isOffer && (!price || Number(price) <= 0)) scrollToError(priceInputRef, 'price');
      else if (!isOffer && (!maxPrice || Number(maxPrice) <= 0)) scrollToError(maxPriceInputRef, 'maxPrice');
      else if (isOffer && (!area || Number(area) <= 0)) scrollToError(areaInputRef, 'area');
      else if (topErrorRef.current) topErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Auto-save draft
  useEffect(() => {
    if (isEditing) return;

    const hasContent = Boolean(
      propertyType ||
      (area !== '' && Number(area) > 0) ||
      (price !== '' && Number(price) > 0) ||
      (maxPrice !== '' && Number(maxPrice) > 0) ||
      (contactPhone && contactPhone !== (currentUser?.phone || '')) ||
      notes?.trim()
    );

    if (!hasContent) return;

    const timer = setTimeout(() => {
      try {
        const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        const draftObj = {
          selectedGroup,
          propertyType,
          purpose,
          district,
          customDistrict,
          preferredDistricts,
          address,
          facade,
          legalStatus,
          price,
          isNegotiable,
          paymentFrequency,
          deposit,
          rentDurationMonths,
          minPrice,
          maxPrice,
          area,
          minArea,
          maxArea,
          bedrooms,
          bathrooms,
          floorLevel,
          totalFloors,
          hasElevator,
          finishingStatus,
          streetWidth,
          ceilingHeight,
          truckAccess,
          suitableActivity,
          selectedGroupUtilities,
          title,
          notes,
          contactName,
          contactPhone,
          savedAt: timeStr,
        };
        safeSaveDraft(draftStorageKey, draftObj);
        setLastSavedNotice(`محفوظ تلقائياً في ${timeStr}`);
      } catch (err) {
        console.warn('Draft save error:', err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [
    isEditing,
    draftStorageKey,
    selectedGroup,
    propertyType,
    purpose,
    district,
    customDistrict,
    preferredDistricts,
    address,
    facade,
    legalStatus,
    price,
    isNegotiable,
    paymentFrequency,
    deposit,
    rentDurationMonths,
    minPrice,
    maxPrice,
    area,
    minArea,
    maxArea,
    bedrooms,
    bathrooms,
    floorLevel,
    totalFloors,
    hasElevator,
    finishingStatus,
    streetWidth,
    ceilingHeight,
    truckAccess,
    suitableActivity,
    selectedGroupUtilities,
    title,
    notes,
    contactName,
    contactPhone,
    currentUser,
  ]);

  // Clear draft
  const handleClearDraft = () => {
    safeStorageRemoveItem(draftStorageKey);
    setLastSavedNotice(null);
    setPropertyType(availableSubTypes[0]?.name || 'شقة سكنية');
    setPrice('');
    setMinPrice('');
    setMaxPrice('');
    setArea('');
    setMinArea('');
    setMaxArea('');
    setNotes('');
    setTitle('');
    setCustomDistrict('');
    setBedrooms('');
    setBathrooms('');
    setFloorLevel('');
    setTotalFloors('');
    setHasElevator(false);
    setStreetWidth('');
    setCeilingHeight('');
    setSuitableActivity('');
    setUploadedImages([]);
    setContactName(currentUser?.name || '');
    setContactPhone(currentUser?.phone || '');
  };

  // Completion calculation
  const calculateCompletionPercentage = () => {
    let filled = 0;
    const total = isOffer ? 9 : 7;

    if (propertyType) filled++;
    if (purpose) filled++;
    if (district || preferredDistricts.length > 0) filled++;
    if (isOffer ? (price !== '' && Number(price) > 0) : (maxPrice !== '' && Number(maxPrice) > 0)) filled++;
    if (isOffer ? (area !== '' && Number(area) > 0) : (area !== '' || maxArea !== '')) filled++;
    if (contactPhone && isValidEgyptianPhone(contactPhone)) filled++;
    if (isOffer && hasAgreedDeclaration) filled++;
    if (selectedGroupUtilities.length > 0) filled++;
    if (notes.trim().length > 5 || uploadedImages.length > 0) filled++;

    return Math.min(Math.max(filled / total, 0.0), 1.0);
  };

  const progress = calculateCompletionPercentage();
  const progressPercent = Math.round(progress * 100);

  // Voice recording toggle
  const toggleRecording = () => {
    if (isRecording) stopVoice();
    else startVoice();
  };

  const startVoice = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg('المتصفح لا يدعم التسجيل الصوتي المباشر، يمكنك تعبئة الحقول يدوياً.');
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
        } catch {
          setVoiceStatus('يرجى السماح بإذن استخدام الميكروفون من إعدادات المتصفح.');
          return;
        }
      }

      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-EG';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
        setVoiceSeconds(0);
        setVoiceStatus('جاري الاستماع... تحدث بوضوح عن نوع العقار والحي والسعر');
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
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript + ' ';
        }
        const text = currentTranscript.trim();
        if (text) {
          const parsed = parseArabicVoiceTranscript(
            text,
            INITIAL_PROPERTY_TYPES.map((t) => t.name),
            ASSIUT_DISTRICTS_LIST,
            utilityDefinitions
          );
          if (parsed.propertyType) {
            setPropertyType(parsed.propertyType);
            const foundGrp = getGroupForPropertyType(parsed.propertyType);
            setSelectedGroup(foundGrp);
          }
          if (parsed.purpose) setPurpose(parsed.purpose);
          if (parsed.district) setDistrict(parsed.district);
          if (parsed.area) setArea(Number(parsed.area));
          if (parsed.price) {
            if (isOffer) setPrice(Number(parsed.price));
            else setMaxPrice(Number(parsed.price));
          }
          if (parsed.bedrooms !== undefined && parsed.bedrooms !== '') setBedrooms(Number(parsed.bedrooms));
          if (parsed.bathrooms !== undefined && parsed.bathrooms !== '') setBathrooms(Number(parsed.bathrooms));
          if (parsed.ownerPhone && isValidEgyptianPhone(parsed.ownerPhone)) setContactPhone(parsed.ownerPhone);
          if (parsed.description) setNotes(parsed.description);
          setVoiceStatus(`تم التعرف: "${text.substring(0, 40)}..."`);
        }
      };

      recognition.onerror = () => stopVoice();
      recognition.onend = () => {
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setErrorMsg('تعذر تشغيل الميكروفون.');
      setIsRecording(false);
    }
  };

  const stopVoice = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  // Form submission logic
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInvalidField(null);

    // 1. Phone validation
    const phoneError = validateEgyptianPhone(contactPhone, 'رقم الهاتف للتواصل');
    if (phoneError) {
      setErrorMsg(`تنبيه: ${phoneError}`);
      setInvalidField('phone');
      triggerValidationToast('يرجى كتابة رقم هاتف مصري صحيح يبدأ بـ 010 أو 011 أو 012 أو 015');
      scrollToError(phoneInputRef, 'phone');
      return;
    }
    const cleanContactPhone = normalizeEgyptianPhone(contactPhone);

    // Determine primary district
    const primaryDistrict = district === 'غير ذلك' ? (customDistrict.trim() || 'أسيوط') : district;

    // Generated ID
    const generatedListingId = `ASY-${Date.now().toString().substring(7)}`;
    const todayDate = new Date().toISOString().split('T')[0];

    if (isOffer) {
      // 2. Offer Area validation
      if (!area || Number(area) <= 0) {
        setErrorMsg('تنبيه: يرجى تحديد المساحة الإجمالية بالمتر المربع بشكل صحيح (أكبر من 0).');
        setInvalidField('area');
        triggerValidationToast('يرجى تحديد المساحة بالمتر المربع أولاً');
        scrollToError(areaInputRef, 'area');
        return;
      }

      // 3. Offer Price validation
      if (!price || Number(price) <= 0) {
        setErrorMsg(purpose === 'sale' ? 'تنبيه: يرجى تحديد سعر البيع الإجمالي للعقار.' : 'تنبيه: يرجى تحديد القيمة الإيجارية للعقار.');
        setInvalidField('price');
        triggerValidationToast('يرجى تحديد السعر أولاً');
        scrollToError(priceInputRef, 'price');
        return;
      }

      // 4. Offer Legal status validation
      if (!legalStatus || !legalStatus.trim()) {
        setErrorMsg('تنبيه: يرجى تحديد الموقف القانوني للعقار.');
        setInvalidField('legalStatus');
        triggerValidationToast('يرجى اختيار الموقف القانوني للعقار');
        scrollToError(legalStatusRef, 'legalStatus');
        return;
      }

      // 5. Declaration validation
      if (!hasAgreedDeclaration) {
        setErrorMsg('تنبيه: يجب تأكيد الإقرار بصحة البيانات والملكية للمتابعة.');
        setInvalidField('declaration');
        triggerValidationToast('يرجى تفعيل خيار إقرار صحة البيانات');
        scrollToError(declarationRef, 'declaration');
        return;
      }

      // Dynamic required fields validation
      for (const fld of applicableDynamicFields) {
        if (fld.isRequired) {
          const val = customFields[fld.fieldKey];
          if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
            setErrorMsg(`تنبيه: حقل "${fld.label}" حقل إلزامي مطلوب.`);
            triggerValidationToast(`يرجى استيفاء الحقل الإلزامي: ${fld.label}`);
            return;
          }
        }
      }

      // Auto title
      const finalTitle = title.trim() || `${propertyType} ${purpose === 'rent' ? 'للإيجار' : 'للبيع'} ${area} م² في ${primaryDistrict}`;

      const newListing: Property = {
        id: generatedListingId,
        code: generatedListingId,
        type: 'عرض',
        status: isAdmin ? 'approved' : 'pending_approval',
        isApproved: isAdmin,
        title: finalTitle,
        description: notes.trim() || `${propertyType} مميزة لل${purpose === 'rent' ? 'إيجار' : 'بيع'} في أسيوط - ${primaryDistrict} بمساحة ${area} م².`,
        propertyType,
        categoryId: selectedGroup,
        propertyGroup: selectedGroup,
        customFields,
        purpose,
        price: Number(price),
        isNegotiable,
        paymentFrequency: purpose === 'rent' ? paymentFrequency : undefined,
        deposit: purpose === 'rent' && deposit ? Number(deposit) : undefined,
        rentDurationMonths: purpose === 'rent' && rentDurationMonths ? Number(rentDurationMonths) : undefined,
        city: 'أسيوط',
        district: primaryDistrict,
        customDistrict: district === 'غير ذلك' ? customDistrict.trim() : undefined,
        address: address.trim() || primaryDistrict,
        facade: facade.trim() || undefined,
        area: Number(area),
        legalStatus: (legalStatus.trim() as any) || 'مرخصة',
        bedrooms: selectedGroup !== 'lands' && bedrooms !== '' ? Number(bedrooms) : undefined,
        bathrooms: selectedGroup !== 'lands' && bathrooms !== '' ? Number(bathrooms) : undefined,
        totalFloors: selectedGroup === 'residential' && totalFloors !== '' ? Number(totalFloors) : undefined,
        floorLevel: selectedGroup !== 'lands' && floorLevel !== '' ? Number(floorLevel) : undefined,
        hasElevator: selectedGroup !== 'lands' ? hasElevator : false,
        finishingStatus: selectedGroup !== 'lands' ? finishingStatus : undefined,
        streetWidth: streetWidth ? Number(streetWidth) : undefined,
        ceilingHeight: selectedGroup === 'industrial_storage' && ceilingHeight ? Number(ceilingHeight) : undefined,
        truckAccess: selectedGroup === 'industrial_storage' ? truckAccess : undefined,
        suitableActivity: suitableActivity.trim() || undefined,
        specifications: {
          groupUtilities: selectedGroupUtilities,
          selectedGroup,
          categoryId: selectedGroup,
          customFields,
        },
        utilities: {
          electricity: { available: selectedGroupUtilities.includes('electricity') || selectedGroupUtilities.includes('high_voltage'), type: 'متوفر' },
          water: { available: selectedGroupUtilities.includes('water') || selectedGroupUtilities.includes('water_grid'), type: 'متوفر' },
          gas: { available: selectedGroupUtilities.includes('gas'), type: 'متوفر' },
          internet: { available: selectedGroupUtilities.includes('internet'), type: 'متوفر' },
          elevator: { available: hasElevator, type: hasElevator ? 'يوجد أسانسير' : 'بدون أسانسير' },
        },
        paymentMethods: purpose === 'rent' ? [paymentFrequency] : ['كاش فوري'],
        ownerName: contactName.trim() || 'معلن العقار',
        ownerPhone: cleanContactPhone,
        contactPhone: cleanContactPhone,
        source: isAdmin ? 'إدارة المنظومة (نشر مباشر)' : 'مالك مباشر',
        images: uploadedImages.length > 0 ? uploadedImages : [DEFAULT_SAKAN_PLACEHOLDER],
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

      const propValidation = validatePropertyPayload(propertyPayloadToSave);
      if (!propValidation.isValid) {
        setErrorMsg(propValidation.errorMessage || 'تنبيه: يرجى التحقق من استيفاء جميع بيانات العقار بدقة.');
        if (propValidation.field) setInvalidField(propValidation.field);
        triggerValidationToast('يرجى استيفاء البيانات المطلوبة أولاً');
        return;
      }

      dbUpsertProfile({
        fullName: propertyPayloadToSave.ownerName,
        phone: propertyPayloadToSave.ownerPhone,
        role: 'صاحب عقار',
      }).catch((e) => console.warn('Auto-save owner profile notice:', e));

      if (editingProperty && onUpdateProperty) {
        onUpdateProperty(propertyPayloadToSave);
        setSubmittedListingId(editingProperty.code);
        setShowSuccessDialog(true);
      } else {
        if (onAddProperty) onAddProperty(propertyPayloadToSave);
        safeStorageRemoveItem(draftStorageKey);
        onBack();
      }
    } else {
      // Tenant Request submission (طلب عقار سريع)
      if (!maxPrice || Number(maxPrice) <= 0) {
        setErrorMsg('تنبيه: يرجى تحديد أقصى ميزانية مقبولة لطلبك بالجنيه المصري.');
        setInvalidField('maxPrice');
        triggerValidationToast('يرجى تحديد أقصى ميزانية مقبولة');
        scrollToError(maxPriceInputRef, 'maxPrice');
        return;
      }

      // Dynamic required fields validation
      for (const fld of applicableDynamicFields) {
        if (fld.isRequired) {
          const val = customFields[fld.fieldKey];
          if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
            setErrorMsg(`تنبيه: حقل "${fld.label}" حقل إلزامي مطلوب.`);
            triggerValidationToast(`يرجى استيفاء الحقل الإلزامي: ${fld.label}`);
            return;
          }
        }
      }

      const activePreferredDistricts = preferredDistricts.length > 0
        ? preferredDistricts
        : [primaryDistrict];

      const newListing: TenantRequest = {
        id: generatedListingId,
        requestCode: generatedListingId,
        type: 'طلب',
        status: isAdmin ? 'approved' : 'pending_approval',
        isApproved: isAdmin,
        tenantName: contactName.trim() || 'مواطن باحث عن عقار',
        tenantPhone: cleanContactPhone,
        propertyType,
        categoryId: selectedGroup,
        propertyGroup: selectedGroup,
        customFields,
        purpose,
        preferredDistrict: activePreferredDistricts[0] || primaryDistrict,
        preferredDistricts: activePreferredDistricts,
        customDistrict: customDistrict.trim() || undefined,
        paymentFrequency: purpose === 'rent' ? paymentFrequency : undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: Number(maxPrice),
        minArea: minArea ? Number(minArea) : (area ? Number(area) : undefined),
        maxArea: maxArea ? Number(maxArea) : (area ? Number(area) : undefined),
        bedrooms: selectedGroup !== 'lands' && bedrooms !== '' ? Number(bedrooms) : undefined,
        bathrooms: selectedGroup !== 'lands' && bathrooms !== '' ? Number(bathrooms) : undefined,
        furnishingStatus: selectedGroup !== 'lands' ? finishingStatus : undefined,
        streetWidth: streetWidth ? Number(streetWidth) : undefined,
        ceilingHeight: selectedGroup === 'industrial_storage' && ceilingHeight ? Number(ceilingHeight) : undefined,
        truckAccess: selectedGroup === 'industrial_storage' ? truckAccess : undefined,
        suitableActivity: suitableActivity.trim() || undefined,
        specifications: {
          groupUtilities: selectedGroupUtilities,
          selectedGroup,
          categoryId: selectedGroup,
          hasElevator,
          customFields,
        },
        legalStatus: legalStatus.trim() || undefined,
        notes: notes.trim(),
        images: uploadedImages,
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

      const reqValidation = validateTenantRequestPayload(requestPayloadToSave);
      if (!reqValidation.isValid) {
        setErrorMsg(reqValidation.errorMessage || 'تنبيه: يرجى استيفاء جميع بيانات طلب العقار بشكل صحيح.');
        if (reqValidation.field) setInvalidField(reqValidation.field);
        triggerValidationToast('يرجى استيفاء البيانات المطلوبة أولاً');
        return;
      }

      dbUpsertProfile({
        fullName: requestPayloadToSave.tenantName,
        phone: requestPayloadToSave.tenantPhone,
        role: 'مستأجر',
      }).catch((e) => console.warn('Auto-save tenant profile notice:', e));

      if (editingTenantRequest && onUpdateTenantRequest) {
        onUpdateTenantRequest(requestPayloadToSave);
        setSubmittedListingId(editingTenantRequest.requestCode || editingTenantRequest.id);
        setShowSuccessDialog(true);
      } else {
        if (onAddTenantRequest) onAddTenantRequest(requestPayloadToSave);
        safeStorageRemoveItem(draftStorageKey);
        onBack();
      }
    }
  };

  // Field Info Tooltip Component
  const FieldInfoTooltip: React.FC<{ fieldKey: string; title: string; hint: string }> = ({
    fieldKey,
    title,
    hint,
  }) => {
    const isOpen = activeTooltip === fieldKey;
    return (
      <span className="relative inline-flex items-center align-middle mx-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setActiveTooltip(isOpen ? null : fieldKey);
          }}
          className={`w-4 h-4 rounded-full inline-flex items-center justify-center transition-all cursor-pointer ${
            isOpen ? 'bg-amber-500 text-white shadow-xs scale-110' : 'text-slate-400 hover:text-amber-600'
          }`}
          title={`توضيح ${title}`}
        >
          <Info className="w-3 h-3 shrink-0" />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setActiveTooltip(null)} />
            <div
              className="absolute z-50 right-0 top-full mt-2 w-64 p-3 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-amber-400/40 text-[11px] leading-relaxed text-right select-none animate-in fade-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>أهمية {title}</span>
                </span>
                <button type="button" onClick={() => setActiveTooltip(null)} className="text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-slate-200">{hint}</p>
            </div>
          </>
        )}
      </span>
    );
  };

  // Group Icon helper
  const renderGroupIcon = (groupId: PropertyGroupId, className = 'w-5 h-5') => {
    switch (groupId) {
      case 'residential':
        return <Home className={className} />;
      case 'commercial':
        return <Store className={className} />;
      case 'admin_medical':
        return <Building2 className={className} />;
      case 'lands':
        return <MapPin className={className} />;
      case 'industrial_storage':
        return <Warehouse className={className} />;
      default:
        return <Building2 className={className} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#E8EDF1] pb-28 text-[#24313D] animate-in fade-in duration-150">
      {/* AppBar */}
      <header className="sticky top-0 z-30 bg-[#124C46] text-white shadow-md">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-white cursor-pointer"
            title="رجوع"
          >
            <ArrowRight className="w-6 h-6" />
          </button>

          <div className="text-center">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
              {isEditing
                ? editingProperty
                  ? `تعديل عرض العقار (${editingProperty.code})`
                  : `تعديل طلب العقار (${editingTenantRequest?.requestCode || editingTenantRequest?.id})`
                : isOffer
                ? 'إضافة عرض عقار (متاح)'
                : 'إضافة طلب عقار (مطلوب)'}
            </h1>
            <p className="text-[11px] text-[#D6A84F] font-semibold">
              {isOffer
                ? 'استمارة عرض تسويقي متكامل لملاك ووسطاء العقارات'
                : 'استمارة سريعة للمشترين والمستأجرين (في أقل من دقيقة)'}
            </p>
          </div>

          <div className="w-10 flex items-center justify-center">
            {isOffer ? (
              <RealEstateAgent className="w-6 h-6 text-[#D6A84F]" />
            ) : (
              <Assignment className="w-6 h-6 text-[#D6A84F]" />
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Admin note banner if editing */}
        {(editingProperty?.adminNote || editingTenantRequest?.adminNote) && (
          <div className="bg-amber-50 border-2 border-amber-400 p-4 rounded-2xl text-amber-900 font-semibold space-y-1 shadow-xs">
            <div className="flex items-center gap-2 font-black text-sm text-amber-950">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>ملاحظة إدارة التطبيق لاستيفاء الإعلان:</span>
            </div>
            <p className="text-xs text-amber-900 font-bold pr-7">
              "{editingProperty?.adminNote || editingTenantRequest?.adminNote}"
            </p>
          </div>
        )}

        {/* Progress & Auto-save card */}
        <div className="bg-[#124C46] text-white p-4 rounded-2xl shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 55 55">
                <circle cx="27.5" cy="27.5" r="22" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="5" />
                <circle
                  cx="27.5"
                  cy="27.5"
                  r="22"
                  fill="none"
                  stroke="#D6A84F"
                  strokeWidth="5"
                  strokeDasharray={2 * Math.PI * 22}
                  strokeDashoffset={2 * Math.PI * 22 * (1 - progress)}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                {progressPercent}%
              </span>
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">
                {isOffer ? 'اكتمال بيانات العرض' : 'اكتمال بيانات الطلب السريع'}
              </h4>
              <p className="text-[10px] text-white/70">
                {lastSavedNotice || (isOffer ? 'كلما زادت التفاصيل زادت سرعة المطابقة' : 'تسجيل مبسط لا يتجاوز دقيقة')}
              </p>
            </div>
          </div>

          {!isEditing && (
            <button
              type="button"
              onClick={handleClearDraft}
              className="text-[11px] text-[#D6A84F] hover:text-white px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 transition-all font-semibold"
            >
              مسح والبدء من جديد
            </button>
          )}
        </div>

        {/* Smart Voice Input Bar */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={toggleRecording}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
              title="تحدث لتعبئة النموذج صوتياً"
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-[#124C46]" />}
            </button>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 block">المساعد الصوتي الذكي</span>
              <p className="text-[11px] text-slate-500 truncate">
                {voiceStatus || 'اضغط وتحدث بصوتك (مثال: شقة للإيجار 120م بالهلالي)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleRecording}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#124C46] text-white hover:bg-[#0D3D38] shrink-0"
          >
            {isRecording ? `إيقاف (${voiceSeconds}ث)` : 'تحدث الآن 🎙️'}
          </button>
        </div>

        {/* Top Error Alert */}
        {errorMsg && (
          <div
            ref={topErrorRef}
            onClick={jumpToCurrentError}
            className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center justify-between gap-2 shadow-xs cursor-pointer hover:bg-rose-100/70"
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
              className="px-2.5 py-1 rounded-xl bg-rose-600 text-white font-bold text-[11px] inline-flex items-center gap-1"
            >
              <Target className="w-3.5 h-3.5" />
              <span>تصحيح</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* ============================================================== */}
          {/* 1. المجموعة العقارية والنوع الفرعي (5 Groups Architecture) */}
          {/* ============================================================== */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-[#124C46] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#D6A84F]" />
                <span>تصنيف ونوع العقار</span>
              </h3>
              <span className="text-[10px] bg-emerald-50 text-[#124C46] px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                5 مجموعات رئيسية
              </span>
            </div>

            {/* Group Selector Cards */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                اختر المجموعة العقارية:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {activeGroups.filter((g) => g.isActive).map((grp) => {
                  const isSelected = selectedGroup === grp.id;
                  return (
                    <button
                      type="button"
                      key={grp.id}
                      onClick={() => handleGroupSelect(grp.id as PropertyGroupId)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#124C46] text-white border-[#124C46] shadow-sm ring-2 ring-[#D6A84F]/40 scale-[1.02]'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/15 text-[#D6A84F]' : 'bg-white text-[#124C46] shadow-2xs'}`}>
                        {renderGroupIcon(grp.id as PropertyGroupId, 'w-4 h-4')}
                      </div>
                      <span className="text-xs font-bold">{grp.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub-Type Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                <span>نوع العقار الفرعي *</span>
                <FieldInfoTooltip
                  fieldKey="propertyType"
                  title="النوع الفرعي"
                  hint="تحديد نوع الوحدة بدقة ضمن المجموعة يضمن دقة المطابقة الذكية بنسبة 100% وتفادي الطلبات غير المتوافقة."
                />
              </label>
              <select
                ref={propertyTypeRef}
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-[#124C46] focus:outline-hidden focus:ring-1 focus:ring-[#124C46] transition-all cursor-pointer"
              >
                {availableSubTypes.map((st) => (
                  <option key={st.id} value={st.name}>
                    {st.name} — {st.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Operation Selector (إيجار / بيع / شراء) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center">
                <span>نوع العملية</span>
                <FieldInfoTooltip
                  fieldKey="purpose"
                  title="نوع العملية"
                  hint="يحدد النظام ترشيح العروض المتطابقة مع غرضك مباشرة (إيجار أو تمليك)."
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPurpose('rent')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                    purpose === 'rent'
                      ? 'bg-[#124C46] text-[#D6A84F] border-[#124C46] shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {isOffer ? 'إيجار' : 'طلب إيجار'}
                </button>
                <button
                  type="button"
                  onClick={() => setPurpose('sale')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                    purpose === 'sale'
                      ? 'bg-[#124C46] text-[#D6A84F] border-[#124C46] shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {isOffer ? 'بيع وتمليك' : 'طلب شراء وتمليك'}
                </button>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* 2. السعر والميزانية (Offer Single Price vs Request Budget Range) */}
          {/* ============================================================== */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#124C46] flex items-center gap-2 border-b border-slate-100 pb-2">
              <DollarSign className="w-4 h-4 text-[#D6A84F]" />
              <span>{isOffer ? 'السعر والشروط المالية' : 'الميزانية المستهدفة'}</span>
            </h3>

            {isOffer ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Single Exact Price */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                      <span>{purpose === 'sale' ? 'سعر البيع الإجمالي (ج.م) *' : 'القيمة الإيجارية (ج.م) *'}</span>
                      <FieldInfoTooltip
                        fieldKey="price"
                        title="السعر"
                        hint="أدخل السعر الإجمالي بالجنيه المصري بدقة، حيث يعتمد محرك الفرز على هذه القيمة."
                      />
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
                        placeholder="مثال: 5000"
                        required
                        className={`w-full pr-9 pl-3 py-2 rounded-xl border text-xs font-bold text-[#124C46] transition-all ${
                          invalidField === 'price'
                            ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-200'
                            : 'border-slate-200 bg-slate-50 focus:ring-1 focus:ring-[#124C46]'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Payment Frequency (if rent) */}
                  {purpose === 'rent' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">دورية السداد</label>
                      <select
                        value={paymentFrequency}
                        onChange={(e) => setPaymentFrequency(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800"
                      >
                        {PAYMENT_FREQUENCIES.map((freq) => (
                          <option key={freq.id} value={freq.label}>
                            {freq.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">طريقة السداد</label>
                      <div className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-xs text-slate-700 font-semibold">
                        كاش فوري عند التنازل
                      </div>
                    </div>
                  )}
                </div>

                {/* Negotiable Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-slate-700">هل السعر قابل للتفاوض؟</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsNegotiable(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isNegotiable ? 'bg-[#124C46] text-[#D6A84F] shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      قابل للتفاوض
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsNegotiable(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        !isNegotiable ? 'bg-[#124C46] text-[#D6A84F] shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      سعر نهائي
                    </button>
                  </div>
                </div>

                {/* Deposit if rent */}
                {purpose === 'rent' && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ التأمين (ج.م) - اختياري</label>
                      <input
                        type="number"
                        value={deposit}
                        onChange={(e) => setDeposit(e.target.value ? Number(e.target.value) : '')}
                        placeholder="مثال: 5000"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">مدة الإيجار المقترحة (شهر)</label>
                      <input
                        type="number"
                        value={rentDurationMonths}
                        onChange={(e) => setRentDurationMonths(e.target.value ? Number(e.target.value) : '')}
                        placeholder="12 شهر"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Request: Budget Range */
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الحد الأدنى للميزانية (ج.م) - اختياري</label>
                    <input
                      type="number"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : '')}
                      placeholder="مثال: 3000"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                      <span>أقصى ميزانية مقبولة (ج.م) *</span>
                      <FieldInfoTooltip
                        fieldKey="maxPrice"
                        title="أقصى ميزانية"
                        hint="سقف الميزانية هو المعيار الرئيسي لعرض العقارات المتوافقة مع إمكانياتك المالية."
                      />
                    </label>
                    <input
                      ref={maxPriceInputRef}
                      type="number"
                      value={maxPrice}
                      onChange={(e) => {
                        setMaxPrice(e.target.value ? Number(e.target.value) : '');
                        if (invalidField === 'maxPrice') setInvalidField(null);
                      }}
                      placeholder="مثال: 6000"
                      required
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold text-[#124C46] transition-all ${
                        invalidField === 'maxPrice'
                          ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-200'
                          : 'border-slate-200 bg-slate-50 focus:ring-1 focus:ring-[#124C46]'
                      }`}
                    />
                  </div>
                </div>

                {purpose === 'rent' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">دورية السداد المفضلة</label>
                    <div className="flex flex-wrap gap-2">
                      {PAYMENT_FREQUENCIES.map((freq) => (
                        <button
                          type="button"
                          key={freq.id}
                          onClick={() => setPaymentFrequency(freq.label)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            paymentFrequency === freq.label
                              ? 'bg-[#124C46] text-[#D6A84F] border-[#124C46]'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {freq.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* 3. المساحة والموقع (Exact Area in Offer vs Range in Request) */}
          {/* ============================================================== */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#124C46] flex items-center gap-2 border-b border-slate-100 pb-2">
              <MapPin className="w-4 h-4 text-[#D6A84F]" />
              <span>المساحة والموقع بأسيوط</span>
            </h3>

            {/* Area Section */}
            {isOffer ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                  <span>المساحة الإجمالية (م²) *</span>
                  <FieldInfoTooltip
                    fieldKey="area"
                    title="المساحة"
                    hint="أدخل المساحة الفعلية للوحدة بالمتر المربع دون مبالغة لتسهيل المطابقة."
                  />
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
                    placeholder="مثال: 125"
                    required
                    className={`w-full pr-9 pl-3 py-2 rounded-xl border text-xs font-bold text-[#124C46] transition-all ${
                      invalidField === 'area'
                        ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-200'
                        : 'border-slate-200 bg-slate-50 focus:ring-1 focus:ring-[#124C46]'
                    }`}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الحد الأدنى للمساحة (م²)</label>
                  <input
                    type="number"
                    value={minArea}
                    onChange={(e) => setMinArea(e.target.value ? Number(e.target.value) : '')}
                    placeholder="مثال: 80"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">أقصى مساحة مقبولة (م²)</label>
                  <input
                    type="number"
                    value={maxArea}
                    onChange={(e) => setMaxArea(e.target.value ? Number(e.target.value) : '')}
                    placeholder="مثال: 160"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
                  />
                </div>
              </div>
            )}

            {/* Location Section */}
            {isOffer ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                    <span>المنطقة / الحي بأسيوط *</span>
                    <FieldInfoTooltip
                      fieldKey="district"
                      title="الحي"
                      hint="اختر أقرب حي من القائمة أو حدد 'غير ذلك' لإدخال اسم المنطقة يدوياً."
                    />
                  </label>
                  <select
                    ref={districtRef}
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-hidden"
                  >
                    {activeDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                    <option value="غير ذلك">غير ذلك (كتابة اسم المنطقة يدوياً)</option>
                  </select>
                </div>

                {district === 'غير ذلك' && (
                  <div className="animate-in fade-in">
                    <label className="block text-xs font-bold text-amber-800 mb-1">اسم المنطقة / الحي المحدد:</label>
                    <input
                      type="text"
                      value={customDistrict}
                      onChange={(e) => setCustomDistrict(e.target.value)}
                      placeholder="مثال: قرية بني غالب، أو عزبة السجن..."
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-amber-50/50 text-xs font-bold text-[#124C46]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">العنوان التفصيلي أو الشارع</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="مثال: متفرع من شارع الجمهورية أمام مدرسة..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
                  />
                </div>
              </div>
            ) : (
              /* Request: Multi-district selection */
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                    <span>المناطق المفضلة بأسيوط (اختر واحداً أو أكثر) *</span>
                    <FieldInfoTooltip
                      fieldKey="preferredDistricts"
                      title="المناطق المفضلة"
                      hint="يمكنك اختيار حي واحد أو عدة أحياء ترغب في السكن أو النشاط فيها."
                    />
                  </label>

                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {activeDistricts.map((dist) => {
                      const isSelected = preferredDistricts.includes(dist);
                      return (
                        <button
                          type="button"
                          key={dist}
                          onClick={() => {
                            if (isSelected) {
                              if (preferredDistricts.length > 1) {
                                setPreferredDistricts((prev) => prev.filter((d) => d !== dist));
                              }
                            } else {
                              setPreferredDistricts((prev) => [...prev, dist]);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#124C46] text-[#D6A84F] shadow-2xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 inline-block ml-1" />}
                          {dist}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customDistrict}
                    onChange={(e) => setCustomDistrict(e.target.value)}
                    placeholder="منطقة أخرى لم تذكر في القائمة (اختياري)..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* 4. المواصفات المتخصصة حسب المجموعة (Contextual Fields) */}
          {/* ============================================================== */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#124C46] flex items-center gap-2 border-b border-slate-100 pb-2">
              <Tag className="w-4 h-4 text-[#D6A84F]" />
              <span>
                مواصفات خاصة بـ ({activeGroups.find((g) => g.id === selectedGroup)?.name || 'العقار'})
              </span>
            </h3>

            {/* 4A. Residential & Admin/Medical */}
            {(selectedGroup === 'residential' || selectedGroup === 'admin_medical') && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Bed className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedGroup === 'admin_medical' ? 'عدد المكاتب' : 'عدد الغرف'}</span>
                    </label>
                    <input
                      type="number"
                      value={bedrooms}
                      onChange={(e) => setBedrooms(e.target.value ? Number(e.target.value) : '')}
                      placeholder="مثال: 3"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Bath className="w-3.5 h-3.5 text-slate-400" />
                      <span>عدد الحمامات</span>
                    </label>
                    <input
                      type="number"
                      value={bathrooms}
                      onChange={(e) => setBathrooms(e.target.value ? Number(e.target.value) : '')}
                      placeholder="مثال: 1"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم الطابق</label>
                    <input
                      type="number"
                      value={floorLevel}
                      onChange={(e) => setFloorLevel(e.target.value ? Number(e.target.value) : '')}
                      placeholder="مثال: 2"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
                    />
                  </div>

                  {isOffer && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">إجمالي الأدوار</label>
                      <input
                        type="number"
                        value={totalFloors}
                        onChange={(e) => setTotalFloors(e.target.value ? Number(e.target.value) : '')}
                        placeholder="مثال: 6"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
                      />
                    </div>
                  )}
                </div>

                {/* Finishing Status (Strictly the 3 requested options: مشطبة، نصف تشطيب، مفروشة) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">حالة التشطيب والفرش</label>
                  <div className="grid grid-cols-3 gap-2">
                    {FINISHING_OPTIONS.map((fOpt) => (
                      <button
                        type="button"
                        key={fOpt}
                        onClick={() => setFinishingStatus(fOpt)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                          finishingStatus === fOpt
                            ? 'bg-[#124C46] text-[#D6A84F] border-[#124C46] shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {fOpt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Elevator Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-slate-700">توفر مصعد (أسانسير) بالعمارة:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setHasElevator(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        hasElevator ? 'bg-[#124C46] text-[#D6A84F]' : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      يوجد أسانسير
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasElevator(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        !hasElevator ? 'bg-[#124C46] text-[#D6A84F]' : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      بدون أسانسير
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4B. Commercial */}
            {selectedGroup === 'commercial' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">عرض واجهة المحل (بالمتر)</label>
                    <input
                      type="text"
                      value={facade}
                      onChange={(e) => setFacade(e.target.value)}
                      placeholder="مثال: واجهة 6 متر زجاجية"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">النشاط المناسب أو القائم</label>
                    <input
                      type="text"
                      value={suitableActivity}
                      onChange={(e) => setSuitableActivity(e.target.value)}
                      placeholder="مثال: صيدلية، كافيه، مطعم، تجارة ملابس..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">حالة التجهيز</label>
                  <div className="grid grid-cols-3 gap-2">
                    {FINISHING_OPTIONS.map((fOpt) => (
                      <button
                        type="button"
                        key={fOpt}
                        onClick={() => setFinishingStatus(fOpt)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                          finishingStatus === fOpt
                            ? 'bg-[#124C46] text-[#D6A84F] border-[#124C46]'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {fOpt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4C. Lands (Strictly NO rooms, bathrooms, elevator, floors, finishing) */}
            {selectedGroup === 'lands' && (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                  <strong>مواصفات الأراضي:</strong> تم استبعاد حقول المباني والغرف والتشطيب تلقائياً.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">عرض الشارع أمام الأرض (متر)</label>
                    <input
                      type="number"
                      value={streetWidth}
                      onChange={(e) => setStreetWidth(e.target.value ? Number(e.target.value) : '')}
                      placeholder="مثال: 16 متر"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">واجهة الأرض واتجاهها</label>
                    <input
                      type="text"
                      value={facade}
                      onChange={(e) => setFacade(e.target.value)}
                      placeholder="مثال: بحرية واجهة 14م على الشارع"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4D. Industrial & Storage */}
            {selectedGroup === 'industrial_storage' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ارتفاع السقف (صافي بالمتر)</label>
                    <input
                      type="number"
                      value={ceilingHeight}
                      onChange={(e) => setCeilingHeight(e.target.value ? Number(e.target.value) : '')}
                      placeholder="مثال: 5.5 متر"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">النشاط المستهدف للمخزن / المنشأة</label>
                    <input
                      type="text"
                      value={suitableActivity}
                      onChange={(e) => setSuitableActivity(e.target.value)}
                      placeholder="مثال: تخزين مواد غذائية، ورشة حدادة..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-slate-500" />
                    <span>إمكانية دخول وخروج الشاحنات والتريلات:</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTruckAccess(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        truckAccess ? 'bg-[#124C46] text-[#D6A84F]' : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      متاح وسهل
                    </button>
                    <button
                      type="button"
                      onClick={() => setTruckAccess(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        !truckAccess ? 'bg-[#124C46] text-[#D6A84F]' : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      شارع ضيق / سيارات صغيرة
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Utility Chips tailored to selected group */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-[#D6A84F]" />
                <span>
                  {isOffer ? 'المرافق والخدمات المتوفرة بالموقع:' : 'المرافق المطلوبة بالضرورة:'}
                </span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(UTILITIES_BY_GROUP[selectedGroup] || []).map((u) => {
                  const isChecked = selectedGroupUtilities.includes(u.id);
                  return (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => {
                        setSelectedGroupUtilities((prev) =>
                          isChecked ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                        );
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isChecked
                          ? 'bg-[#124C46] text-[#D6A84F] border-[#124C46] shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3" />}
                      <span>{u.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* 4.5. المواصفات الإضافية المدارة ديناميكياً من لوحة التحكم */}
          {/* ============================================================== */}
          {applicableDynamicFields.length > 0 && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-[#124C46] flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#D6A84F]" />
                  <span>مواصفات إضافية متخصصة (ديناميكية)</span>
                </h3>
                <span className="text-[10px] bg-teal-50 text-teal-700 font-bold px-2 py-0.5 rounded-full font-mono">
                  {applicableDynamicFields.length} حقول
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {applicableDynamicFields.map((field) => {
                  const value = customFields[field.fieldKey];

                  // 1. Quick Chips / Multi Chips
                  if (field.displayType === 'quick_chips' || field.displayType === 'multi_chips') {
                    const isMulti = field.displayType === 'multi_chips' || field.fieldType === 'multi_select';
                    const selectedList: string[] = Array.isArray(value) ? value : (value ? [String(value)] : []);

                    return (
                      <div key={field.id} className="sm:col-span-2 space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                          <span>{field.label}</span>
                          {field.isRequired && <span className="text-rose-500 font-bold">*</span>}
                        </label>
                        {field.helpText && <p className="text-[11px] text-slate-400">{field.helpText}</p>}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(field.options || []).map((opt) => {
                            const isSelected = selectedList.includes(opt);
                            return (
                              <button
                                type="button"
                                key={opt}
                                onClick={() => {
                                  if (isMulti) {
                                    const updated = isSelected
                                      ? selectedList.filter((item) => item !== opt)
                                      : [...selectedList, opt];
                                    handleCustomFieldChange(field.fieldKey, updated);
                                  } else {
                                    handleCustomFieldChange(field.fieldKey, isSelected ? '' : opt);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-[#124C46] text-[#D6A84F] border-[#124C46] shadow-2xs'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                                <span>{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  // 2. Dropdown / Single Select
                  if (field.displayType === 'dropdown' || field.fieldType === 'single_select') {
                    return (
                      <div key={field.id} className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                          <span>{field.label}</span>
                          {field.isRequired && <span className="text-rose-500 font-bold">*</span>}
                        </label>
                        {field.helpText && <p className="text-[11px] text-slate-400">{field.helpText}</p>}
                        <select
                          value={value !== undefined && value !== null ? String(value) : ''}
                          onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:border-[#124C46] transition-all"
                        >
                          <option value="">-- اختر {field.label} --</option>
                          {(field.options || []).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  // 3. Toggle / Boolean
                  if (field.displayType === 'toggle' || field.fieldType === 'boolean') {
                    const isTrue = Boolean(value);
                    return (
                      <div key={field.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2">
                        <div>
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            <span>{field.label}</span>
                            {field.isRequired && <span className="text-rose-500 font-bold">*</span>}
                          </span>
                          {field.helpText && <p className="text-[11px] text-slate-400 mt-0.5">{field.helpText}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCustomFieldChange(field.fieldKey, true)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isTrue ? 'bg-[#124C46] text-[#D6A84F]' : 'bg-white text-slate-600 border border-slate-200'
                            }`}
                          >
                            نعم
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCustomFieldChange(field.fieldKey, false)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              !isTrue ? 'bg-[#124C46] text-[#D6A84F]' : 'bg-white text-slate-600 border border-slate-200'
                            }`}
                          >
                            لا
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // 4. Number / Currency / Number Stepper
                  if (field.fieldType === 'number' || field.fieldType === 'currency' || field.displayType === 'number_stepper') {
                    return (
                      <div key={field.id} className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                          <span>{field.label}</span>
                          {field.isRequired && <span className="text-rose-500 font-bold">*</span>}
                        </label>
                        {field.helpText && <p className="text-[11px] text-slate-400">{field.helpText}</p>}
                        <div className="relative">
                          <input
                            type="number"
                            value={value !== undefined && value !== null ? value : ''}
                            onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.value ? Number(e.target.value) : '')}
                            placeholder={`أدخل ${field.label}`}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:outline-hidden focus:border-[#124C46] transition-all"
                          />
                          {field.fieldType === 'currency' && (
                            <span className="absolute left-3 top-2 text-[11px] font-bold text-slate-400">ج.م</span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // 5. Date
                  if (field.fieldType === 'date') {
                    return (
                      <div key={field.id} className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                          <span>{field.label}</span>
                          {field.isRequired && <span className="text-rose-500 font-bold">*</span>}
                        </label>
                        {field.helpText && <p className="text-[11px] text-slate-400">{field.helpText}</p>}
                        <input
                          type="date"
                          value={value || ''}
                          onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:border-[#124C46] transition-all"
                        />
                      </div>
                    );
                  }

                  // 6. Default: Short / Long Text Input
                  return (
                    <div key={field.id} className={field.fieldType === 'long_text' ? 'sm:col-span-2 space-y-1' : 'space-y-1'}>
                      <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                        <span>{field.label}</span>
                        {field.isRequired && <span className="text-rose-500 font-bold">*</span>}
                      </label>
                      {field.helpText && <p className="text-[11px] text-slate-400">{field.helpText}</p>}
                      {field.fieldType === 'long_text' ? (
                        <textarea
                          rows={2}
                          value={value || ''}
                          onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.value)}
                          placeholder={`أدخل ${field.label}`}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:border-[#124C46] transition-all"
                        />
                      ) : (
                        <input
                          type="text"
                          value={value || ''}
                          onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.value)}
                          placeholder={`أدخل ${field.label}`}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:border-[#124C46] transition-all"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 5. الموقف القانوني للعقار (إلزامي للعرض) */}
          {/* ============================================================== */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-[#124C46] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#D6A84F]" />
                <span>الموقف القانوني والتراخيص</span>
              </h3>
              {isOffer && (
                <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-bold border border-rose-200">
                  إلزامي للعرض *
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                <span>الموقف القانوني {isOffer ? '*' : '(مفضل)'}</span>
                <FieldInfoTooltip
                  fieldKey="legalStatus"
                  title="الموقف القانوني"
                  hint="يوضح وضع الترخيص أو التصالح لضمان الشفافية القانونية الكاملة وحماية الطرفين."
                />
              </label>
              <select
                ref={legalStatusRef}
                value={legalStatus}
                onChange={(e) => {
                  setLegalStatus(e.target.value);
                  if (invalidField === 'legalStatus') setInvalidField(null);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-[#124C46] focus:outline-hidden"
              >
                <option value="مرخصة">مرخصة (ترخيص بناء رسمي)</option>
                <option value="بعد الرخصة">بعد الرخصة</option>
                <option value="تصالح نهائي">تصالح نهائي (نموذج 8 أو 10)</option>
                <option value="جاري التصالح">جاري التصالح (نموذج 3)</option>
                <option value="مخالف">مخالف</option>
              </select>
            </div>
          </div>

          {/* ============================================================== */}
          {/* 6. معلومات التواصل والوصف والصور */}
          {/* ============================================================== */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-[#124C46] flex items-center gap-2">
                <User className="w-4 h-4 text-[#D6A84F]" />
                <span>بيانات التواصل والوصف</span>
              </h3>
              {currentUser && (
                <span className="text-[10px] bg-emerald-50 text-[#124C46] px-2 py-0.5 rounded-full font-bold">
                  بيانات معبأة تلقائياً
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم بالكامل</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="مثال: أحمد عبد الرحيم"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                  <span>رقم الهاتف (واتساب / اتصال) *</span>
                  <FieldInfoTooltip
                    fieldKey="phone"
                    title="رقم الهاتف"
                    hint="رقم مصري صحيح للتواصل مع المعلن وترتيب المعاينات الميدانية."
                  />
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
                    className={`w-full pr-9 pl-3 py-2 rounded-xl border text-xs font-bold text-right transition-all ${
                      invalidField === 'phone'
                        ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-200'
                        : 'border-slate-200 bg-slate-50 focus:ring-1 focus:ring-[#124C46]'
                    }`}
                  />
                </div>
                {isValidEgyptianPhone(contactPhone) && (
                  <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                    ✓ رقم مصري معتمد
                  </span>
                )}
              </div>
            </div>

            {/* Title (for offer only) */}
            {isOffer && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان الإعلان التسويقي (اختياري)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`تلقائي: ${propertyType} ${purpose === 'rent' ? 'للإيجار' : 'للبيع'} ${area ? area + 'م²' : ''} في ${district}`}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
                />
              </div>
            )}

            {/* Notes / Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isOffer ? 'الوصف والمميزات الإضافية' : 'ملاحظات وتفضيلات خاصة بالطلب'}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isOffer ? 'أي مميزات، شروط للدفع، أو تفاصيل خاصة بالعقار...' : 'أي شروط ترغب في توافرها بالوحدة...'}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
              />
            </div>

            {/* Photos (up to 4 images) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isOffer ? 'صور العقار (اختياري، حتى 4 صور)' : 'صور مرجعية لما تبحث عنه (اختياري)'}
              </label>
              <ImageUploadField
                images={uploadedImages}
                onChange={setUploadedImages}
                maxImages={4}
                maxCompressedSizeKB={250}
              />
            </div>

            {/* Declaration (Mandatory for offer) */}
            {isOffer && (
              <label
                ref={declarationRef}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer text-xs select-none transition-all ${
                  invalidField === 'declaration'
                    ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-300'
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
                  className="mt-0.5 rounded text-[#124C46] focus:ring-[#124C46] w-4 h-4 cursor-pointer"
                />
                <span className="text-amber-950 font-medium leading-relaxed">
                  <strong>إقرار إجباري:</strong> أقر أنا المعلن بأنني المالك أو الوكيل الرسمي المفوض لهذا العقار، وأن جميع البيانات المدخلة صحيحة تماماً ومطابقة للمعاينة.
                </span>
              </label>
            )}
          </div>

          {/* Bottom Error Bar */}
          {errorMsg && (
            <div
              ref={bottomErrorRef}
              onClick={jumpToCurrentError}
              className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-400 text-rose-900 text-xs font-bold flex items-center justify-between gap-3 shadow-md cursor-pointer hover:bg-rose-100"
            >
              <div className="flex items-center gap-2 flex-1">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  jumpToCurrentError();
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs inline-flex items-center gap-1"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>مكان الخطأ</span>
              </button>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-2xl bg-[#124C46] hover:bg-[#0D3D38] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all active:scale-[0.99] cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5 text-[#D6A84F]" />
              <span>
                {isEditing
                  ? 'حفظ التعديلات'
                  : isAdmin
                  ? 'نشر فوري معتمد من الإدارة'
                  : isOffer
                  ? 'نشر عرض العقار الآن'
                  : 'إرسال طلب العقار في دقيقة واحدة'}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Success Dialog */}
      {showSuccessDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm p-6 rounded-2xl shadow-2xl text-right space-y-4">
            <div className="flex items-center gap-2">
              <HourglassTopRounded className="w-6 h-6 text-[#D6A84F]" />
              <h3 className="text-base font-bold text-slate-900">
                {isAdmin ? 'تم النشر بنجاح' : isOffer ? 'تم تسجيل العرض' : 'تم تسجيل الطلب بنجاح'}
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {isAdmin
                ? 'تم حفظ ونشر الإعلان بنجاح في المنصة.'
                : isOffer
                ? 'تم استلام بيانات العرض بنجاح وهو قيد المراجعة والاعتماد السريع.'
                : 'تم استلام طلبك بنجاح! سيقوم محرك المطابقة الذكي بإشعارك بأفضل العروض المتوافقة فوراً.'}
            </p>
            {submittedListingId && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs flex justify-between font-bold">
                <span>كود الإعلان:</span>
                <span className="font-mono text-[#124C46]">{submittedListingId}</span>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessDialog(false);
                  onBack();
                }}
                className="px-6 py-2 rounded-xl bg-[#124C46] text-white font-bold text-sm cursor-pointer shadow-md"
              >
                حسناً
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div
          onClick={jumpToCurrentError}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 cursor-pointer max-w-sm w-full px-4 animate-in slide-in-from-bottom-4"
        >
          <div className="bg-[#124C46]/95 text-white p-3 rounded-2xl shadow-2xl border border-rose-400/40 flex items-center justify-between gap-3 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span className="text-xs font-bold text-white">{toastMsg}</span>
            </div>
            <span className="text-[10px] text-amber-300 font-bold bg-white/10 px-2 py-0.5 rounded-lg shrink-0">
              انقر للتصحيح
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormEntryScreen;
