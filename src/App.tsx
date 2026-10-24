import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { 
  Property, 
  ScheduledInspection, 
  PropertyStatus, 
  TenantRequest, 
  BlockedUser, 
  ToastNotificationItem, 
  AppUser,
  InAppPushNotification,
  SavedSearchCriteria,
  PropertyRating
} from './types/property';
import { 
  INITIAL_PROPERTIES, 
  INITIAL_TENANT_REQUESTS, 
  INITIAL_SCHEDULED_INSPECTIONS, 
  INITIAL_BLOCKED_USERS,
  INITIAL_PROPERTY_RATINGS
} from './data/initialProperties';
import { 
  INITIAL_DROPDOWN_CATEGORIES, 
  INITIAL_UTILITY_DEFINITIONS, 
  DropdownCategory, 
  UtilityOptionDefinition 
} from './data/dropdownOptions';
import { Header } from './components/Header';
import { BottomNavBar, NavTabIndex } from './components/BottomNavBar';
import { PropertyCard } from './components/PropertyCard';
import { TenantRequestCard } from './components/TenantRequestCard';
import { ToastNotification } from './components/ToastNotification';
import { SupabaseSyncErrorModal } from './components/SupabaseSyncErrorModal';
import { AuthScreen } from './components/AuthScreen';
import { MyAdsScreen } from './components/MyAdsScreen';
import { InAppPushBanner } from './components/InAppPushBanner';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { ProtectedRoute } from './components/ProtectedRoute';
import { isSecureAdminSession, clearSecureSession } from './utils/security';
import { playPushChime } from './utils/pushSound';
import { RealEstateAgent, PersonSearch } from './components/FlutterIcons';
import type { SubmittedSummaryItem, MatchEntry } from './components/SmartMatchingResultsModal';
import { 
  dbFetchProperties, 
  dbUpsertProperty, 
  dbDeleteProperty, 
  dbFetchTenantRequests, 
  dbUpsertTenantRequest, 
  dbDeleteTenantRequest, 
  dbUpsertProfile,
  isSupabaseActive, 
  getSupabaseClient,
  SupabaseSyncErrorEventDetail 
} from './lib/supabase';
import { 
  safeStorageSetItem, 
  safeStorageGetItem, 
  safeStorageRemoveItem, 
  runStorageMaintenance 
} from './utils/storageManager';
import { logAdminActivity } from './utils/adminManager';

// Resilient dynamic chunk loader with automatic retry for transient network hiccups
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      console.warn('Chunk loading failed, retrying module load...', err);
      await new Promise((resolve) => setTimeout(resolve, 400));
      return await factory();
    }
  });
}

// Code-split heavy components & modals for optimal runtime performance
const AdminPanel = lazyWithRetry(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const FormEntryScreen = lazyWithRetry(() => import('./components/FormEntryScreen').then(m => ({ default: m.FormEntryScreen })));
const PropertyDetailsModal = lazyWithRetry(() => import('./components/PropertyDetailsModal').then(m => ({ default: m.PropertyDetailsModal })));
const TenantRequestDetailsModal = lazyWithRetry(() => import('./components/TenantRequestDetailsModal').then(m => ({ default: m.TenantRequestDetailsModal })));
const InspectionModal = lazyWithRetry(() => import('./components/InspectionModal').then(m => ({ default: m.InspectionModal })));
const SmartMatchingResultsModal = lazyWithRetry(() => import('./components/SmartMatchingResultsModal').then(m => ({ default: m.SmartMatchingResultsModal })));
const SavedSearchModal = lazyWithRetry(() => import('./components/SavedSearchModal').then(m => ({ default: m.SavedSearchModal })));
const FavoritesModal = lazyWithRetry(() => import('./components/FavoritesModal').then(m => ({ default: m.FavoritesModal })));
const PropertyRatingModal = lazyWithRetry(() => import('./components/PropertyRatingModal').then(m => ({ default: m.PropertyRatingModal })));
import { 
  Search, 
  Building2, 
  X, 
  Users, 
  ChevronRight, 
  ChevronDown,
  PlusCircle, 
  Bookmark, 
  SlidersHorizontal, 
  RotateCcw, 
  MapPin, 
  Building, 
  DollarSign, 
  Heart,
  ClipboardList
} from 'lucide-react';

/**
 * Main Application: تطبيق سكن أسيوط - المنظومة العقارية المعتمدة بمحافظة أسيوط
 * Divided cleanly into two account types:
 * 1. المستخدم العادي (Regular User):
 *    - Sign-up with Mobile Phone (username) and 4-digit PIN.
 *    - Persistent session across reloads (saved in localStorage).
 *    - Bottom Navigation:
 *      * عروض الإيجار (Tab 0)
 *      * زر الإضافة (+) البارز
 *      * طلبات الإيجار (Tab 1)
 *      * لا تظهر لوحة التحكم نهائياً للمستخدم العادي.
 * 2. مدير النظام (Admin):
 *    - Admin account with security verification.
 *    - Bottom Navigation:
 *      * عروض الإيجار (Tab 0)
 *      * طلبات الإيجار (Tab 1)
 *      * زر الإضافة (+) الأوسط (تنبثق منه واجهتا طلب عقار وعرض عقار)
 *      * لوحة التحكم (Tab 3)
 */
export function App() {
  // Proactively manage local storage quota and purge expired/stale records on startup
  useEffect(() => {
    runStorageMaintenance();
  }, []);

  // Current Logged-in User (Stored in LocalStorage with Safe Manager)
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    return safeStorageGetItem<AppUser | null>('ardaw_current_user', null);
  });

  const isAdmin = currentUser?.role === 'admin';

  // Navigation Tab Index initialized with secure route check
  // For Regular User: 0 = عروض الإيجار, 1 = طلبات الإيجار, 2 = إعلاناتي
  // For Admin: 0 = عروض الإيجار, 1 = طلبات الإيجار, 3 = لوحة التحكم
  const [navIndex, setNavIndex] = useState<NavTabIndex>(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/admin') {
      const savedUser = safeStorageGetItem<AppUser | null>('ardaw_current_user', null);
      if (savedUser?.role === 'admin') return 3;
      // Silently rewrite unauthorized URL to '/'
      window.history.replaceState(null, '', '/');
    }
    return 0;
  });

  // Dedicated Full-Screen Overlay (عرض عقار / طلب عقار)
  const [overlayScreen, setOverlayScreen] = useState<'none' | 'form_entry_offer' | 'form_entry_request'>('none');

  // Synchronize browser URL history with active view
  useEffect(() => {
    if (navIndex === 3) {
      if (window.location.pathname !== '/admin') {
        window.history.pushState(null, '', '/admin');
      }
    } else {
      if (window.location.pathname === '/admin') {
        window.history.pushState(null, '', '/');
      }
    }
  }, [navIndex]);

  // Handle browser back/forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/admin') {
        if (currentUser?.role === 'admin') {
          setNavIndex(3);
        } else {
          window.history.replaceState(null, '', '/');
          setNavIndex(0);
        }
      } else if (path === '/') {
        if (navIndex === 3) {
          setNavIndex(0);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser, navIndex]);

  // Strict session and cryptographic integrity check for Admin
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      isSecureAdminSession(currentUser).then((valid) => {
        if (!valid) {
          console.warn('Unauthorized or tampered admin session detected. Reverting to guest state.');
          clearSecureSession();
          setCurrentUser(null);
          setNavIndex(0);
          window.history.replaceState(null, '', '/');
        }
      });
    } else {
      // Non-admin visiting /admin silently rewritten to /
      if (window.location.pathname === '/admin') {
        window.history.replaceState(null, '', '/');
      }
    }
  }, [currentUser]);

  // Application Data States with Persistence & Quota Protection
  const [properties, setProperties] = useState<Property[]>(() => {
    return safeStorageGetItem<Property[]>('ardaw_properties', INITIAL_PROPERTIES);
  });

  const [tenantRequests, setTenantRequests] = useState<TenantRequest[]>(() => {
    return safeStorageGetItem<TenantRequest[]>('ardaw_tenant_requests', INITIAL_TENANT_REQUESTS);
  });

  const [scheduledInspections, setScheduledInspections] = useState<ScheduledInspection[]>(() => {
    return safeStorageGetItem<ScheduledInspection[]>('ardaw_scheduled_inspections', INITIAL_SCHEDULED_INSPECTIONS);
  });

  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>(() => {
    return safeStorageGetItem<BlockedUser[]>('ardaw_blocked_users', INITIAL_BLOCKED_USERS);
  });

  // Live Database Sync for Properties & Tenant Requests
  useEffect(() => {
    let isMounted = true;

    const syncLiveDatabase = async () => {
      if (!isSupabaseActive()) return;
      try {
        const [dbProps, dbReqs] = await Promise.all([
          dbFetchProperties(),
          dbFetchTenantRequests(),
        ]);

        if (!isMounted) return;

        if (dbProps && Array.isArray(dbProps) && dbProps.length > 0) {
          setProperties((prev) => {
            const propMap = new Map<string, Property>();
            INITIAL_PROPERTIES.forEach((p) => propMap.set(p.id, p));
            prev.forEach((p) => propMap.set(p.id, p));
            dbProps.forEach((p) => propMap.set(p.id, p));
            const merged = Array.from(propMap.values());
            safeStorageSetItem('ardaw_properties', merged);
            return merged;
          });
        }

        if (dbReqs && Array.isArray(dbReqs) && dbReqs.length > 0) {
          setTenantRequests((prev) => {
            const reqMap = new Map<string, TenantRequest>();
            INITIAL_TENANT_REQUESTS.forEach((r) => reqMap.set(r.id, r));
            prev.forEach((r) => reqMap.set(r.id, r));
            dbReqs.forEach((r) => reqMap.set(r.id, r));
            const merged = Array.from(reqMap.values());
            safeStorageSetItem('ardaw_tenant_requests', merged);
            return merged;
          });
        }
      } catch (err) {
        console.warn('Live database sync failed:', err);
      }
    };

    syncLiveDatabase();

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ardaw_properties' && e.newValue) {
        try { setProperties(JSON.parse(e.newValue)); } catch {}
      }
      if (e.key === 'ardaw_tenant_requests' && e.newValue) {
        try { setTenantRequests(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Supabase Realtime channel subscription
    const client = getSupabaseClient();
    let channel: any = null;
    if (client) {
      try {
        channel = client
          .channel('public_realtime_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => {
            dbFetchProperties().then((fresh) => {
              if (fresh && isMounted) {
                setProperties(fresh);
                safeStorageSetItem('ardaw_properties', fresh);
              }
            });
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tenant_requests' }, () => {
            dbFetchTenantRequests().then((fresh) => {
              if (fresh && isMounted) {
                setTenantRequests(fresh);
                safeStorageSetItem('ardaw_tenant_requests', fresh);
              }
            });
          })
          .subscribe();
      } catch (e) {
        console.warn('Realtime channel error:', e);
      }
    }

    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorageChange);
      if (channel && client) {
        client.removeChannel(channel);
      }
    };
  }, []);
  const [dropdownCategories, setDropdownCategories] = useState<Record<string, DropdownCategory>>(() => {
    return safeStorageGetItem<Record<string, DropdownCategory>>('ardaw_dropdown_categories', INITIAL_DROPDOWN_CATEGORIES);
  });

  // Dynamic utilities and meter options with localStorage persistence
  const [utilityDefinitions, setUtilityDefinitions] = useState<UtilityOptionDefinition[]>(() => {
    return safeStorageGetItem<UtilityOptionDefinition[]>('ardaw_utility_definitions', INITIAL_UTILITY_DEFINITIONS);
  });

  // Search & Filter State for Listings
  const [searchQuery, setSearchQuery] = useState('');
  const [purposeFilter, setPurposeFilter] = useState<'all' | 'rent' | 'sale'>('rent');
  const [excludeEnded, setExcludeEnded] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<string>(() => {
    const saved = safeStorageGetItem<any>('ardaw_last_search_criteria', null);
    return saved?.district || 'all';
  });
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>(() => {
    const saved = safeStorageGetItem<any>('ardaw_last_search_criteria', null);
    return saved?.propertyType || 'all';
  });
  const [minPrice, setMinPrice] = useState<string>(() => {
    const saved = safeStorageGetItem<any>('ardaw_last_search_criteria', null);
    return saved?.minPrice ? String(saved.minPrice) : '';
  });
  const [maxPrice, setMaxPrice] = useState<string>(() => {
    const saved = safeStorageGetItem<any>('ardaw_last_search_criteria', null);
    return saved?.maxPrice ? String(saved.maxPrice) : '';
  });

  // Saved Search Criteria (localStorage)
  const [savedSearches, setSavedSearches] = useState<SavedSearchCriteria[]>(() => {
    return safeStorageGetItem<SavedSearchCriteria[]>('ardaw_saved_search_criteria', [
      {
        id: 'saved-default-1',
        title: 'شقق سكنية بحي الجامعة (إيجار)',
        district: 'حي الجامعة',
        propertyType: 'شقة سكنية',
        minPrice: 2000,
        maxPrice: 6000,
        purpose: 'rent',
        createdAt: '12/10/2026',
      },
      {
        id: 'saved-default-2',
        title: 'عقارات شارع الجمهورية المميزة',
        district: 'شارع الجمهورية',
        propertyType: 'all',
        minPrice: null,
        maxPrice: null,
        purpose: 'all',
        createdAt: '12/10/2026',
      },
    ]);
  });

  const [isSavedSearchModalOpen, setIsSavedSearchModalOpen] = useState(false);
  const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(false);
  const [isSearchMenuOpen, setIsSearchMenuOpen] = useState(false);
  const [isOffersFilterOpen, setIsOffersFilterOpen] = useState(false);
  const [isRequestsFilterOpen, setIsRequestsFilterOpen] = useState(false);

  // Search & Filter State for Requests
  const [requestSearchQuery, setRequestSearchQuery] = useState('');
  const [requestDistrict, setRequestDistrict] = useState<string>('all');
  const [requestPropertyType, setRequestPropertyType] = useState<string>('all');
  const [requestPurpose, setRequestPurpose] = useState<'all' | 'rent' | 'sale'>('all');

  // Modals & Active Selections
  const [isChoiceAddOpen, setIsChoiceAddOpen] = useState(false);
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false);
  const [isAdminDrawerOpen, setIsAdminDrawerOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedTenantRequest, setSelectedTenantRequest] = useState<TenantRequest | null>(null);
  const [selectedPropertyForInspection, setSelectedPropertyForInspection] = useState<Property | null>(null);

  // Favorite Properties system with localStorage persistence
  const [favoritePropertyIds, setFavoritePropertyIds] = useState<string[]>(() => {
    return safeStorageGetItem<string[]>('ardaw_favorites', ['prop-1']);
  });

  // Verified 5-Star Ratings System with localStorage persistence
  const [propertyRatings, setPropertyRatings] = useState<PropertyRating[]>(() => {
    return safeStorageGetItem<PropertyRating[]>('ardaw_property_ratings', INITIAL_PROPERTY_RATINGS);
  });
  const [ratingModalProperty, setRatingModalProperty] = useState<Property | null>(null);

  // Smart Matching Post-Submission Modal State
  const [smartMatchModalData, setSmartMatchModalData] = useState<{
    isOpen: boolean;
    submittedItem: SubmittedSummaryItem | null;
    exactMatches: MatchEntry[];
    similarMatches: MatchEntry[];
  }>({
    isOpen: false,
    submittedItem: null,
    exactMatches: [],
    similarMatches: [],
  });

  // Editing state for offers and requests
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editingTenantRequest, setEditingTenantRequest] = useState<TenantRequest | null>(null);

  // In-App Toast Notifications System
  const [toasts, setToasts] = useState<ToastNotificationItem[]>([]);

  const addToast = (toast: Omit<ToastNotificationItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Supabase Sync Error On-Screen Alert Modal State
  const [supabaseSyncError, setSupabaseSyncError] = useState<SupabaseSyncErrorEventDetail | null>(null);

  useEffect(() => {
    const handleSbSyncError = (e: Event) => {
      const customEvent = e as CustomEvent<SupabaseSyncErrorEventDetail>;
      if (customEvent.detail) {
        setSupabaseSyncError(customEvent.detail);
        addToast({
          type: 'error',
          title: customEvent.detail.title,
          message: customEvent.detail.message,
          duration: 8000,
        });
      }
    };

    window.addEventListener('ardaw_supabase_sync_error', handleSbSyncError);
    return () => {
      window.removeEventListener('ardaw_supabase_sync_error', handleSbSyncError);
    };
  }, []);

  // Fast O(1) lookup set for favorites
  const favoriteIdsSet = useMemo(() => new Set(favoritePropertyIds), [favoritePropertyIds]);

  // Filtered list of favorite properties
  const favoriteProperties = useMemo(() => {
    return properties.filter((p) => favoriteIdsSet.has(p.id));
  }, [properties, favoriteIdsSet]);

  // Handle toggling favorite status with Toast and localStorage sync
  const handleToggleFavorite = (propertyId: string) => {
    setFavoritePropertyIds((prev) => {
      const exists = prev.includes(propertyId);
      const updated = exists 
        ? prev.filter((id) => id !== propertyId) 
        : [...prev, propertyId];
      safeStorageSetItem('ardaw_favorites', updated);

      const target = properties.find((p) => p.id === propertyId);
      const title = target ? target.title : 'العقار';
      if (!exists) {
        addToast({
          title: 'تمت الإضافة للمفضلة ❤️',
          message: `تم حفظ "${title}" في قائمتك المفضلة للرجوع إليها سريعاً.`,
          type: 'success',
        });
      } else {
        addToast({
          title: 'تمت الإزالة من المفضلة',
          message: `تم حذف "${title}" من قائمتك المفضلة.`,
          type: 'info',
        });
      }
      return updated;
    });
  };

  // Pre-computed ratings summary map for instant O(1) lookups during card rendering
  const ratingsSummaryMap = useMemo(() => {
    const map = new Map<string, { average: number; count: number }>();
    for (const r of propertyRatings) {
      const entry = map.get(r.propertyId);
      if (!entry) {
        map.set(r.propertyId, { average: r.score, count: 1 });
      } else {
        const newCount = entry.count + 1;
        const newAvg = Number(((entry.average * entry.count + r.score) / newCount).toFixed(1));
        map.set(r.propertyId, { average: newAvg, count: newCount });
      }
    }
    return map;
  }, [propertyRatings]);

  // Helper to compute average rating and count for any property
  const getPropertyRatingSummary = (propertyId: string) => {
    return ratingsSummaryMap.get(propertyId) || { average: 0, count: 0 };
  };

  // Handle submitting or updating a 5-star rating for an inspected property
  const handleSubmitRating = (ratingData: {
    propertyId: string;
    propertyCode: string;
    score: number;
    comment: string;
    inspectionId: string;
  }) => {
    if (!currentUser) return;
    setPropertyRatings((prev) => {
      const existingIndex = prev.findIndex(
        (r) => r.propertyId === ratingData.propertyId && (r.userId === currentUser.id || r.userPhone === currentUser.phone)
      );

      let updated: PropertyRating[];
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          score: ratingData.score,
          comment: ratingData.comment,
          createdAt: new Date().toISOString().split('T')[0],
        };
      } else {
        const newRating: PropertyRating = {
          id: `rate-${Date.now()}`,
          propertyId: ratingData.propertyId,
          propertyCode: ratingData.propertyCode,
          userId: currentUser.id,
          userName: currentUser.name,
          userPhone: currentUser.phone,
          inspectionId: ratingData.inspectionId,
          score: ratingData.score,
          comment: ratingData.comment,
          createdAt: new Date().toISOString().split('T')[0],
        };
        updated = [newRating, ...prev];
      }

      safeStorageSetItem('ardaw_property_ratings', updated);

      addToast({
        title: 'تم اعتماد التقييم الموثق بنجاح ⭐',
        message: `شكراً لمشاركتك! تم تسجيل تقييمك (${ratingData.score} نجوم) للعقار كود ${ratingData.propertyCode}.`,
        type: 'success',
      });

      return updated;
    });
  };

  // Sync current active criteria to localStorage
  useEffect(() => {
    try {
      const current = {
        district: selectedDistrict,
        propertyType: selectedPropertyType,
        minPrice: minPrice ? Number(minPrice) : null,
        maxPrice: maxPrice ? Number(maxPrice) : null,
        purpose: purposeFilter,
      };
      safeStorageSetItem('ardaw_last_search_criteria', current);
    } catch (e) {
      console.error('Error persisting last search criteria', e);
    }
  }, [selectedDistrict, selectedPropertyType, minPrice, maxPrice, purposeFilter]);

  const saveSearchesToStorage = (updated: SavedSearchCriteria[]) => {
    setSavedSearches(updated);
    safeStorageSetItem('ardaw_saved_search_criteria', updated);
  };

  const handleSaveCurrentCriteria = (customTitle?: string) => {
    const numMin = minPrice ? Number(minPrice) : null;
    const numMax = maxPrice ? Number(maxPrice) : null;

    let defaultTitle = '';
    if (selectedPropertyType !== 'all') {
      defaultTitle += selectedPropertyType;
    } else {
      defaultTitle += 'عقار';
    }

    if (selectedDistrict !== 'all') {
      defaultTitle += ` في ${selectedDistrict}`;
    }

    if (numMin || numMax) {
      if (numMin && numMax) {
        defaultTitle += ` (${numMin.toLocaleString()} - ${numMax.toLocaleString()} ج.م)`;
      } else if (numMin) {
        defaultTitle += ` (من ${numMin.toLocaleString()} ج.م)`;
      } else {
        defaultTitle += ` (حتى ${numMax?.toLocaleString()} ج.م)`;
      }
    }

    const titleToSave = customTitle?.trim() || defaultTitle || 'معيار بحث محفوظ';

    const newCriteria: SavedSearchCriteria = {
      id: `saved-criteria-${Date.now()}`,
      title: titleToSave,
      district: selectedDistrict,
      propertyType: selectedPropertyType,
      minPrice: numMin,
      maxPrice: numMax,
      purpose: purposeFilter,
      createdAt: new Date().toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };

    const updated = [newCriteria, ...savedSearches];
    saveSearchesToStorage(updated);

    addToast({
      type: 'success',
      title: 'تم حفظ معايير البحث 💾',
      message: `تم حفظ "${titleToSave}" بنجاح في متصفحك. يمكنك العودة إليها في أي وقت.`,
    });
  };

  const handleApplyCriteria = (criteria: SavedSearchCriteria) => {
    setSelectedDistrict(criteria.district || 'all');
    setSelectedPropertyType(criteria.propertyType || 'all');
    setMinPrice(criteria.minPrice ? String(criteria.minPrice) : '');
    setMaxPrice(criteria.maxPrice ? String(criteria.maxPrice) : '');
    if (criteria.purpose) {
      setPurposeFilter(criteria.purpose);
    }
    addToast({
      type: 'info',
      title: 'تم تطبيق معايير البحث 🎯',
      message: `تم تفعيل: "${criteria.title}"`,
    });
  };

  const handleDeleteCriteria = (id: string) => {
    const updated = savedSearches.filter((item) => item.id !== id);
    saveSearchesToStorage(updated);
    addToast({
      type: 'info',
      title: 'تم حذف المعيار',
      message: 'تمت إزالة معيار البحث من القائمة المحفوظة.',
    });
  };

  const handleClearAllCriteria = () => {
    saveSearchesToStorage([]);
    addToast({
      type: 'info',
      title: 'تم مسح المعايير',
      message: 'تم مسح جميع معايير البحث المحفوظة في localStorage.',
    });
  };

  const handleResetSearchFilters = () => {
    setSelectedDistrict('all');
    setSelectedPropertyType('all');
    setMinPrice('');
    setMaxPrice('');
    setSearchQuery('');
    addToast({
      type: 'info',
      title: 'إعادة ضبط المعايير ↺',
      message: 'تمت استعادة خيارات البحث الافتراضية لكافة العقارات.',
    });
  };

  // In-App Push Notifications System with Auto-Pruning
  const [inAppNotifications, setInAppNotifications] = useState<InAppPushNotification[]>(() => {
    return safeStorageGetItem<InAppPushNotification[]>('ardaw_inapp_notifications', [
      {
        id: 'push-welcome-default',
        recipientPhone: 'all',
        recipientName: 'المستخدم',
        type: 'welcome',
        title: 'مرحباً بك في تطبيق سكن أسيوط! 👋',
        body: 'أهلاً بك في المنظومة العقارية المعتمدة بمحافظة أسيوط. يمكنك تصفح العروض والطلبات ومتابعة اعتماد إعلاناتك لحظة بلحظة.',
        createdAt: 'اليوم',
        isRead: false,
      },
    ]);
  });

  const [activePushBanner, setActivePushBanner] = useState<InAppPushNotification | null>(null);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  const dispatchPushNotification = (notification: Omit<InAppPushNotification, 'id' | 'createdAt' | 'isRead'>) => {
    const newPush: InAppPushNotification = {
      ...notification,
      id: `push-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      isRead: false,
    };

    setInAppNotifications((prev) => {
      // Auto-pruning: Keep max 40 notifications to prevent storage quota exhaustion
      const updated = [newPush, ...prev].slice(0, 40);
      safeStorageSetItem('ardaw_inapp_notifications', updated);
      return updated;
    });

    // Check if notification is targeted to current user or all or admin
    const isTargetUser = 
      !currentUser || 
      newPush.recipientPhone === 'all' || 
      (currentUser && newPush.recipientPhone && (
        newPush.recipientPhone === currentUser.phone || 
        newPush.recipientPhone.replace(/\D/g, '') === currentUser.phone.replace(/\D/g, '')
      )) ||
      (currentUser?.role === 'admin') ||
      (currentUser?.phone === '01012345678' && (newPush.itemCode === 'AS-101' || newPush.recipientPhone.includes('01012345678')));

    if (isTargetUser) {
      setActivePushBanner(newPush);
      playPushChime(newPush.type);
    }

    return newPush;
  };

  const userNotifications = useMemo(() => {
    if (!currentUser) return inAppNotifications;
    const phone = currentUser.phone.trim().replace(/\D/g, '');
    const isDemoRegular = phone === '01012345678' || currentUser.id === 'user-regular-default';

    return inAppNotifications.filter((n) => {
      if (currentUser.role === 'admin') return true;
      if (n.recipientPhone === 'all') return true;
      const recPhone = n.recipientPhone.replace(/\D/g, '');
      if (recPhone === phone) return true;
      if (isDemoRegular && (n.itemCode === 'AS-101' || n.recipientPhone.includes('01012345678') || n.recipientPhone.includes('01002345678'))) {
        return true;
      }
      return false;
    });
  }, [inAppNotifications, currentUser]);

  const unreadNotificationCount = useMemo(() => {
    return userNotifications.filter((n) => !n.isRead).length;
  }, [userNotifications]);

  const handleMarkAllNotificationsAsRead = () => {
    setInAppNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      safeStorageSetItem('ardaw_inapp_notifications', updated);
      return updated;
    });
  };

  const handleClearAllNotifications = () => {
    setInAppNotifications([]);
    safeStorageRemoveItem('ardaw_inapp_notifications');
  };

  const handleSelectNotification = (notif: InAppPushNotification) => {
    setInAppNotifications((prev) => {
      const updated = prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n));
      safeStorageSetItem('ardaw_inapp_notifications', updated);
      return updated;
    });

    if (notif.itemId || notif.itemCode) {
      // Direct navigation to edit & fix the error for needs_completion or rejected listings
      if (notif.type === 'needs_completion' || notif.type === 'rejected') {
        const prop = properties.find((p) => p.id === notif.itemId || p.code === notif.itemCode);
        if (prop) {
          setIsNotificationCenterOpen(false);
          setActivePushBanner(null);
          handleStartEditProperty(prop);
          return;
        }

        const req = tenantRequests.find((r) => r.id === notif.itemId || r.requestCode === notif.itemCode);
        if (req) {
          setIsNotificationCenterOpen(false);
          setActivePushBanner(null);
          handleStartEditTenantRequest(req);
          return;
        }
      }

      // If itemType is explicitly request or found in tenantRequests
      if (notif.itemType === 'request') {
        const req = tenantRequests.find((r) => r.id === notif.itemId || r.requestCode === notif.itemCode);
        if (req) {
          setSelectedTenantRequest(req);
          setIsNotificationCenterOpen(false);
          return;
        }
      }

      // Check in properties
      const prop = properties.find((p) => p.id === notif.itemId || p.code === notif.itemCode);
      if (prop) {
        setSelectedProperty(prop);
        setIsNotificationCenterOpen(false);
        return;
      }

      // Fallback check in requests
      const req = tenantRequests.find((r) => r.id === notif.itemId || r.requestCode === notif.itemCode);
      if (req) {
        setSelectedTenantRequest(req);
        setIsNotificationCenterOpen(false);
        return;
      }
    }

    if (!isAdmin) {
      setNavIndex(2);
    } else {
      setNavIndex(3);
    }
    setIsNotificationCenterOpen(false);
  };

  const handleTriggerSimulatedNotification = (type: 'approved' | 'rejected' | 'welcome' | 'smart_match') => {
    if (type === 'smart_match') {
      dispatchPushNotification({
        recipientPhone: currentUser?.phone || 'all',
        recipientName: currentUser?.name || 'المعلن',
        type: 'smart_match',
        title: '🎯 تطابق ذكي فوري!',
        body: '🎯 تم العثور على عرض متطابق كلياً برقم كود (AS-101)!',
        itemCode: 'AS-101',
        itemType: 'property',
      });
    } else if (type === 'approved') {
      dispatchPushNotification({
        recipientPhone: currentUser?.phone || 'all',
        recipientName: currentUser?.name || 'المعلن',
        type: 'approved',
        title: '🎉 تهانينا! تم اعتماد إعلانك بنجاح',
        body: 'تمت مراجعة إعلانك (كود: AS-101 - شقة مميزة بحي الجامعة) والموافقة عليه من قبل إدارة المنصة، وأصبح متاحاً الآن في العروض العامة!',
        itemCode: 'AS-101',
        itemType: 'property',
      });
    } else if (type === 'rejected') {
      dispatchPushNotification({
        recipientPhone: currentUser?.phone || 'all',
        recipientName: currentUser?.name || 'المعلن',
        type: 'rejected',
        title: '⚠️ تنبيه: تم رفض إعلانك',
        body: 'نأسف لإبلاغك بأنه تم رفض الإعلان (كود: AS-101). السبب: عدم اكتمال صور سند الملكية وسعر الإيجار يحتاج تعديل.',
        adminNote: 'عدم اكتمال صور سند الملكية وسعر الإيجار يحتاج تعديل.',
        itemCode: 'AS-101',
        itemType: 'property',
      });
    } else {
      dispatchPushNotification({
        recipientPhone: currentUser?.phone || 'all',
        recipientName: currentUser?.name || 'المستخدم',
        type: 'welcome',
        title: `مرحباً بك يا ${currentUser?.name || 'المستخدم'}! 👋`,
        body: 'أهلاً بك في تطبيق سكن أسيوط. يمكنك تصفح العروض والطلبات أو إضافة إعلانك بسهولة ومتابعة حالة المراجعة هنا.',
      });
    }
  };

  // Filter Properties logic (Index 0: عروض الإيجار المتاحة)
  const filteredProperties = useMemo(() => {
    return properties.filter((prop) => {
      // Must be approved for public regular view (unless viewed by admin)
      const isPubliclyAllowed = prop.isApproved !== false && (prop.status === 'approved' || prop.status === 'rented' || prop.status === 'sold');
      if (!isAdmin && !isPubliclyAllowed) return false;

      // Filter out finished/ended properties (rented / sold)
      if (excludeEnded && (prop.status === 'rented' || prop.status === 'sold')) {
        return false;
      }

      // In Tab 0, if purposeFilter is 'rent' or 'all' or 'sale'
      if (purposeFilter !== 'all' && prop.purpose !== purposeFilter) return false;

      // District Filter (المنطقة)
      if (selectedDistrict !== 'all' && prop.district !== selectedDistrict) return false;

      // Property Type Filter (نوع العقار)
      if (selectedPropertyType !== 'all' && prop.propertyType !== selectedPropertyType) return false;

      // Price Range Filter (النطاق السعري)
      const numMinPrice = minPrice ? Number(minPrice) : null;
      const numMaxPrice = maxPrice ? Number(maxPrice) : null;

      if (numMinPrice !== null && !isNaN(numMinPrice) && numMinPrice > 0) {
        if (prop.price < numMinPrice) return false;
      }

      if (numMaxPrice !== null && !isNaN(numMaxPrice) && numMaxPrice > 0) {
        if (prop.price > numMaxPrice) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const codeMatch = prop.code.toLowerCase().includes(query);
        const titleMatch = prop.title.toLowerCase().includes(query);
        const districtMatch = prop.district.toLowerCase().includes(query);
        const addressMatch = prop.address.toLowerCase().includes(query);
        const typeMatch = prop.propertyType.toLowerCase().includes(query);

        if (!codeMatch && !titleMatch && !districtMatch && !addressMatch && !typeMatch) {
          return false;
        }
      }

      return true;
    });
  }, [properties, isAdmin, purposeFilter, selectedDistrict, selectedPropertyType, searchQuery, minPrice, maxPrice, excludeEnded]);

  // Filter Tenant Requests logic (طلبات الإيجار المطلوبة)
  const filteredTenantRequests = useMemo(() => {
    return tenantRequests.filter((req) => {
      // Must be approved for public view (unless viewed by admin)
      if (!isAdmin && (req.status === 'pending_approval' || req.isApproved === false)) return false;

      if (requestPurpose !== 'all' && req.purpose !== requestPurpose) return false;
      if (requestDistrict !== 'all' && req.preferredDistrict !== requestDistrict) return false;
      if (requestPropertyType !== 'all' && req.propertyType !== requestPropertyType) return false;

      if (requestSearchQuery.trim()) {
        const query = requestSearchQuery.trim().toLowerCase();
        const codeMatch = req.requestCode?.toLowerCase().includes(query);
        const districtMatch = req.preferredDistrict.toLowerCase().includes(query);
        const typeMatch = req.propertyType.toLowerCase().includes(query);
        const notesMatch = req.notes?.toLowerCase().includes(query);

        if (!codeMatch && !districtMatch && !typeMatch && !notesMatch) {
          return false;
        }
      }

      return true;
    });
  }, [tenantRequests, isAdmin, requestPurpose, requestDistrict, requestPropertyType, requestSearchQuery]);

  // User Ads count for regular user BottomNavBar badge
  const myAdsCount = useMemo(() => {
    if (!currentUser) return 0;
    const phone = currentUser.phone.trim();
    const name = currentUser.name.trim();
    const isDemoRegular = phone === '01012345678' || currentUser.id === 'user-regular-default';
    
    const userProps = properties.filter((p) => {
      const matchPhone = p.ownerPhone && (p.ownerPhone === phone || p.ownerPhone.replace(/\D/g, '') === phone.replace(/\D/g, ''));
      const matchName = p.ownerName && p.ownerName.toLowerCase().includes(name.toLowerCase());
      const isDemo = isDemoRegular && (p.code === 'AS-101' || p.id === 'prop-1' || p.ownerPhone === '01002345678' || p.ownerPhone === '01012345678');
      return matchPhone || matchName || isDemo;
    });

    const userReqs = tenantRequests.filter((r) => {
      const matchPhone = r.tenantPhone && (r.tenantPhone === phone || r.tenantPhone.replace(/\D/g, '') === phone.replace(/\D/g, ''));
      const matchName = r.tenantName && r.tenantName.toLowerCase().includes(name.toLowerCase());
      const isDemo = isDemoRegular && (r.id === 'req-1' || r.tenantPhone === '01012345678' || r.tenantPhone === '01002345678');
      return matchPhone || matchName || isDemo;
    });

    return userProps.length + userReqs.length;
  }, [currentUser, properties, tenantRequests]);

  // Add Property with persistence & Smart Matching
  const handleAddProperty = (newProp: Property) => {
    setProperties((prev) => {
      const updated = [newProp, ...prev];
      safeStorageSetItem('ardaw_properties', updated);
      return updated;
    });

    // Instant background sync with Supabase production database
    dbUpsertProperty(newProp).catch((err) => {
      console.warn('Supabase upsert property warning:', err);
    });

    // Auto-save property owner to profiles table as 'صاحب عقار'
    if (newProp.ownerName && newProp.ownerPhone) {
      dbUpsertProfile({
        fullName: newProp.ownerName,
        phone: newProp.ownerPhone,
        role: 'صاحب عقار',
      }).catch((err) => {
        console.warn('Auto-save owner to profiles error:', err);
      });
    }

    if (newProp.isApproved === false || newProp.status === 'pending_approval') {
      addToast({
        type: 'info',
        title: 'تم تسجيل العرض',
        message: `تم تسجيل إعلانك برقم (${newProp.code})! في انتظار المراجعة الإدارية وسداد الرسوم.`,
        duration: 5000,
      });
    } else {
      addToast({
        type: 'success',
        title: 'تم نشر الإعلان بنجاح!',
        message: `تم إضافة العقار برقم كود (${newProp.code}) في حي (${newProp.district}). العقار متاح الآن في العروض.`,
        duration: 5000,
      });
    }

    // 1. حساب المتطابقات التامة (Exact Matches): [نوع العقار] + [الغرض: بيع / إيجار]
    const exactMatchList: MatchEntry[] = tenantRequests
      .filter((req) => 
        req.propertyType.trim().toLowerCase() === newProp.propertyType.trim().toLowerCase() &&
        req.purpose === newProp.purpose
      )
      .map((req) => ({ type: 'request', item: req }));

    // 2. حساب أشباه المتطابقات (Similar Matches): تشترك في [نوع العقار] فقط حتى لو اختلف الغرض أو السعر
    const similarMatchList: MatchEntry[] = tenantRequests
      .filter((req) => 
        req.propertyType.trim().toLowerCase() === newProp.propertyType.trim().toLowerCase() &&
        req.purpose !== newProp.purpose
      )
      .map((req) => ({ type: 'request', item: req }));

    // 3. شرط الإشعارات الفورية (Push Notifications):
    // يُرسل الإشعار التلقائي فقط عند المطابقة التامة في الشرطين معاً: [نوع العقار] + [الغرض: بيع / إيجار]
    // نص الإشعار: 🎯 "تم العثور على طلب متطابق كلياً برقم كود (AS-xxxx)!"
    if (exactMatchList.length > 0) {
      const topMatch = exactMatchList[0].item as TenantRequest;
      const targetCode = topMatch.requestCode || topMatch.id;
      setTimeout(() => {
        dispatchPushNotification({
          recipientPhone: currentUser?.phone || 'all',
          recipientName: currentUser?.name || 'المعلن',
          type: 'smart_match',
          title: '🎯 تطابق ذكي فوري!',
          body: `🎯 تم العثور على طلب متطابق كلياً برقم كود (${targetCode})!`,
          itemCode: targetCode,
          itemId: topMatch.id,
          itemType: 'request',
        });
      }, 500);
    }

    // 4. واجهة النتائج المباشرة بعد التسجيل (Post-Submission UI)
    setSmartMatchModalData({
      isOpen: true,
      submittedItem: {
        id: newProp.id,
        code: newProp.code,
        type: 'عرض',
        title: newProp.title,
        propertyType: newProp.propertyType,
        purpose: newProp.purpose,
        district: newProp.district,
        price: newProp.price,
        area: newProp.area,
        bedrooms: newProp.bedrooms,
        bathrooms: newProp.bathrooms,
        images: newProp.images,
      },
      exactMatches: exactMatchList,
      similarMatches: similarMatchList,
    });
  };

  // Add Tenant Request with persistence & Smart Matching
  const handleAddTenantRequest = (newReq: TenantRequest) => {
    setTenantRequests((prev) => {
      const updated = [newReq, ...prev];
      safeStorageSetItem('ardaw_tenant_requests', updated);
      return updated;
    });

    // Instant background sync with Supabase production database
    dbUpsertTenantRequest(newReq).catch((err) => {
      console.warn('Supabase upsert tenant request warning:', err);
    });

    // Auto-save tenant to profiles table as 'مستأجر'
    if (newReq.tenantName && newReq.tenantPhone) {
      dbUpsertProfile({
        fullName: newReq.tenantName,
        phone: newReq.tenantPhone,
        role: 'مستأجر',
      }).catch((err) => {
        console.warn('Auto-save tenant to profiles error:', err);
      });
    }

    addToast({
      type: 'success',
      title: 'تم تسجيل طلب السكن',
      message: `تم تسجيل طلبك برقم (${newReq.requestCode || 'REQ-01'}). جاري فحص ومطابقة العروض المناسبة.`,
      duration: 5000,
    });

    // 1. حساب المتطابقات التامة (Exact Matches): [نوع العقار] + [الغرض: بيع / إيجار]
    const exactMatchList: MatchEntry[] = properties
      .filter((prop) => 
        prop.propertyType.trim().toLowerCase() === newReq.propertyType.trim().toLowerCase() &&
        prop.purpose === newReq.purpose
      )
      .map((prop) => ({ type: 'property', item: prop }));

    // 2. حساب أشباه المتطابقات (Similar Matches): تشترك في [نوع العقار] فقط حتى لو اختلف الغرض أو السعر
    const similarMatchList: MatchEntry[] = properties
      .filter((prop) => 
        prop.propertyType.trim().toLowerCase() === newReq.propertyType.trim().toLowerCase() &&
        prop.purpose !== newReq.purpose
      )
      .map((prop) => ({ type: 'property', item: prop }));

    // 3. شرط الإشعارات الفورية (Push Notifications):
    // يُرسل الإشعار التلقائي فقط عند المطابقة التامة في الشرطين معاً: [نوع العقار] + [الغرض: بيع / إيجار]
    // نص الإشعار: 🎯 "تم العثور على عرض متطابق كلياً برقم كود (AS-xxxx)!"
    if (exactMatchList.length > 0) {
      const topMatch = exactMatchList[0].item as Property;
      setTimeout(() => {
        dispatchPushNotification({
          recipientPhone: currentUser?.phone || 'all',
          recipientName: currentUser?.name || 'صاحب الطلب',
          type: 'smart_match',
          title: '🎯 تطابق ذكي فوري!',
          body: `🎯 تم العثور على عرض متطابق كلياً برقم كود (${topMatch.code})!`,
          itemCode: topMatch.code,
          itemId: topMatch.id,
          itemType: 'property',
        });
      }, 500);
    }

    // 4. واجهة النتائج المباشرة بعد التسجيل (Post-Submission UI)
    setSmartMatchModalData({
      isOpen: true,
      submittedItem: {
        id: newReq.id,
        code: newReq.requestCode || newReq.id,
        type: 'طلب',
        title: `مطلوب ${newReq.propertyType} في ${newReq.preferredDistrict}`,
        propertyType: newReq.propertyType,
        purpose: newReq.purpose,
        district: newReq.preferredDistrict,
        price: newReq.maxPrice,
        area: newReq.maxArea || newReq.minArea,
        bedrooms: newReq.bedrooms,
        bathrooms: newReq.bathrooms,
      },
      exactMatches: exactMatchList,
      similarMatches: similarMatchList,
    });
  };

  // Start Editing Property
  const handleStartEditProperty = (prop: Property) => {
    setEditingProperty(prop);
    setEditingTenantRequest(null);
    setOverlayScreen('form_entry_offer');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Start Editing Tenant Request
  const handleStartEditTenantRequest = (req: TenantRequest) => {
    setEditingTenantRequest(req);
    setEditingProperty(null);
    setOverlayScreen('form_entry_request');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Update Property in Local Storage and Database
  const handleUpdateProperty = (updatedProp: Property) => {
    setProperties((prev) => {
      const updated = prev.map((p) => (p.id === updatedProp.id ? updatedProp : p));
      safeStorageSetItem('ardaw_properties', updated);
      return updated;
    });
    dbUpsertProperty(updatedProp).catch((err) => {
      console.warn('Supabase update property failed:', err);
    });

    // Audit log for admin modifications
    logAdminActivity(
      currentUser?.name || 'مدير المنظومة',
      currentUser?.phone || '01002345678',
      'edit_operation',
      `تعديل بيانات عقار (كود: ${updatedProp.code})`,
      `العنوان: "${updatedProp.title}" - المنطقة: ${updatedProp.district} - السعر: ${updatedProp.price.toLocaleString()} ج.م - النوع: ${updatedProp.propertyType}`
    );

    setEditingProperty(null);
    setOverlayScreen('none');
    addToast({
      type: 'success',
      title: 'تم حفظ التعديلات بنجاح',
      message: `تم تحديث بيانات العقار (${updatedProp.code}) بنجاح.`,
      duration: 4000,
    });
  };

  // Update Tenant Request in Local Storage and Database
  const handleUpdateTenantRequest = (updatedReq: TenantRequest) => {
    setTenantRequests((prev) => {
      const updated = prev.map((r) => (r.id === updatedReq.id ? updatedReq : r));
      safeStorageSetItem('ardaw_tenant_requests', updated);
      return updated;
    });
    dbUpsertTenantRequest(updatedReq).catch((err) => {
      console.warn('Supabase update tenant request failed:', err);
    });

    // Audit log for admin modifications
    logAdminActivity(
      currentUser?.name || 'مدير المنظومة',
      currentUser?.phone || '01002345678',
      'edit_operation',
      `تعديل طلب سكن (كود: ${updatedReq.requestCode || updatedReq.id})`,
      `المطلوب: ${updatedReq.propertyType} في حي ${updatedReq.preferredDistrict} - الحد الأقصى للسعر: ${updatedReq.maxPrice.toLocaleString()} ج.م - العميل: ${updatedReq.tenantName}`
    );

    setEditingTenantRequest(null);
    setOverlayScreen('none');
    addToast({
      type: 'success',
      title: 'تم حفظ التعديل',
      message: `تم تحديث بيانات طلبك (${updatedReq.requestCode || updatedReq.id}) بنجاح.`,
      duration: 4000,
    });
  };

  // Update Tenant Request Status & Note
  const handleUpdateTenantRequestStatus = (reqId: string, newStatus: TenantRequest['status'], note?: string) => {
    const targetReq = tenantRequests.find((r) => r.id === reqId);
    const wasPendingReq = targetReq && (targetReq.status === 'pending_approval' || targetReq.status === 'pending' || targetReq.isApproved === false);

    let updatedReqObj: TenantRequest | null = null;
    setTenantRequests((prev) => {
      const updated = prev.map((r) => {
        if (r.id === reqId) {
          const item: TenantRequest = {
            ...r,
            status: newStatus,
            isApproved: newStatus === 'approved',
            adminNote: note !== undefined ? note : r.adminNote,
          };
          updatedReqObj = item;
          return item;
        }
        return r;
      });
      safeStorageSetItem('ardaw_tenant_requests', updated);
      return updated;
    });

    if (updatedReqObj) {
      dbUpsertTenantRequest(updatedReqObj).catch((e) => console.warn('Supabase tenant request status update failed:', e));
    }

    // In-App Push Notification on Tenant Request Status Change
    if (targetReq && wasPendingReq) {
      if (newStatus === 'approved') {
        dispatchPushNotification({
          recipientPhone: targetReq.tenantPhone || 'all',
          recipientName: targetReq.tenantName,
          type: 'approved',
          title: '🎉 تهانينا! تم اعتماد طلبك بنجاح',
          body: `تم اعتماد طلب السكن (${targetReq.requestCode || 'طلب سكن'}) في حي (${targetReq.preferredDistrict}) بنجاح وأصبح متاحاً للوسطاء والملاك.`,
          itemCode: targetReq.requestCode,
          itemId: targetReq.id,
          itemType: 'request',
        });
      } else if (newStatus === 'rejected') {
        dispatchPushNotification({
          recipientPhone: targetReq.tenantPhone || 'all',
          recipientName: targetReq.tenantName,
          type: 'rejected',
          title: '⚠️ تنبيه: تم رفض طلب السكن',
          body: `نأسف، تم رفض طلب السكن (${targetReq.requestCode || ''}). ${note ? `السبب: ${note}` : ''}`,
          adminNote: note,
          itemCode: targetReq.requestCode,
          itemId: targetReq.id,
          itemType: 'request',
        });
      }
    }

    const labelMap: Record<string, string> = {
      approved: 'معتمد وجاهز',
      rejected: 'مرفوض',
      needs_completion: 'مطلوب استكمال بيان',
      pending_approval: 'قيد المراجعة',
    };

    const statusLabel = (newStatus && labelMap[newStatus]) || newStatus || 'قيد المراجعة';

    // Audit log for tenant request status change
    logAdminActivity(
      currentUser?.name || 'مدير المنظومة',
      currentUser?.phone || '01002345678',
      newStatus === 'approved' ? 'approval' : newStatus === 'rejected' ? 'rejection' : 'edit_operation',
      `تحديث حالة طلب سكن (كود: ${targetReq?.requestCode || reqId}) إلى (${statusLabel})`,
      `العميل: ${targetReq?.tenantName || ''} (${targetReq?.tenantPhone || ''})${note ? ` - ملاحظة الإدارة: ${note}` : ''}`
    );

    addToast({
      type: newStatus === 'approved' ? 'success' : 'warning',
      title: 'تم تحديث حالة الطلب',
      message: `تم تغيير حالة طلب الإيجار إلى (${statusLabel}).`,
      duration: 3500,
    });
  };

  // Delete Tenant Request
  const handleDeleteTenantRequest = (reqId: string) => {
    const targetReq = tenantRequests.find((r) => r.id === reqId);
    setTenantRequests((prev) => {
      const updated = prev.filter((r) => r.id !== reqId);
      safeStorageSetItem('ardaw_tenant_requests', updated);
      return updated;
    });
    dbDeleteTenantRequest(reqId).catch((e) => console.warn('Supabase delete tenant request failed:', e));

    // Audit log for deletion
    logAdminActivity(
      currentUser?.name || 'مدير المنظومة',
      currentUser?.phone || '01002345678',
      'delete_operation',
      `حذف طلب سكن (كود: ${targetReq?.requestCode || reqId})`,
      `تم حذف طلب ${targetReq?.propertyType || ''} بحي ${targetReq?.preferredDistrict || ''} - صاحب الطلب: ${targetReq?.tenantName || ''} (${targetReq?.tenantPhone || ''})`
    );

    addToast({
      type: 'info',
      title: 'تم حذف الطلب',
      message: 'تم حذف طلب السكن بنجاح من المنظومة.',
      duration: 3000,
    });
  };

  // Update Property Status
  const handleUpdatePropertyStatus = (propId: string, newStatus: PropertyStatus, adminNote?: string) => {
    const targetProp = properties.find((p) => p.id === propId);
    const wasPending = targetProp && (targetProp.status === 'pending' || targetProp.status === 'pending_approval' || targetProp.isApproved === false);

    let updatedPropObj: Property | null = null;
    setProperties((prev) => {
      const updated = prev.map((p) => {
        if (p.id === propId) {
          const item: Property = {
            ...p,
            status: newStatus,
            isApproved: newStatus === 'approved',
            adminNote: adminNote !== undefined ? adminNote : p.adminNote,
          };
          updatedPropObj = item;
          return item;
        }
        return p;
      });
      safeStorageSetItem('ardaw_properties', updated);
      return updated;
    });

    if (updatedPropObj) {
      dbUpsertProperty(updatedPropObj).catch((e) => console.warn('Supabase property status update failed:', e));
    }

    // In-App Push Notification on Property Status Change
    if (targetProp && wasPending) {
      if (newStatus === 'approved') {
        dispatchPushNotification({
          recipientPhone: targetProp.ownerPhone || 'all',
          recipientName: targetProp.ownerName,
          type: 'approved',
          title: '🎉 تهانينا! تم اعتماد إعلانك بنجاح',
          body: `تمت مراجعة إعلانك (كود: ${targetProp.code} - ${targetProp.title}) والموافقة عليه من قبل إدارة المنصة، وأصبح متاحاً الآن في العروض العامة للجميع!`,
          itemCode: targetProp.code,
          itemId: targetProp.id,
          itemType: 'property',
        });
      } else if (newStatus === 'rejected') {
        dispatchPushNotification({
          recipientPhone: targetProp.ownerPhone || 'all',
          recipientName: targetProp.ownerName,
          type: 'rejected',
          title: '⚠️ تنبيه: تم رفض إعلانك',
          body: `نأسف لإبلاغك بأنه تم رفض الإعلان (كود: ${targetProp.code} - ${targetProp.title}). ${adminNote ? `السبب: ${adminNote}` : 'يرجى مراجعة إدارة المنصة أو تعديل البيانات.'}`,
          adminNote,
          itemCode: targetProp.code,
          itemId: targetProp.id,
          itemType: 'property',
        });
      } else if (newStatus === 'needs_completion') {
        dispatchPushNotification({
          recipientPhone: targetProp.ownerPhone || 'all',
          recipientName: targetProp.ownerName,
          type: 'needs_completion',
          title: '📝 تنبيه: مطلوب استكمال بيان للإعلان',
          body: `الإدارة تطلب استكمال بيانات للإعلان (كود: ${targetProp.code}). ${adminNote ? `الملاحظة: ${adminNote}` : ''}`,
          adminNote,
          itemCode: targetProp.code,
          itemId: targetProp.id,
          itemType: 'property',
        });
      }
    }

    const labelMap: Record<string, string> = {
      approved: 'معتمد ومتاح للجميع',
      rejected: 'مرفوض',
      needs_completion: 'مطلوب استكمال بيان',
      rented: 'تم تأجيره',
      sold: 'تم بيعه',
      pending_approval: 'قيد المراجعة والسداد',
      pending: 'قيد الانتظار',
    };

    // Audit log for property status change
    logAdminActivity(
      currentUser?.name || 'مدير المنظومة',
      currentUser?.phone || '01002345678',
      newStatus === 'approved' ? 'approval' : newStatus === 'rejected' ? 'rejection' : 'edit_operation',
      `تحديث حالة عقار (كود: ${targetProp?.code || propId}) إلى (${labelMap[newStatus] || newStatus})`,
      `العنوان: "${targetProp?.title || ''}" - المالك: ${targetProp?.ownerName || ''}${adminNote ? ` - ملاحظة الإدارة: ${adminNote}` : ''}`
    );

    addToast({
      type: newStatus === 'approved' ? 'success' : 'warning',
      title: 'تم تحديث حالة العقار',
      message: `تم تحديث كود العقار إلى حالة (${labelMap[newStatus] || newStatus}).`,
      duration: 3500,
    });
  };

  // Delete Property
  const handleDeleteProperty = (propId: string) => {
    const targetProp = properties.find((p) => p.id === propId);
    setProperties((prev) => {
      const updated = prev.filter((p) => p.id !== propId);
      safeStorageSetItem('ardaw_properties', updated);
      return updated;
    });
    dbDeleteProperty(propId).catch((e) => console.warn('Supabase delete property failed:', e));
    if (selectedProperty?.id === propId) {
      setSelectedProperty(null);
    }

    // Audit log for property deletion
    logAdminActivity(
      currentUser?.name || 'مدير المنظومة',
      currentUser?.phone || '01002345678',
      'delete_operation',
      `حذف عقار معروض (كود: ${targetProp?.code || propId})`,
      `العنوان: "${targetProp?.title || ''}" في منطقة ${targetProp?.district || ''} - السعر: ${targetProp?.price?.toLocaleString() || 0} ج.م - المالك: ${targetProp?.ownerName || ''} (${targetProp?.ownerPhone || ''})`
    );

    addToast({
      type: 'info',
      title: 'تم حذف العقار',
      message: 'تم حذف العقار بنجاح من قاعدة البيانات.',
      duration: 3000,
    });
  };

  // Archive Property (أرشفة الإعلان)
  const handleArchiveProperty = (propId: string) => {
    setProperties((prev) => {
      const updated = prev.map((p) => (p.id === propId ? { ...p, status: 'archived' as PropertyStatus } : p));
      safeStorageSetItem('ardaw_properties', updated);
      return updated;
    });
    addToast({
      type: 'info',
      title: 'تم أرشفة الإعلان',
      message: 'تم نقل الإعلان إلى الأرشيف ولن يظهر في العروض العامة.',
      duration: 3500,
    });
  };

  // Republish Property (إعادة نشر الإعلان)
  const handleRepublishProperty = (propId: string) => {
    setProperties((prev) => {
      const updated = prev.map((p) => (p.id === propId ? { ...p, status: 'approved' as PropertyStatus, isApproved: true } : p));
      safeStorageSetItem('ardaw_properties', updated);
      return updated;
    });
    addToast({
      type: 'success',
      title: 'تم إعادة نشر الإعلان',
      message: 'إعلانك أصبح نشطاً ومعتمداً الآن في عروض المنصة.',
      duration: 3500,
    });
  };

  // Toggle Rented or Sold status (تحديد هل تم التأجير)
  const handleToggleRentedSold = (propId: string, currentStatus: PropertyStatus) => {
    const isCurrentlyRented = currentStatus === 'rented' || currentStatus === 'sold';
    const newStatus: PropertyStatus = isCurrentlyRented ? 'approved' : 'rented';
    setProperties((prev) => {
      const updated = prev.map((p) => (p.id === propId ? { ...p, status: newStatus } : p));
      safeStorageSetItem('ardaw_properties', updated);
      return updated;
    });
    addToast({
      type: 'info',
      title: 'تم تحديث حالة الإعلان',
      message: !isCurrentlyRented ? 'تم تحديد الإعلان كـ (تم التأجير بنجاح).' : 'تم إعادة العقار إلى قائمة العروض النشطة.',
      duration: 3500,
    });
  };

  // Schedule Inspection
  const handleScheduleInspection = (inspection: Omit<ScheduledInspection, 'id' | 'createdAt' | 'status'>) => {
    const newInspection: ScheduledInspection = {
      ...inspection,
      id: `insp-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'pending',
    };
    setScheduledInspections((prev) => {
      const updated = [newInspection, ...prev];
      safeStorageSetItem('ardaw_scheduled_inspections', updated);
      return updated;
    });
    addToast({
      type: 'success',
      title: 'تم حجز موعد المعاينة!',
      message: `تم حجز معاينة كود (${inspection.propertyCode}) يوم ${inspection.preferredDate} الساعة ${inspection.preferredTime}. ستتواصل الإدارة لتأكيد الموعد.`,
      duration: 5000,
    });
  };

  // Update Inspection Status & Fee verification
  const handleUpdateInspectionStatus = (
    id: string, 
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled',
    feePaid?: boolean
  ) => {
    setScheduledInspections((prev) => {
      const updated = prev.map((i) => {
        if (i.id === id) {
          const isComp = status === 'completed';
          return {
            ...i,
            status,
            feePaid: feePaid !== undefined ? feePaid : (isComp ? true : i.feePaid),
            completedAt: isComp ? new Date().toISOString().split('T')[0] : i.completedAt,
          };
        }
        return i;
      });
      safeStorageSetItem('ardaw_scheduled_inspections', updated);
      return updated;
    });
    addToast({
      type: 'success',
      title: status === 'completed' ? 'تم إتمام المعاينة وسداد الرسوم' : 'تم تحديث المعاينة',
      message: status === 'completed' 
        ? 'تم توثيق المعاينة وسداد الرسوم بنجاح. العميل الآن مؤهل لإضافة تقييم موثق.'
        : `تم تحديث حالة المعاينة إلى (${status === 'confirmed' ? 'مؤكدة' : status}).`,
      duration: 3500,
    });
  };

  // Blocked Users Management
  const handleAddBlockedUser = (newUser: Omit<BlockedUser, 'id' | 'blockedAt'>) => {
    const newBlocked: BlockedUser = {
      ...newUser,
      id: `block-${Date.now()}`,
      blockedAt: new Date().toISOString().split('T')[0],
    };
    setBlockedUsers((prev) => {
      const updated = [newBlocked, ...prev];
      safeStorageSetItem('ardaw_blocked_users', updated);
      return updated;
    });

    // Audit log for blocking
    logAdminActivity(
      currentUser?.name || 'مدير المنظومة',
      currentUser?.phone || '01002345678',
      'block',
      `حظر مستخدم (بلوك: ${newBlocked.name})`,
      `رقم الهاتف: ${newBlocked.phone} - الدور: ${newBlocked.role} - سبب الحظر: ${newBlocked.reason}`
    );

    addToast({
      type: 'warning',
      title: 'تم تطبيق الحظر (بلوك)',
      message: `تم حظر رقم الهاتف ${newBlocked.phone} (${newBlocked.name}) بنجاح.`,
      duration: 4000,
    });
  };

  const handleRemoveBlockedUser = (id: string) => {
    const targetBlocked = blockedUsers.find((b) => b.id === id);
    setBlockedUsers((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      safeStorageSetItem('ardaw_blocked_users', updated);
      return updated;
    });

    // Audit log for unblocking (edit_operation)
    logAdminActivity(
      currentUser?.name || 'مدير المنظومة',
      currentUser?.phone || '01002345678',
      'edit_operation',
      `إلغاء حظر مستخدم (فك بلوك: ${targetBlocked?.name || 'مستخدم'})`,
      `تم فك الحظر عن رقم الهاتف: ${targetBlocked?.phone || ''}`
    );

    addToast({
      type: 'info',
      title: 'تم فك الحظر',
      message: 'تم إلغاء حظر المستخدم بنجاح.',
      duration: 3000,
    });
  };

  // Update Dropdowns with persistence
  const handleUpdateDropdownCategories = (catKey: string, updatedCat: DropdownCategory) => {
    setDropdownCategories((prev) => {
      const updated = {
        ...prev,
        [catKey]: updatedCat,
      };
      safeStorageSetItem('ardaw_dropdown_categories', updated);
      return updated;
    });
  };

  // Update Utility Definitions with persistence
  const handleUpdateUtilityDefinitions = (updatedUtils: UtilityOptionDefinition[]) => {
    setUtilityDefinitions(updatedUtils);
    safeStorageSetItem('ardaw_utility_definitions', updatedUtils);
  };

  // Reset to Assiut Presets Defaults
  const handleResetDefaults = () => {
    setDropdownCategories(INITIAL_DROPDOWN_CATEGORIES);
    setUtilityDefinitions(INITIAL_UTILITY_DEFINITIONS);
    try {
      safeStorageRemoveItem('ardaw_dropdown_categories');
      safeStorageRemoveItem('ardaw_utility_definitions');
    } catch (e) {
      console.error(e);
    }
    addToast({
      type: 'info',
      title: 'تم استعادة الضبط الافتراضي',
      message: 'تمت إعادة ضبط القوائم والخيارات إلى إعدادات محافظة أسيوط الأساسية.',
      duration: 3000,
    });
  };

  // Logout Handler: Removes user from session, clears cryptographic tokens, and redirects to '/'
  const handleLogout = () => {
    clearSecureSession();
    safeStorageRemoveItem('ardaw_current_user');
    setCurrentUser(null);
    setOverlayScreen('none');
    setNavIndex(0);
    window.history.replaceState(null, '', '/');
    addToast({
      type: 'info',
      title: 'تم تسجيل الخروج',
      message: 'تم تسجيل الخروج من الحساب بنجاح. يمكنك تسجيل الدخول مرة أخرى في أي وقت.',
      duration: 3500,
    });
  };

  // 1. IF NOT LOGGED IN: Render AuthScreen Immediately
  // Users create account (mobile as username + 4-digit PIN) or login
  if (!currentUser) {
    // Silently redirect unauthenticated visitors from /admin to '/' without leaking dashboard existence
    if (typeof window !== 'undefined' && window.location.pathname === '/admin') {
      window.history.replaceState(null, '', '/');
    }

    return (
      <div className="font-['Cairo'] select-none">
        <AuthScreen
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            if (user.role === 'admin') {
              setNavIndex(3);
              window.history.pushState(null, '', '/admin');
            } else {
              setNavIndex(0);
              window.history.replaceState(null, '', '/');
            }
            // Trigger Welcome in-app push notification
            setTimeout(() => {
              dispatchPushNotification({
                recipientPhone: user.phone,
                recipientName: user.name,
                type: 'welcome',
                title: `مرحباً بك يا ${user.name}! 👋`,
                body: `يسعدنا انضمامك إلى تطبيق سكن أسيوط. يمكنك الآن نشر ومتابعة إعلاناتك بكل سهولة.`,
              });
            }, 450);
          }}
        />
        <ToastNotification toasts={toasts} onDismiss={dismissToast} />
        {supabaseSyncError && (
          <SupabaseSyncErrorModal
            error={supabaseSyncError}
            onClose={() => setSupabaseSyncError(null)}
          />
        )}
        <InAppPushBanner
          notification={activePushBanner}
          onDismiss={() => setActivePushBanner(null)}
          onOpenDetails={handleSelectNotification}
        />
      </div>
    );
  }

  // Dynamic active options from categories
  const activeDistrictOptions = (dropdownCategories.districts?.items || []).filter((i) => i.isActive);
  const activePropertyTypeOptions = (dropdownCategories.propertyTypes?.items || []).filter((i) => i.isActive);

  // Check if current screen is dedicated FormEntryScreen (Offer / Request)
  const isFormEntry = overlayScreen === 'form_entry_offer' || overlayScreen === 'form_entry_request';

  // Dynamic page title for the dark navy header bar
  const getHeaderTitle = () => {
    if (navIndex === 0) return 'عروض الايجار والبيع';
    if (navIndex === 1 || (isAdmin && navIndex === 2)) return 'طلبات الايجار والشراء';
    if (!isAdmin && navIndex === 2) return 'إعلاناتي';
    if (navIndex === 3) return 'لوحة التحكم والإدارة';
    return 'عروض الايجار والبيع';
  };

  return (
    <div className={`min-h-screen bg-[#0B132B] flex flex-col justify-between text-slate-100 font-['Tajawal','Cairo',sans-serif] ${isFormEntry ? 'pb-0' : 'pb-24'}`}>
      
      {/* 1. Top Global Header (hidden in FormEntryScreen which has its own AppBar) */}
      {!isFormEntry && (
        <Header
          currentUser={currentUser}
          onLogout={handleLogout}
          onSelectTab={(tab) => {
            if (tab === 'home') setNavIndex(0);
            else if (tab === 'admin' && isAdmin) setNavIndex(3);
          }}
          unreadNotificationCount={unreadNotificationCount}
          onOpenNotifications={() => setIsNotificationCenterOpen(true)}
          favoritesCount={favoritePropertyIds.length}
          onOpenFavorites={() => setIsFavoritesModalOpen(true)}
          pageTitle={getHeaderTitle()}
          isAdminView={navIndex === 3}
          onToggleAdminDrawer={() => setIsAdminDrawerOpen((prev) => !prev)}
        />
      )}

      {/* Main Screen Body */}
      <main className={isFormEntry ? 'w-full flex-1' : 'max-w-5xl mx-auto w-full px-4 py-5 flex-1'}>
        
        {/* OVERLAY 0: DEDICATED FORM ENTRY SCREEN (عرض عقار / طلب عقار) */}
        {overlayScreen === 'form_entry_offer' || overlayScreen === 'form_entry_request' ? (
          <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">جاري تحميل شاشة التسجيل...</div>}>
            <FormEntryScreen
              isOffer={overlayScreen === 'form_entry_offer'}
              isAdmin={isAdmin}
              currentUser={currentUser}
              editingProperty={editingProperty || undefined}
              editingTenantRequest={editingTenantRequest || undefined}
              onBack={() => {
                setEditingProperty(null);
                setEditingTenantRequest(null);
                setOverlayScreen('none');
              }}
              onAddProperty={handleAddProperty}
              onAddTenantRequest={handleAddTenantRequest}
              onUpdateProperty={handleUpdateProperty}
              onUpdateTenantRequest={handleUpdateTenantRequest}
              dropdownCategories={dropdownCategories}
              utilityDefinitions={utilityDefinitions}
            />
          </Suspense>
        ) : navIndex === 0 ? (
          /* ========================================================================= */
          /* 1. صفحة عروض الإيجار (المتاحة) - Index 0 */
          /* ========================================================================= */
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Page Title Banner Card: Luxury Navy #0F172A with 16px padding and smooth rounded corners */}
            <div className="bg-[#0F172A] text-white p-4 rounded-[14px] shadow-[0_4px_20px_rgba(15,23,42,0.12)] border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                  <Building2 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-white tracking-normal font-['Tajawal','Cairo',sans-serif]">
                    عروض الايجار والبيع
                  </h1>
                  <p className="text-xs text-slate-300 font-normal mt-0.5">
                    عقارات وشقق متاحة في محافظة أسيوط
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-3 py-1 rounded-lg shrink-0">
                {filteredProperties.length} عقار
              </span>
            </div>

            {/* Unified Compact Search Bar with Integrated Filter Dropdown */}
            <div className="relative w-full">
              <div className="relative flex items-center h-12 bg-slate-900 border border-slate-800 rounded-[14px] shadow-md px-3.5 focus-within:border-amber-400/80 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all">
                {/* Search Icon on Right (RTL start) */}
                <Search className="w-5 h-5 text-amber-400 shrink-0 ml-2.5" />

                {/* Search Input with user's requested clear placeholder */}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالمنطقة، نوع العقار، أو الكود..."
                  className="w-full bg-transparent text-white placeholder:text-slate-400 text-xs sm:text-sm font-medium focus:outline-hidden py-2"
                />

                {/* Clear search text button */}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-1.5"
                    title="مسح البحث"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {/* Subtle vertical separator */}
                <div className="h-6 w-px bg-slate-800 shrink-0 mx-1.5 sm:mx-2" />

                {/* Integrated Filter Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsOffersFilterOpen(!isOffersFilterOpen)}
                  className={`relative flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    (selectedDistrict !== 'all' || selectedPropertyType !== 'all')
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-xs'
                      : isOffersFilterOpen
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800/80'
                  }`}
                  title="تصفية حسب المنطقة ونوع العقار"
                >
                  <SlidersHorizontal className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="hidden xs:inline sm:inline">تصفية</span>
                  {(selectedDistrict !== 'all' || selectedPropertyType !== 'all') && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  )}
                </button>
              </div>

              {/* Integrated Dropdown Popover for Districts & Property Types */}
              {isOffersFilterOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setIsOffersFilterOpen(false)} 
                  />
                  <div className="absolute left-0 right-0 top-full mt-2 z-40 bg-[#0F172A] border border-slate-800 rounded-xl p-3.5 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-white">تصفية العروض (المناطق + نوع العقار)</span>
                      </div>
                      {(selectedDistrict !== 'all' || selectedPropertyType !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDistrict('all');
                            setSelectedPropertyType('all');
                          }}
                          className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
                        >
                          إعادة ضبط
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Filter 1: Districts (المناطق) */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-400" />
                          <span>المنطقة أو الحي:</span>
                        </label>
                        <select
                          value={selectedDistrict}
                          onChange={(e) => setSelectedDistrict(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs font-medium focus:outline-hidden focus:border-amber-400 transition-colors"
                        >
                          <option value="all">جميع أحياء ومناطق أسيوط</option>
                          {activeDistrictOptions.map((opt) => (
                            <option key={opt.id} value={opt.name}>
                              {opt.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Filter 2: Property Type (نوع الوحدة) */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-amber-400" />
                          <span>نوع الوحدة:</span>
                        </label>
                        <select
                          value={selectedPropertyType}
                          onChange={(e) => setSelectedPropertyType(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs font-medium focus:outline-hidden focus:border-amber-400 transition-colors"
                        >
                          <option value="all">جميع أنواع الوحدات</option>
                          {activePropertyTypeOptions.map((opt) => (
                            <option key={opt.id} value={opt.name}>
                              {opt.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-400">
                        النتائج المطابقة: <strong className="text-amber-400">{filteredProperties.length}</strong> عقار
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsOffersFilterOpen(false)}
                        className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors cursor-pointer text-center"
                      >
                        تم وعرض النتائج
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Active Filter Badges for quick 1-click removal */}
              {(selectedDistrict !== 'all' || selectedPropertyType !== 'all') && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-400">الفلاتر المطبقة:</span>
                  {selectedDistrict !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedDistrict('all')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[11px] font-semibold hover:bg-amber-400/25 transition-colors cursor-pointer"
                      title="إزالة فلتر المنطقة"
                    >
                      <MapPin className="w-3 h-3 text-amber-400" />
                      <span>{selectedDistrict}</span>
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  {selectedPropertyType !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedPropertyType('all')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[11px] font-semibold hover:bg-amber-400/25 transition-colors cursor-pointer"
                      title="إزالة فلتر نوع العقار"
                    >
                      <Building className="w-3 h-3 text-amber-400" />
                      <span>{selectedPropertyType}</span>
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDistrict('all');
                      setSelectedPropertyType('all');
                    }}
                    className="text-[11px] text-slate-400 hover:text-white underline mr-1 cursor-pointer"
                  >
                    مسح الكل
                  </button>
                </div>
              )}
            </div>

            {/* Purpose Filter Bar: 3 Tabs (كل المعروض | عروض الإيجار | عروض البيع) */}
            <div className="w-full pt-0.5">
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full">
                {/* 1. على اليمين: كل المعروض */}
                <button
                  type="button"
                  onClick={() => setPurposeFilter('all')}
                  className={`py-2 px-1 text-center rounded-[12px] text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    purposeFilter === 'all'
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-sm ring-1 ring-slate-700'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 shadow-sm hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  كل المعروض ({properties.filter((p) => isAdmin || p.status === 'approved' || p.status === 'rented' || p.status === 'sold').length})
                </button>

                {/* 2. في الوسط: عروض الإيجار */}
                <button
                  type="button"
                  onClick={() => setPurposeFilter('rent')}
                  className={`py-2 px-1 text-center rounded-[12px] text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    purposeFilter === 'rent'
                      ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-500'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 shadow-sm hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  عروض الإيجار ({properties.filter((p) => p.purpose === 'rent' && (isAdmin || p.status === 'approved')).length})
                </button>

                {/* 3. على اليسار: عروض البيع */}
                <button
                  type="button"
                  onClick={() => setPurposeFilter('sale')}
                  className={`py-2 px-1 text-center rounded-[12px] text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    purposeFilter === 'sale'
                      ? 'bg-amber-500 text-slate-950 shadow-sm ring-1 ring-amber-400 font-black'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 shadow-sm hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  عروض البيع ({properties.filter((p) => p.purpose === 'sale' && (isAdmin || p.status === 'approved')).length})
                </button>
              </div>
            </div>

            {/* Active Filters Summary Chips Bar */}
            {(selectedDistrict !== 'all' || selectedPropertyType !== 'all' || searchQuery || purposeFilter !== 'all' || excludeEnded) && (
              <div className="flex items-center justify-between text-xs px-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-400 font-medium">الفلاتر المحددة:</span>
                  {selectedDistrict !== 'all' && (
                    <span className="bg-slate-800 text-amber-400 font-semibold px-2 py-0.5 rounded-[8px] border border-slate-700">
                      {selectedDistrict}
                    </span>
                  )}
                  {selectedPropertyType !== 'all' && (
                    <span className="bg-slate-800 text-amber-400 font-semibold px-2 py-0.5 rounded-[8px] border border-slate-700">
                      {selectedPropertyType}
                    </span>
                  )}
                  {purposeFilter === 'rent' && (
                    <span className="bg-blue-900/60 text-blue-300 font-semibold px-2 py-0.5 rounded-[8px] border border-blue-700">
                      عروض الإيجار
                    </span>
                  )}
                  {purposeFilter === 'sale' && (
                    <span className="bg-amber-950/80 text-amber-300 font-semibold px-2 py-0.5 rounded-[8px] border border-amber-800">
                      عروض البيع
                    </span>
                  )}
                  {excludeEnded && (
                    <span className="bg-amber-950/80 text-amber-300 font-semibold px-2 py-0.5 rounded-[8px] border border-amber-800">
                      استبعاد المنتهي (مؤجر/مباع)
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedDistrict('all');
                    setSelectedPropertyType('all');
                    setSearchQuery('');
                    setPurposeFilter('all');
                    setExcludeEnded(false);
                  }}
                  className="text-xs text-rose-400 hover:underline font-semibold cursor-pointer shrink-0"
                >
                  مسح الفلاتر
                </button>
              </div>
            )}

            {/* Property Cards List */}
            {filteredProperties.length === 0 ? (
              <div className="bg-slate-900 p-12 rounded-[14px] text-center border border-slate-800 shadow-md space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 text-amber-400 flex items-center justify-center mx-auto border border-slate-700">
                  <Building2 className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-white text-base">لا توجد عقارات مطابقة للبحث</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  جرب تغيير كلمات البحث أو تصفية الأحياء والخيارات للاطلاع على المزيد من العقارات المتاحة
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedDistrict('all');
                    setSelectedPropertyType('all');
                    setPurposeFilter('all');
                  }}
                  className="px-4 py-2 rounded-[10px] bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs transition-colors border border-slate-700 cursor-pointer"
                >
                  إعادة ضبط الفلاتر
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProperties.map((prop) => (
                  <PropertyCard
                    key={prop.id}
                    property={prop}
                    onOpenDetails={(p) => setSelectedProperty(p)}
                    onEdit={handleStartEditProperty}
                    onRequestInspection={(p) => {
                      setSelectedPropertyForInspection(p);
                      setIsInspectionModalOpen(true);
                    }}
                    isFavorite={favoriteIdsSet.has(prop.id)}
                    onToggleFavorite={handleToggleFavorite}
                    ratingSummary={getPropertyRatingSummary(prop.id)}
                    onOpenRatingModal={(p) => setRatingModalProperty(p)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (navIndex === 1 || (isAdmin && navIndex === 2)) ? (
          /* ========================================================================= */
          /* 2. شاشة طلبات الإيجار والشراء (المطلوبة) - Index 1 لكلا الواجهتين */
          /* ========================================================================= */
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Page Title Banner Card: Luxury Navy #0F172A with 16px padding and smooth rounded corners */}
            <div className="bg-[#0F172A] text-white p-4 rounded-[14px] shadow-[0_4px_20px_rgba(15,23,42,0.12)] border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                  <ClipboardList className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-white tracking-normal font-['Tajawal','Cairo',sans-serif]">
                    طلبات الايجار والشراء
                  </h1>
                  <p className="text-xs text-slate-300 font-normal mt-0.5">
                    طلبات السكن والوحدات المطلوبة في أسيوط
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-lg shrink-0">
                {tenantRequests.filter((r) => isAdmin || r.status === 'approved' || r.isApproved !== false).length} طلب
              </span>
            </div>

            {/* Unified Compact Search Bar with Integrated Filter Dropdown */}
            <div className="relative w-full">
              <div className="relative flex items-center h-12 bg-slate-900 border border-slate-800 rounded-[14px] shadow-md px-3.5 focus-within:border-amber-400/80 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all">
                {/* Search Icon on Right (RTL start) */}
                <Search className="w-5 h-5 text-amber-400 shrink-0 ml-2.5" />

                {/* Search Input with user's requested clear placeholder */}
                <input
                  type="text"
                  value={requestSearchQuery}
                  onChange={(e) => setRequestSearchQuery(e.target.value)}
                  placeholder="ابحث بالمنطقة، نوع العقار، أو الكود..."
                  className="w-full bg-transparent text-white placeholder:text-slate-400 text-xs sm:text-sm font-medium focus:outline-hidden py-2"
                />

                {/* Clear search text button */}
                {requestSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setRequestSearchQuery('')}
                    className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-1.5"
                    title="مسح البحث"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {/* Subtle vertical separator */}
                <div className="h-6 w-px bg-slate-800 shrink-0 mx-1.5 sm:mx-2" />

                {/* Integrated Filter Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsRequestsFilterOpen(!isRequestsFilterOpen)}
                  className={`relative flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    (requestDistrict !== 'all' || requestPropertyType !== 'all')
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-xs'
                      : isRequestsFilterOpen
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800/80'
                  }`}
                  title="تصفية حسب المنطقة ونوع الوحدة المطلوبة"
                >
                  <SlidersHorizontal className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="hidden xs:inline sm:inline">تصفية</span>
                  {(requestDistrict !== 'all' || requestPropertyType !== 'all') && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  )}
                </button>
              </div>

              {/* Integrated Dropdown Popover for Districts & Property Types */}
              {isRequestsFilterOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setIsRequestsFilterOpen(false)} 
                  />
                  <div className="absolute left-0 right-0 top-full mt-2 z-40 bg-[#0F172A] border border-slate-800 rounded-xl p-3.5 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-white">تصفية الطلبات (المناطق + نوع الوحدة)</span>
                      </div>
                      {(requestDistrict !== 'all' || requestPropertyType !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setRequestDistrict('all');
                            setRequestPropertyType('all');
                          }}
                          className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
                        >
                          إعادة ضبط
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Filter 1: Districts (المناطق) */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-400" />
                          <span>المنطقة أو الحي المطلوب:</span>
                        </label>
                        <select
                          value={requestDistrict}
                          onChange={(e) => setRequestDistrict(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs font-medium focus:outline-hidden focus:border-amber-400 transition-colors"
                        >
                          <option value="all">جميع أحياء ومناطق أسيوط</option>
                          {activeDistrictOptions.map((opt) => (
                            <option key={opt.id} value={opt.name}>
                              {opt.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Filter 2: Property Type (نوع الوحدة) */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-amber-400" />
                          <span>نوع الوحدة المطلوبة:</span>
                        </label>
                        <select
                          value={requestPropertyType}
                          onChange={(e) => setRequestPropertyType(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs font-medium focus:outline-hidden focus:border-amber-400 transition-colors"
                        >
                          <option value="all">جميع أنواع الوحدات المطلوبة</option>
                          {activePropertyTypeOptions.map((opt) => (
                            <option key={opt.id} value={opt.name}>
                              {opt.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-400">
                        النتائج المطابقة: <strong className="text-amber-400">{filteredTenantRequests.length}</strong> طلب
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsRequestsFilterOpen(false)}
                        className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors cursor-pointer text-center"
                      >
                        تم وعرض النتائج
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Active Filter Badges for quick 1-click removal */}
              {(requestDistrict !== 'all' || requestPropertyType !== 'all') && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-400">الفلاتر المطبقة:</span>
                  {requestDistrict !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setRequestDistrict('all')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[11px] font-semibold hover:bg-amber-400/25 transition-colors cursor-pointer"
                      title="إزالة فلتر المنطقة"
                    >
                      <MapPin className="w-3 h-3 text-amber-400" />
                      <span>{requestDistrict}</span>
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  {requestPropertyType !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setRequestPropertyType('all')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[11px] font-semibold hover:bg-amber-400/25 transition-colors cursor-pointer"
                      title="إزالة فلتر نوع العقار"
                    >
                      <Building className="w-3 h-3 text-amber-400" />
                      <span>{requestPropertyType}</span>
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setRequestDistrict('all');
                      setRequestPropertyType('all');
                    }}
                    className="text-[11px] text-slate-400 hover:text-white underline mr-1 cursor-pointer"
                  >
                    مسح الكل
                  </button>
                </div>
              )}
            </div>

            {/* Purpose Filter Bar: 3 Tabs (كل الطلبات | طلبات الإيجار | طلبات البيع) */}
            <div className="w-full pt-0.5">
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full">
                {/* 1. على اليمين: كل الطلبات */}
                <button
                  type="button"
                  onClick={() => setRequestPurpose('all')}
                  className={`py-2 px-1 text-center rounded-[12px] text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    requestPurpose === 'all'
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-sm ring-1 ring-slate-700'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 shadow-sm hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  كل الطلبات ({tenantRequests.filter((r) => isAdmin || r.status === 'approved' || r.isApproved !== false).length})
                </button>

                {/* 2. في الوسط: طلبات الإيجار */}
                <button
                  type="button"
                  onClick={() => setRequestPurpose('rent')}
                  className={`py-2 px-1 text-center rounded-[12px] text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    requestPurpose === 'rent'
                      ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-500'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 shadow-sm hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  طلبات الإيجار ({tenantRequests.filter((r) => r.purpose === 'rent' && (isAdmin || r.status === 'approved' || r.isApproved !== false)).length})
                </button>

                {/* 3. على اليسار: طلبات البيع */}
                <button
                  type="button"
                  onClick={() => setRequestPurpose('sale')}
                  className={`py-2 px-1 text-center rounded-[12px] text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    requestPurpose === 'sale'
                      ? 'bg-amber-500 text-slate-950 shadow-sm ring-1 ring-amber-400 font-black'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 shadow-sm hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  طلبات البيع ({tenantRequests.filter((r) => r.purpose === 'sale' && (isAdmin || r.status === 'approved' || r.isApproved !== false)).length})
                </button>
              </div>
            </div>

            {/* Active Filters Summary Chips Bar */}
            {(requestDistrict !== 'all' || requestPropertyType !== 'all' || requestSearchQuery || requestPurpose !== 'all') && (
              <div className="flex items-center justify-between text-xs px-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-400 font-medium">الفلاتر المحددة:</span>
                  {requestDistrict !== 'all' && (
                    <span className="bg-slate-800 text-amber-400 font-semibold px-2 py-0.5 rounded-[8px] border border-slate-700">
                      {requestDistrict}
                    </span>
                  )}
                  {requestPropertyType !== 'all' && (
                    <span className="bg-slate-800 text-amber-400 font-semibold px-2 py-0.5 rounded-[8px] border border-slate-700">
                      {requestPropertyType}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setRequestDistrict('all');
                    setRequestPropertyType('all');
                    setRequestSearchQuery('');
                    setRequestPurpose('all');
                  }}
                  className="text-xs text-rose-400 hover:underline font-semibold cursor-pointer shrink-0"
                >
                  مسح الفلاتر
                </button>
              </div>
            )}

            {/* Requests Cards List: Unified 3-column responsive grid matching PropertyCard */}
            {filteredTenantRequests.length === 0 ? (
              <div className="bg-slate-900 p-12 rounded-[14px] text-center border border-slate-800 shadow-md space-y-3 text-slate-300">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 text-amber-400 flex items-center justify-center mx-auto border border-slate-700">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-white text-base">لا توجد طلبات مسجلة مطابقة</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  كن أول من يسجل طلبه العقاري للحصول على عروض فورية من ملاك العقارات والوسطاء
                </p>
                <button
                  onClick={() => setOverlayScreen('form_entry_request')}
                  className="px-4 py-2 rounded-[10px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <PersonSearch className="w-3.5 h-3.5 text-slate-950" />
                  <span>إضافة طلب جديد</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTenantRequests.map((req) => (
                  <TenantRequestCard
                    key={req.id}
                    request={req}
                    onEdit={handleStartEditTenantRequest}
                    onOpenDetails={(r) => setSelectedTenantRequest(r)}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (!isAdmin && navIndex === 2) ? (
          /* ========================================================================= */
          /* 4. شاشة إعلاناتي (للمستخدم العادي فقط) - Index 2 */
          /* ========================================================================= */
          <div className="animate-in fade-in duration-150">
            <MyAdsScreen
              currentUser={currentUser}
              properties={properties}
              tenantRequests={tenantRequests}
              inspections={scheduledInspections}
              onEditProperty={handleStartEditProperty}
              onDeleteProperty={handleDeleteProperty}
              onArchiveProperty={handleArchiveProperty}
              onRepublishProperty={handleRepublishProperty}
              onToggleRentedSold={handleToggleRentedSold}
              onOpenDetails={(p) => setSelectedProperty(p)}
              onOpenAddOffer={() => {
                setEditingProperty(null);
                setEditingTenantRequest(null);
                setOverlayScreen('form_entry_offer');
              }}
              onOpenAddRequest={() => {
                setEditingProperty(null);
                setEditingTenantRequest(null);
                setOverlayScreen('form_entry_request');
              }}
              onEditTenantRequest={handleStartEditTenantRequest}
              onDeleteTenantRequest={handleDeleteTenantRequest}
              onTestPushNotification={handleTriggerSimulatedNotification}
              favoriteProperties={favoriteProperties}
              onToggleFavorite={handleToggleFavorite}
            />
          </div>
        ) : navIndex === 3 ? (
          /* ========================================================================= */
          /* 5. شاشة لوحة التحكم الإدارية (AdminPanel) - محمية بـ ProtectedRoute */
          /* ========================================================================= */
          <ProtectedRoute
            currentUser={currentUser}
            requiredRole="admin"
            redirectTo="/"
            onUnauthorized={() => {
              setNavIndex(0);
            }}
          >
            <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">جاري تحميل لوحة التحكم...</div>}>
              <div className="animate-in fade-in duration-150">
                <AdminPanel
                  currentUser={currentUser}
                  properties={properties}
                  onUpdatePropertyStatus={handleUpdatePropertyStatus}
                  onOpenDetails={(p) => setSelectedProperty(p)}
                  onDeleteProperty={handleDeleteProperty}
                  onEditProperty={handleStartEditProperty}
                  tenantRequests={tenantRequests}
                  onOpenTenantRequestDetails={(r) => setSelectedTenantRequest(r)}
                  onUpdateTenantRequestStatus={handleUpdateTenantRequestStatus}
                  onEditTenantRequest={handleStartEditTenantRequest}
                  onDeleteTenantRequest={handleDeleteTenantRequest}
                  dropdownCategories={dropdownCategories}
                  onUpdateDropdownCategories={handleUpdateDropdownCategories}
                  utilityDefinitions={utilityDefinitions}
                  onUpdateUtilityDefinitions={handleUpdateUtilityDefinitions}
                  onResetDefaults={handleResetDefaults}
                  onLockAdmin={handleLogout}
                  inspections={scheduledInspections}
                  blockedUsers={blockedUsers}
                  onAddBlockedUser={handleAddBlockedUser}
                  onRemoveBlockedUser={handleRemoveBlockedUser}
                  onUpdateInspectionStatus={handleUpdateInspectionStatus}
                  isDrawerOpen={isAdminDrawerOpen}
                  setIsDrawerOpen={setIsAdminDrawerOpen}
                  onCloseDrawer={() => setIsAdminDrawerOpen(false)}
                />
              </div>
            </Suspense>
          </ProtectedRoute>
        ) : (
          /* Fallback for regular user or out-of-range index */
          <div className="text-center py-10">
            <button
              onClick={() => setNavIndex(0)}
              className="px-4 py-2 rounded-xl bg-[#002B49] text-[#FFB300] font-bold text-xs"
            >
              العودة لعروض الإيجار
            </button>
          </div>
        )}
      </main>

      {/* 2. Bottom Navigation Bar matching User Type Specifications */}
      {!isFormEntry && (
        <BottomNavBar
          currentIndex={navIndex}
          userRole={isAdmin ? 'admin' : 'user'}
          onSelectIndex={(index) => {
            setOverlayScreen('none');
            setNavIndex(index as NavTabIndex);
          }}
          onOpenAddModal={() => setIsChoiceAddOpen(true)}
          pendingInspectionsCount={scheduledInspections.filter((i) => i.status === 'pending').length}
          tenantRequestsCount={tenantRequests.length}
          myAdsCount={myAdsCount}
        />
      )}

      {/* Center Golden Docked FAB (+) Modal Bottom Sheet */}
      {isChoiceAddOpen && (
        <div 
          onClick={() => setIsChoiceAddOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in select-none"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-[24px] sm:rounded-[24px] p-5 max-w-md w-full shadow-2xl border border-slate-100 animate-in slide-in-from-bottom duration-200"
          >
            {/* Top drag handle */}
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-4" />

            <h3 className="text-lg font-bold text-[#002B49] text-center mb-5">
              اختر نوع الإدخال
            </h3>

            <div className="space-y-3">
              {/* Option 1: عرض عقار */}
              <div
                onClick={() => {
                  setEditingProperty(null);
                  setEditingTenantRequest(null);
                  setIsChoiceAddOpen(false);
                  setOverlayScreen('form_entry_offer');
                }}
                className="bg-[#002B49] hover:bg-[#001D33] text-white p-3.5 rounded-2xl cursor-pointer flex items-center justify-between transition-all shadow-md group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#FFB300]">
                    <RealEstateAgent className="w-6 h-6 text-[#FFB300]" />
                  </div>
                  <div className="text-right">
                    <h4 className="font-bold text-sm text-white">عرض عقار</h4>
                    <p className="text-[11px] text-white/70">للمالك أو المعلن لإضافة عقار متاح للإيجار أو البيع</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white group-hover:-translate-x-1 transition-transform" />
              </div>

              {/* Option 2: طلب عقار */}
              <div
                onClick={() => {
                  setEditingProperty(null);
                  setEditingTenantRequest(null);
                  setIsChoiceAddOpen(false);
                  setOverlayScreen('form_entry_request');
                }}
                className="bg-[#FFB300] hover:bg-[#FFA000] text-black p-3.5 rounded-2xl cursor-pointer flex items-center justify-between transition-all shadow-md group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center text-black">
                    <PersonSearch className="w-6 h-6 text-black" />
                  </div>
                  <div className="text-right">
                    <h4 className="font-bold text-sm text-black">طلب عقار</h4>
                    <p className="text-[11px] text-black/80 font-medium">للمستأجر أو المشتري للبحث عن عقار بمواصفات محددة</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-black group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>

            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={() => setIsChoiceAddOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modals wrapped in Suspense for optimal bundle size */}
      <Suspense fallback={null}>
        {/* Property Details Modal */}
        {selectedProperty && (
          <PropertyDetailsModal
            property={selectedProperty}
            onClose={() => setSelectedProperty(null)}
            isAdmin={isAdmin}
            onEdit={(p) => {
              setSelectedProperty(null);
              handleStartEditProperty(p);
            }}
            onScheduleInspection={(p) => {
              setSelectedPropertyForInspection(p);
              setIsInspectionModalOpen(true);
            }}
            ratingSummary={getPropertyRatingSummary(selectedProperty.id)}
            onOpenRatingModal={(p) => setRatingModalProperty(p)}
          />
        )}

        {/* Inspection Modal */}
        {isInspectionModalOpen && (
          <InspectionModal
            property={selectedPropertyForInspection}
            isOpen={isInspectionModalOpen}
            onClose={() => {
              setIsInspectionModalOpen(false);
              setSelectedPropertyForInspection(null);
            }}
            onScheduleSuccess={handleScheduleInspection}
          />
        )}

        {/* Smart Matching Post-Submission Results Modal */}
        {smartMatchModalData.isOpen && (
          <SmartMatchingResultsModal
            isOpen={smartMatchModalData.isOpen}
            onClose={() => setSmartMatchModalData((prev) => ({ ...prev, isOpen: false }))}
            submittedItem={smartMatchModalData.submittedItem}
            exactMatches={smartMatchModalData.exactMatches}
            similarMatches={smartMatchModalData.similarMatches}
            onViewProperty={(prop) => {
              setSelectedProperty(prop);
            }}
            onViewRequest={(req) => {
              setSelectedTenantRequest(req);
            }}
          />
        )}

        {/* Tenant Request Details Modal */}
        {selectedTenantRequest && (
          <TenantRequestDetailsModal
            request={selectedTenantRequest}
            onClose={() => setSelectedTenantRequest(null)}
            isAdmin={isAdmin}
            onEdit={(r) => {
              setSelectedTenantRequest(null);
              handleStartEditTenantRequest(r);
            }}
          />
        )}

        {/* In-App Push Notification Center Modal */}
        <NotificationCenterModal
          isOpen={isNotificationCenterOpen}
          onClose={() => setIsNotificationCenterOpen(false)}
          notifications={userNotifications}
          onMarkAllAsRead={handleMarkAllNotificationsAsRead}
          onClearAll={handleClearAllNotifications}
          onSelectNotification={handleSelectNotification}
          onTriggerSimulatedNotification={handleTriggerSimulatedNotification}
        />

        {/* Saved Search Criteria Modal */}
        <SavedSearchModal
          isOpen={isSavedSearchModalOpen}
          onClose={() => setIsSavedSearchModalOpen(false)}
          savedSearches={savedSearches}
          currentCriteria={{
            district: selectedDistrict,
            propertyType: selectedPropertyType,
            minPrice,
            maxPrice,
            purpose: purposeFilter,
          }}
          onApplyCriteria={handleApplyCriteria}
          onSaveCurrentCriteria={handleSaveCurrentCriteria}
          onDeleteCriteria={handleDeleteCriteria}
          onClearAllCriteria={handleClearAllCriteria}
        />

        {/* Favorite Properties List Modal */}
        {isFavoritesModalOpen && (
          <FavoritesModal
            isOpen={isFavoritesModalOpen}
            onClose={() => setIsFavoritesModalOpen(false)}
            favoriteProperties={favoriteProperties}
            onRemoveFavorite={handleToggleFavorite}
            onOpenDetails={(p) => setSelectedProperty(p)}
            onBrowseListings={() => {
              setIsFavoritesModalOpen(false);
              setNavIndex(0);
            }}
          />
        )}

        {/* Verified 5-Star Property Rating Modal */}
        {ratingModalProperty && (
          <PropertyRatingModal
            isOpen={Boolean(ratingModalProperty)}
            property={ratingModalProperty}
            onClose={() => setRatingModalProperty(null)}
            currentUser={currentUser}
            inspections={scheduledInspections}
            propertyRatings={propertyRatings}
            onSubmitRating={handleSubmitRating}
            onRequestInspection={(p) => {
              setRatingModalProperty(null);
              setSelectedPropertyForInspection(p);
              setIsInspectionModalOpen(true);
            }}
          />
        )}
      </Suspense>

      {/* Supabase Database Error / Alert Modal */}
      {supabaseSyncError && (
        <SupabaseSyncErrorModal
          error={supabaseSyncError}
          onClose={() => setSupabaseSyncError(null)}
          onOpenSupabaseSettings={() => {
            setSupabaseSyncError(null);
            setOverlayScreen('none');
            setNavIndex(3);
          }}
        />
      )}

      {/* In-App Toast Notifications */}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />

      {/* In-App Push Notification Banner */}
      <InAppPushBanner
        notification={activePushBanner}
        onDismiss={() => setActivePushBanner(null)}
        onOpenDetails={handleSelectNotification}
      />
    </div>
  );
}

export default App;
