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
import { AuthScreen } from './components/AuthScreen';
import { MyAdsScreen } from './components/MyAdsScreen';
import { InAppPushBanner } from './components/InAppPushBanner';
import { ProtectedRoute } from './components/ProtectedRoute';
import { isSecureAdminSession, clearSecureSession } from './utils/security';
import { playPushChime } from './utils/pushSound';
import { RealEstateAgent, PersonSearch } from './components/FlutterIcons';
import type { SubmittedSummaryItem, MatchEntry } from './components/SmartMatchingResultsModal';

// Code-split heavy components & modals for minimal initial bundle and fast startup
const AdminPanel = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const FormEntryScreen = lazy(() => import('./components/FormEntryScreen').then(m => ({ default: m.FormEntryScreen })));
const PropertyDetailsModal = lazy(() => import('./components/PropertyDetailsModal').then(m => ({ default: m.PropertyDetailsModal })));
const TenantRequestDetailsModal = lazy(() => import('./components/TenantRequestDetailsModal').then(m => ({ default: m.TenantRequestDetailsModal })));
const InspectionModal = lazy(() => import('./components/InspectionModal').then(m => ({ default: m.InspectionModal })));
const NotificationCenterModal = lazy(() => import('./components/NotificationCenterModal').then(m => ({ default: m.NotificationCenterModal })));
const SmartMatchingResultsModal = lazy(() => import('./components/SmartMatchingResultsModal').then(m => ({ default: m.SmartMatchingResultsModal })));
const SavedSearchModal = lazy(() => import('./components/SavedSearchModal').then(m => ({ default: m.SavedSearchModal })));
const FavoritesModal = lazy(() => import('./components/FavoritesModal').then(m => ({ default: m.FavoritesModal })));
const PropertyRatingModal = lazy(() => import('./components/PropertyRatingModal').then(m => ({ default: m.PropertyRatingModal })));
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
  Heart
} from 'lucide-react';

/**
 * Main Application: منصة عرض وطلب - محافظة أسيوط
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
  // Current Logged-in User (Stored in LocalStorage)
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem('ardaw_current_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading current user:', e);
    }
    return null;
  });

  const isAdmin = currentUser?.role === 'admin';

  // Navigation Tab Index initialized with secure route check
  // For Regular User: 0 = عروض الإيجار, 1 = طلبات الإيجار, 2 = إعلاناتي
  // For Admin: 0 = عروض الإيجار, 1 = طلبات الإيجار, 3 = لوحة التحكم
  const [navIndex, setNavIndex] = useState<NavTabIndex>(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/admin') {
      try {
        const saved = localStorage.getItem('ardaw_current_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.role === 'admin') return 3;
        }
      } catch (e) {
        console.error(e);
      }
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

  // Application Data States with Persistence
  const [properties, setProperties] = useState<Property[]>(() => {
    try {
      const saved = localStorage.getItem('ardaw_properties');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading properties from localStorage', e);
    }
    return INITIAL_PROPERTIES;
  });

  const [tenantRequests, setTenantRequests] = useState<TenantRequest[]>(() => {
    try {
      const saved = localStorage.getItem('ardaw_tenant_requests');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading tenant requests from localStorage', e);
    }
    return INITIAL_TENANT_REQUESTS;
  });

  const [scheduledInspections, setScheduledInspections] = useState<ScheduledInspection[]>(() => {
    try {
      const saved = localStorage.getItem('ardaw_scheduled_inspections');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading inspections from localStorage', e);
    }
    return INITIAL_SCHEDULED_INSPECTIONS;
  });

  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>(() => {
    try {
      const saved = localStorage.getItem('ardaw_blocked_users');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading blocked users from localStorage', e);
    }
    return INITIAL_BLOCKED_USERS;
  });
  
  // Dynamic categories with localStorage persistence
  const [dropdownCategories, setDropdownCategories] = useState<Record<string, DropdownCategory>>(() => {
    try {
      const saved = localStorage.getItem('ardaw_dropdown_categories');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading dropdown categories from localStorage', e);
    }
    return INITIAL_DROPDOWN_CATEGORIES;
  });

  // Dynamic utilities and meter options with localStorage persistence
  const [utilityDefinitions, setUtilityDefinitions] = useState<UtilityOptionDefinition[]>(() => {
    try {
      const saved = localStorage.getItem('ardaw_utility_definitions');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading utility definitions from localStorage', e);
    }
    return INITIAL_UTILITY_DEFINITIONS;
  });

  // Search & Filter State for Listings
  const [searchQuery, setSearchQuery] = useState('');
  const [purposeFilter, setPurposeFilter] = useState<'all' | 'rent' | 'sale'>('rent');
  const [selectedDistrict, setSelectedDistrict] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('ardaw_last_search_criteria');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.district) return parsed.district;
      }
    } catch (e) {
      // ignore
    }
    return 'all';
  });
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('ardaw_last_search_criteria');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.propertyType) return parsed.propertyType;
      }
    } catch (e) {
      // ignore
    }
    return 'all';
  });
  const [minPrice, setMinPrice] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('ardaw_last_search_criteria');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.minPrice) return String(parsed.minPrice);
      }
    } catch (e) {
      // ignore
    }
    return '';
  });
  const [maxPrice, setMaxPrice] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('ardaw_last_search_criteria');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.maxPrice) return String(parsed.maxPrice);
      }
    } catch (e) {
      // ignore
    }
    return '';
  });

  // Saved Search Criteria (localStorage)
  const [savedSearches, setSavedSearches] = useState<SavedSearchCriteria[]>(() => {
    try {
      const saved = localStorage.getItem('ardaw_saved_search_criteria');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading saved searches from localStorage', e);
    }
    return [
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
    ];
  });

  const [isSavedSearchModalOpen, setIsSavedSearchModalOpen] = useState(false);
  const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(false);
  const [isSearchMenuOpen, setIsSearchMenuOpen] = useState(false);

  // Search & Filter State for Requests
  const [requestSearchQuery, setRequestSearchQuery] = useState('');
  const [requestDistrict, setRequestDistrict] = useState<string>('all');
  const [requestPropertyType, setRequestPropertyType] = useState<string>('all');
  const [requestPurpose, setRequestPurpose] = useState<'all' | 'rent' | 'sale'>('all');

  // Modals & Active Selections
  const [isChoiceAddOpen, setIsChoiceAddOpen] = useState(false);
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedTenantRequest, setSelectedTenantRequest] = useState<TenantRequest | null>(null);
  const [selectedPropertyForInspection, setSelectedPropertyForInspection] = useState<Property | null>(null);

  // Favorite Properties system with localStorage persistence
  const [favoritePropertyIds, setFavoritePropertyIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ardaw_favorites');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading favorites from localStorage', e);
    }
    return ['prop-1'];
  });

  // Verified 5-Star Ratings System with localStorage persistence
  const [propertyRatings, setPropertyRatings] = useState<PropertyRating[]>(() => {
    try {
      const saved = localStorage.getItem('ardaw_property_ratings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading ratings from localStorage', e);
    }
    return INITIAL_PROPERTY_RATINGS;
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

  // Filtered list of favorite properties
  const favoriteProperties = useMemo(() => {
    return properties.filter((p) => favoritePropertyIds.includes(p.id));
  }, [properties, favoritePropertyIds]);

  // Handle toggling favorite status with Toast and localStorage sync
  const handleToggleFavorite = (propertyId: string) => {
    setFavoritePropertyIds((prev) => {
      const exists = prev.includes(propertyId);
      const updated = exists 
        ? prev.filter((id) => id !== propertyId) 
        : [...prev, propertyId];
      try {
        localStorage.setItem('ardaw_favorites', JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving favorites to localStorage', e);
      }

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

  // Helper to compute average rating and count for any property
  const getPropertyRatingSummary = (propertyId: string) => {
    const relevant = propertyRatings.filter((r) => r.propertyId === propertyId);
    if (relevant.length === 0) return { average: 0, count: 0 };
    const sum = relevant.reduce((acc, curr) => acc + curr.score, 0);
    return {
      average: Number((sum / relevant.length).toFixed(1)),
      count: relevant.length,
    };
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

      try {
        localStorage.setItem('ardaw_property_ratings', JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving ratings to localStorage', e);
      }

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
      localStorage.setItem('ardaw_last_search_criteria', JSON.stringify(current));
    } catch (e) {
      console.error('Error persisting last search criteria', e);
    }
  }, [selectedDistrict, selectedPropertyType, minPrice, maxPrice, purposeFilter]);

  const saveSearchesToStorage = (updated: SavedSearchCriteria[]) => {
    setSavedSearches(updated);
    try {
      localStorage.setItem('ardaw_saved_search_criteria', JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving search criteria to localStorage', e);
    }
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

  // In-App Push Notifications System
  const [inAppNotifications, setInAppNotifications] = useState<InAppPushNotification[]>(() => {
    try {
      const saved = localStorage.getItem('ardaw_inapp_notifications');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading push notifications:', e);
    }
    return [
      {
        id: 'push-welcome-default',
        recipientPhone: 'all',
        recipientName: 'المستخدم',
        type: 'welcome',
        title: 'مرحباً بك في منصة عرض وطلب أسيوط! 👋',
        body: 'أهلاً بك في منصتك العقارية الأولى بمحافظة أسيوط. يمكنك تصفح العروض والطلبات ومتابعة اعتماد إعلاناتك لحظة بلحظة.',
        createdAt: 'اليوم',
        isRead: false,
      },
    ];
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
      const updated = [newPush, ...prev];
      try {
        localStorage.setItem('ardaw_inapp_notifications', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
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
      try {
        localStorage.setItem('ardaw_inapp_notifications', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleClearAllNotifications = () => {
    setInAppNotifications([]);
    try {
      localStorage.removeItem('ardaw_inapp_notifications');
    } catch (e) {}
  };

  const handleSelectNotification = (notif: InAppPushNotification) => {
    setInAppNotifications((prev) => {
      const updated = prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n));
      try {
        localStorage.setItem('ardaw_inapp_notifications', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    if (notif.itemId || notif.itemCode) {
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
        body: 'أهلاً بك في منصة عرض وطلب أسيوط. يمكنك تصفح العروض والطلبات أو إضافة إعلانك بسهولة ومتابعة حالة المراجعة هنا.',
      });
    }
  };

  // Filter Properties logic (Index 0: عروض الإيجار المتاحة)
  const filteredProperties = useMemo(() => {
    return properties.filter((prop) => {
      // Must be approved for public regular view (unless viewed by admin)
      if (!isAdmin && (prop.status !== 'approved' || prop.isApproved === false)) return false;

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
  }, [properties, isAdmin, purposeFilter, selectedDistrict, selectedPropertyType, searchQuery, minPrice, maxPrice]);

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
      try {
        localStorage.setItem('ardaw_properties', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

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
      try {
        localStorage.setItem('ardaw_tenant_requests', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

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

  // Update Property in Local Storage
  const handleUpdateProperty = (updatedProp: Property) => {
    setProperties((prev) => {
      const updated = prev.map((p) => (p.id === updatedProp.id ? updatedProp : p));
      try {
        localStorage.setItem('ardaw_properties', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
    setEditingProperty(null);
    setOverlayScreen('none');
    addToast({
      type: 'success',
      title: 'تم حفظ التعديلات بنجاح',
      message: `تم تحديث بيانات العقار (${updatedProp.code}) بنجاح.`,
      duration: 4000,
    });
  };

  // Update Tenant Request in Local Storage
  const handleUpdateTenantRequest = (updatedReq: TenantRequest) => {
    setTenantRequests((prev) => {
      const updated = prev.map((r) => (r.id === updatedReq.id ? updatedReq : r));
      try {
        localStorage.setItem('ardaw_tenant_requests', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
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

    setTenantRequests((prev) => {
      const updated = prev.map((r) => {
        if (r.id === reqId) {
          return {
            ...r,
            status: newStatus,
            isApproved: newStatus === 'approved',
            adminNote: note !== undefined ? note : r.adminNote,
          };
        }
        return r;
      });
      try {
        localStorage.setItem('ardaw_tenant_requests', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

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

    addToast({
      type: newStatus === 'approved' ? 'success' : 'warning',
      title: 'تم تحديث حالة الطلب',
      message: `تم تغيير حالة طلب الإيجار إلى (${labelMap[newStatus] || newStatus}).`,
      duration: 3500,
    });
  };

  // Delete Tenant Request
  const handleDeleteTenantRequest = (reqId: string) => {
    setTenantRequests((prev) => {
      const updated = prev.filter((r) => r.id !== reqId);
      try {
        localStorage.setItem('ardaw_tenant_requests', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
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

    setProperties((prev) => {
      const updated = prev.map((p) => {
        if (p.id === propId) {
          return {
            ...p,
            status: newStatus,
            isApproved: newStatus === 'approved',
            adminNote: adminNote !== undefined ? adminNote : p.adminNote,
          };
        }
        return p;
      });
      try {
        localStorage.setItem('ardaw_properties', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

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

    addToast({
      type: newStatus === 'approved' ? 'success' : 'warning',
      title: 'تم تحديث حالة العقار',
      message: `تم تحديث كود العقار إلى حالة (${labelMap[newStatus] || newStatus}).`,
      duration: 3500,
    });
  };

  // Delete Property
  const handleDeleteProperty = (propId: string) => {
    setProperties((prev) => {
      const updated = prev.filter((p) => p.id !== propId);
      try {
        localStorage.setItem('ardaw_properties', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
    if (selectedProperty?.id === propId) {
      setSelectedProperty(null);
    }
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
      try {
        localStorage.setItem('ardaw_properties', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
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
      try {
        localStorage.setItem('ardaw_properties', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
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
      try {
        localStorage.setItem('ardaw_properties', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
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
      try {
        localStorage.setItem('ardaw_scheduled_inspections', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
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
      try {
        localStorage.setItem('ardaw_scheduled_inspections', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
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
      try {
        localStorage.setItem('ardaw_blocked_users', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
    addToast({
      type: 'warning',
      title: 'تم تطبيق الحظر (بلوك)',
      message: `تم حظر رقم الهاتف ${newBlocked.phone} (${newBlocked.name}) بنجاح.`,
      duration: 4000,
    });
  };

  const handleRemoveBlockedUser = (id: string) => {
    setBlockedUsers((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      try {
        localStorage.setItem('ardaw_blocked_users', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
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
      try {
        localStorage.setItem('ardaw_dropdown_categories', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  // Update Utility Definitions with persistence
  const handleUpdateUtilityDefinitions = (updatedUtils: UtilityOptionDefinition[]) => {
    setUtilityDefinitions(updatedUtils);
    try {
      localStorage.setItem('ardaw_utility_definitions', JSON.stringify(updatedUtils));
    } catch (e) {
      console.error(e);
    }
  };

  // Reset to Assiut Presets Defaults
  const handleResetDefaults = () => {
    setDropdownCategories(INITIAL_DROPDOWN_CATEGORIES);
    setUtilityDefinitions(INITIAL_UTILITY_DEFINITIONS);
    try {
      localStorage.removeItem('ardaw_dropdown_categories');
      localStorage.removeItem('ardaw_utility_definitions');
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
    localStorage.removeItem('ardaw_current_user');
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
                body: `يسعدنا انضمامك إلى منصة عرض وطلب أسيوط. يمكنك الآن نشر ومتابعة إعلاناتك بكل سهولة.`,
              });
            }, 450);
          }}
        />
        <ToastNotification toasts={toasts} onDismiss={dismissToast} />
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

  return (
    <div className={`min-h-screen bg-[#F5F7FA] flex flex-col justify-between text-slate-900 font-['Cairo'] ${isFormEntry ? 'pb-0' : 'pb-24'}`}>
      
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
            {/* Search and Hero Banner in Primary Navy */}
            <div className="bg-[#002B49] text-white rounded-3xl p-5 sm:p-6 shadow-md border border-[#001D33] space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-[#FFB300] text-black px-2.5 py-0.5 rounded-full font-bold">
                    محافظة أسيوط
                  </span>
                  <span className="text-xs text-white/80 font-semibold">
                    صفحة عروض الإيجار والعقارات
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black mt-1.5 tracking-tight">
                  عروض الإيجار والعقارات المتاحة بأسيوط
                </h1>
                <p className="text-xs sm:text-sm text-white/70 mt-1">
                  شقق سكنية، سكن طلابي، محلات تجارية، وأراضي فضاء معتمدة مع كود مباشر للمعاينة
                </p>
              </div>

              {/* Search Bar Input */}
              <div className="relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بكود العقار (مثال: AS-101) أو المنطقة أو الشارع..."
                  className="w-full pr-11 pl-10 py-3 rounded-2xl bg-white text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm font-semibold shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#FFB300]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick Purpose Pills */}
              <div className="flex gap-2 pt-1 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setPurposeFilter('rent')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    purposeFilter === 'rent'
                      ? 'bg-[#FFB300] text-black shadow-xs font-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  عروض الإيجار ({properties.filter((p) => p.purpose === 'rent' && (isAdmin || p.status === 'approved')).length})
                </button>
                <button
                  onClick={() => setPurposeFilter('sale')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    purposeFilter === 'sale'
                      ? 'bg-[#FFB300] text-black shadow-xs font-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  عروض البيع والتمليك ({properties.filter((p) => p.purpose === 'sale' && (isAdmin || p.status === 'approved')).length})
                </button>
                <button
                  onClick={() => setPurposeFilter('all')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    purposeFilter === 'all'
                      ? 'bg-[#FFB300] text-black shadow-xs font-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  الكل ({properties.filter((p) => isAdmin || p.status === 'approved').length})
                </button>
              </div>
            </div>

            {/* Filter Controls & Saved Search Bar */}
            <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
              {/* 4-Item Grid 2x2 Filter Section */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {/* 1. فلتر المناطق (الصف العلوي 1) */}
                <div 
                  className="relative h-13 rounded-2xl bg-[#002B49] hover:bg-[#001D33] text-white transition-all shadow-xs border border-[#001D33] flex items-center justify-between px-3 cursor-pointer group"
                  title="فلتر المناطق"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-[#FFB300]" />
                    </div>
                    <div className="flex flex-col text-right truncate">
                      <span className="text-[10px] text-slate-300 font-medium leading-none mb-0.5">فلتر المناطق</span>
                      <span className="text-xs font-bold text-white truncate">
                        {selectedDistrict === 'all' ? 'جميع المناطق' : selectedDistrict}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-amber-300 shrink-0 mr-1 group-hover:translate-y-0.5 transition-transform" />
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-slate-900"
                    title="اختر المنطقة أو الحي"
                  >
                    <option value="all">جميع أحياء ومناطق أسيوط</option>
                    {activeDistrictOptions.map((opt) => (
                      <option key={opt.id} value={opt.name}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. فلتر الوحدات (الصف العلوي 2) */}
                <div 
                  className="relative h-13 rounded-2xl bg-[#002B49] hover:bg-[#001D33] text-white transition-all shadow-xs border border-[#001D33] flex items-center justify-between px-3 cursor-pointer group"
                  title="فلتر الوحدات"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                      <Building className="w-4 h-4 text-[#FFB300]" />
                    </div>
                    <div className="flex flex-col text-right truncate">
                      <span className="text-[10px] text-slate-300 font-medium leading-none mb-0.5">فلتر الوحدات</span>
                      <span className="text-xs font-bold text-white truncate">
                        {selectedPropertyType === 'all' ? 'جميع الوحدات' : selectedPropertyType}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-amber-300 shrink-0 mr-1 group-hover:translate-y-0.5 transition-transform" />
                  <select
                    value={selectedPropertyType}
                    onChange={(e) => setSelectedPropertyType(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-slate-900"
                    title="اختر نوع الوحدة"
                  >
                    <option value="all">جميع أنواع الوحدات</option>
                    {activePropertyTypeOptions.map((opt) => (
                      <option key={opt.id} value={opt.name}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. فلتر السعر (الصف السفلي 3) */}
                <button
                  type="button"
                  onClick={() => setIsPriceFilterOpen(!isPriceFilterOpen)}
                  className={`h-13 rounded-2xl transition-all shadow-xs border flex items-center justify-between px-3 cursor-pointer text-right group ${
                    minPrice || maxPrice || isPriceFilterOpen
                      ? 'bg-[#001D33] text-white border-[#FFB300] ring-1 ring-[#FFB300]/40'
                      : 'bg-[#002B49] hover:bg-[#001D33] text-white border-[#001D33]'
                  }`}
                  title="فلتر السعر والنطاق السعري"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                      <DollarSign className="w-4 h-4 text-[#FFB300]" />
                    </div>
                    <div className="flex flex-col text-right truncate">
                      <span className="text-[10px] text-slate-300 font-medium leading-none mb-0.5">فلتر السعر</span>
                      <span className="text-xs font-bold text-white truncate">
                        {minPrice || maxPrice
                          ? `${minPrice ? Number(minPrice).toLocaleString() : '0'} - ${maxPrice ? Number(maxPrice).toLocaleString() : 'بلا حد'} ج.م`
                          : (isPriceFilterOpen ? 'إغلاق النطاق' : 'تحديد السعر')}
                      </span>
                    </div>
                  </div>
                  <SlidersHorizontal className={`w-3.5 h-3.5 shrink-0 mr-1 transition-transform ${isPriceFilterOpen ? 'text-[#FFB300] rotate-90' : 'text-amber-300'}`} />
                </button>

                {/* 4. فلتر البحث (الصف السفلي 4 - مدمجاً فيه حفظ المعايير والمفضلة) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsSearchMenuOpen(!isSearchMenuOpen)}
                    className={`w-full h-13 rounded-2xl transition-all shadow-xs border flex items-center justify-between px-3 cursor-pointer text-right group ${
                      isSearchMenuOpen
                        ? 'bg-[#001D33] text-white border-[#FFB300] ring-1 ring-[#FFB300]/40'
                        : 'bg-[#002B49] hover:bg-[#001D33] text-white border-[#001D33]'
                    }`}
                    title="فلتر البحث وحفظ المعايير والمفضلة"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                        <Bookmark className="w-4 h-4 text-[#FFB300] fill-[#FFB300]/20" />
                      </div>
                      <div className="flex flex-col text-right truncate">
                        <span className="text-[10px] text-slate-300 font-medium leading-none mb-0.5">فلتر البحث</span>
                        <span className="text-xs font-bold text-white truncate">
                          حفظ المعايير والمفضلة
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 mr-1">
                      {savedSearches.length > 0 && (
                        <span className="bg-[#FFB300] text-[#002B49] text-[10px] font-black px-1.5 py-0.5 rounded-full" title="المعايير المحفوظة">
                          {savedSearches.length}
                        </span>
                      )}
                      {favoriteProperties.length > 0 && (
                        <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full" title="العقارات المفضلة">
                          <Heart className="w-2.5 h-2.5 fill-current inline" />
                        </span>
                      )}
                      <ChevronDown className={`w-3.5 h-3.5 text-amber-300 transition-transform ${isSearchMenuOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* Dropdown Menu for Filter 4 (فلتر البحث المدمج) */}
                  {isSearchMenuOpen && (
                    <>
                      {/* Invisible backdrop */}
                      <div 
                        className="fixed inset-0 z-30" 
                        onClick={() => setIsSearchMenuOpen(false)} 
                      />
                      <div 
                        className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-40 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-2.5 py-1.5 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800">
                          <span className="flex items-center gap-1.5">
                            <Bookmark className="w-3.5 h-3.5 text-[#002B49]" />
                            <span>خيارات فلتر البحث المدمجة</span>
                          </span>
                          <button 
                            type="button" 
                            onClick={() => setIsSearchMenuOpen(false)}
                            className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="py-1 space-y-1">
                          {/* حفظ المعايير الحالية */}
                          <button
                            type="button"
                            onClick={() => {
                              handleSaveCurrentCriteria();
                              setIsSearchMenuOpen(false);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-800 hover:bg-amber-50 hover:text-amber-950 rounded-xl transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Bookmark className="w-4 h-4 text-[#FFB300] fill-[#FFB300]" />
                              <span>حفظ المعايير الحالية</span>
                            </span>
                            <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md font-semibold">حفظ</span>
                          </button>

                          {/* المعايير المحفوظة */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsSavedSearchModalOpen(true);
                              setIsSearchMenuOpen(false);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <SlidersHorizontal className="w-4 h-4 text-[#002B49]" />
                              <span>المعايير المحفوظة</span>
                            </span>
                            <span className="bg-[#FFB300] text-black text-[10px] font-black px-1.5 py-0.2 rounded-full">
                              {savedSearches.length}
                            </span>
                          </button>

                          {/* العقارات المفضلة */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsFavoritesModalOpen(true);
                              setIsSearchMenuOpen(false);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-800 hover:bg-rose-50 hover:text-rose-900 rounded-xl transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                              <span>العقارات المفضلة</span>
                            </span>
                            <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                              {favoriteProperties.length}
                            </span>
                          </button>

                          {/* إعادة ضبط الفلاتر */}
                          {(selectedDistrict !== 'all' || selectedPropertyType !== 'all' || minPrice || maxPrice || searchQuery) && (
                            <button
                              type="button"
                              onClick={() => {
                                handleResetSearchFilters();
                                setIsSearchMenuOpen(false);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border-t border-slate-100 mt-1"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                              <span>إعادة ضبط جميع المعايير</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Expandable Price Range Section */}
              {isPriceFilterOpen && (
                <div className="pt-3 border-t border-slate-100 animate-in fade-in duration-150 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      حدد النطاق السعري بالجنيه المصري (ج.م):
                    </span>
                    {(minPrice || maxPrice) && (
                      <button
                        type="button"
                        onClick={() => {
                          setMinPrice('');
                          setMaxPrice('');
                        }}
                        className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                      >
                        مسح نطاق السعر
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                      <span className="text-xs text-slate-500 font-semibold shrink-0">من:</span>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        placeholder="أقل سعر (مثال: 2000)"
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-300 font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                      <span className="text-xs text-slate-500 font-semibold shrink-0">إلى:</span>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        placeholder="أعلى سعر (مثال: 6000)"
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-300 font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#002B49]"
                      />
                    </div>
                  </div>

                  {/* Quick Price Range Shortcuts */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-slate-400 font-medium">اختصارات سريعة:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setMinPrice('');
                        setMaxPrice('3000');
                      }}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                    >
                      أقل من 3,000 ج.م
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMinPrice('3000');
                        setMaxPrice('6000');
                      }}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                    >
                      3,000 - 6,000 ج.م
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMinPrice('6000');
                        setMaxPrice('12000');
                      }}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                    >
                      6,000 - 12,000 ج.م
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMinPrice('12000');
                        setMaxPrice('');
                      }}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                    >
                      أكثر من 12,000 ج.م
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMinPrice('');
                        setMaxPrice('');
                      }}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                    >
                      أي سعر
                    </button>
                  </div>
                </div>
              )}

              {/* Bottom Status / Summary Row */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-slate-400 font-medium">المعايير المفعلة:</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                    <MapPin className="w-2.5 h-2.5 text-[#FFB300]" />
                    {selectedDistrict === 'all' ? 'جميع المناطق' : selectedDistrict}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                    <Building className="w-2.5 h-2.5 text-[#002B49]" />
                    {selectedPropertyType === 'all' ? 'جميع الوحدات' : selectedPropertyType}
                  </span>
                  {(minPrice || maxPrice) && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                      <DollarSign className="w-2.5 h-2.5 text-emerald-600" />
                      {minPrice ? Number(minPrice).toLocaleString() : '0'} - {maxPrice ? Number(maxPrice).toLocaleString() : 'بلا حد'} ج.م
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-500 font-bold shrink-0">
                  المعروض المتاح: <span className="text-[#002B49] font-black">{filteredProperties.length}</span>
                </div>
              </div>
            </div>

            {/* Property Cards List */}
            {filteredProperties.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl text-center border border-slate-200 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                  <Building2 className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">لا توجد عقارات مطابقة للبحث</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  جرب تغيير كلمات البحث أو تصفية الأحياء والخيارات للاطلاع على المزيد من العقارات المتاحة
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedDistrict('all');
                    setSelectedPropertyType('all');
                    setPurposeFilter('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
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
                    isFavorite={favoritePropertyIds.includes(prop.id)}
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
          /* 2. شاشة طلبات الإيجار (المطلوبة) - Index 1 لكلا الواجهتين */
          /* ========================================================================= */
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Requests Hero Banner in Navy & Amber */}
            <div className="bg-gradient-to-r from-[#002B49] to-[#001D33] text-white rounded-3xl p-5 sm:p-6 shadow-md border border-[#001D33] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs bg-[#FFB300] text-black px-2.5 py-0.5 rounded-full font-bold">
                    طلبات الإيجار والسكن
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black mt-1">
                    طلبات السكن والوحدات المطلوبة بأسيوط
                  </h2>
                  <p className="text-xs text-white/70 mt-0.5">
                    طلبات مستأجرين وباحثين جادين عن شقق، سكن طالبات/طلبة، ومحلات تجارية
                  </p>
                </div>
                <button
                  onClick={() => setOverlayScreen('form_entry_request')}
                  className="px-4 py-2.5 rounded-2xl bg-[#FFB300] hover:bg-[#FFA000] text-black font-black text-xs transition-transform active:scale-95 shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <PersonSearch className="w-4 h-4 text-black" />
                  <span>أضف طلبك</span>
                </button>
              </div>

              {/* Integrated Search Bar for Requests */}
              <div className="relative pt-1">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={requestSearchQuery}
                  onChange={(e) => setRequestSearchQuery(e.target.value)}
                  placeholder="ابحث في الطلبات بالحي، نوع العقار، الكود، أو الملاحظات..."
                  className="w-full pr-10 pl-10 py-2.5 rounded-xl bg-white/10 text-white placeholder:text-white/50 text-xs border border-white/20 focus:outline-hidden focus:ring-1 focus:ring-[#FFB300]"
                />
                {requestSearchQuery && (
                  <button
                    onClick={() => setRequestSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick Purpose Pills for Requests */}
              <div className="flex gap-2 pt-1 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setRequestPurpose('rent')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    requestPurpose === 'rent'
                      ? 'bg-[#FFB300] text-black shadow-xs font-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  طلبات الإيجار ({tenantRequests.filter((r) => r.purpose === 'rent' && (isAdmin || r.status === 'approved' || r.isApproved !== false)).length})
                </button>
                <button
                  onClick={() => setRequestPurpose('sale')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    requestPurpose === 'sale'
                      ? 'bg-[#FFB300] text-black shadow-xs font-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  طلبات الشراء ({tenantRequests.filter((r) => r.purpose === 'sale' && (isAdmin || r.status === 'approved' || r.isApproved !== false)).length})
                </button>
                <button
                  onClick={() => setRequestPurpose('all')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    requestPurpose === 'all'
                      ? 'bg-[#FFB300] text-black shadow-xs font-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  الكل ({tenantRequests.filter((r) => isAdmin || r.status === 'approved' || r.isApproved !== false).length})
                </button>
              </div>
            </div>

            {/* Filter Controls Card matching Offers Screen */}
            <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  {/* District Dropdown */}
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-[#FFB300] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={requestDistrict}
                      onChange={(e) => setRequestDistrict(e.target.value)}
                      className="bg-slate-50 border border-slate-300 rounded-xl pr-7 pl-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-[#002B49] cursor-pointer"
                    >
                      <option value="all">جميع أحياء ومناطق أسيوط</option>
                      {activeDistrictOptions.map((opt) => (
                        <option key={opt.id} value={opt.name}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Property Type Dropdown */}
                  <div className="relative">
                    <Building className="w-3.5 h-3.5 text-[#002B49] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={requestPropertyType}
                      onChange={(e) => setRequestPropertyType(e.target.value)}
                      className="bg-slate-50 border border-slate-300 rounded-xl pr-7 pl-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-[#002B49] cursor-pointer"
                    >
                      <option value="all">جميع أنواع الوحدات المطلوبة</option>
                      {activePropertyTypeOptions.map((opt) => (
                        <option key={opt.id} value={opt.name}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reset Filters */}
                  {(requestDistrict !== 'all' || requestPropertyType !== 'all' || requestSearchQuery || requestPurpose !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setRequestDistrict('all');
                        setRequestPropertyType('all');
                        setRequestSearchQuery('');
                        setRequestPurpose('all');
                      }}
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                      title="إعادة ضبط فلاتر الطلبات"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>إعادة ضبط</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Active Filters Summary Chips Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-slate-400 font-medium">الفلاتر النشطة:</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    <MapPin className="w-2.5 h-2.5 text-amber-600" />
                    {requestDistrict === 'all' ? 'جميع المناطق' : requestDistrict}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                    <Building className="w-2.5 h-2.5 text-[#002B49]" />
                    {requestPropertyType === 'all' ? 'جميع الوحدات' : requestPropertyType}
                  </span>
                </div>

                <div className="text-xs text-slate-500 font-bold shrink-0">
                  الطلبات المتاحة: <span className="text-[#002B49] font-black">{filteredTenantRequests.length}</span>
                </div>
              </div>
            </div>

            {/* Requests Cards List: Unified 3-column responsive grid matching PropertyCard */}
            {filteredTenantRequests.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl text-center border border-slate-200 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">لا توجد طلبات إيجار مسجلة مطابقة</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  كن أول من يسجل طلبه العقاري للحصول على عروض فورية من ملاك العقارات والوسطاء
                </p>
                <button
                  onClick={() => setOverlayScreen('form_entry_request')}
                  className="px-4 py-2 rounded-xl bg-[#002B49] text-[#FFB300] font-black text-xs transition-colors shadow-xs cursor-pointer"
                >
                  إضافة طلب إيجار جديد
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
