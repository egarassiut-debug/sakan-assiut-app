import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Property, PropertyStatus, BlockedUser, TenantRequest, AppUser, PropertyRating, TrendPost } from '../types/property';
import { PropertyGroupDefinition, PropertyTypeDefinition, FormFieldDefinition } from '../types/formConfig';
import { DropdownCategory, UtilityOptionDefinition } from '../data/dropdownOptions';
import { 
  INITIAL_PROPERTY_GROUPS, 
  INITIAL_PROPERTY_TYPES, 
  INITIAL_FIELD_DEFINITIONS, 
  ASSIUT_DISTRICTS_LIST,
  DEFAULT_DYNAMIC_FORM_CONFIG
} from '../data/formConfig';
import { AdminSectionId } from '../types/adminNav';
import { AdminDrawer } from './AdminDrawer';
import { hasSectionAccess, getDefaultSectionForRole } from '../utils/adminManager';
import { safeStorageGetItem, safeStorageSetItem } from '../utils/storageManager';
import { 
  Building2, Users, FileText, Star, TrendingUp, Layers, CheckCircle2, 
  Clock, ShieldAlert, SlidersHorizontal, MapPin, Menu, X, ArrowLeft, 
  Lock, RefreshCw, ShieldCheck, Activity, Download, Sparkles, Database, Sliders, ChevronLeft
} from 'lucide-react';

// Modular Sections
import { AdminOverviewSection } from './admin/AdminOverviewSection';
import { AdminPropertiesSection } from './admin/AdminPropertiesSection';
import { AdminRequestsSection } from './admin/AdminRequestsSection';
import { AdminUsersSection } from './admin/AdminUsersSection';
import { AdminGroupsSection } from './admin/AdminGroupsSection';
import { AdminTypesSection } from './admin/AdminTypesSection';
import { AdminFieldsSection } from './admin/AdminFieldsSection';
import { AdminDistrictsSection } from './admin/AdminDistrictsSection';
import { AdminRatingsSection } from './admin/AdminRatingsSection';
import { AdminTrendPostsSection } from './admin/AdminTrendPostsSection';
import { AdminAuditLogsSection } from './admin/AdminAuditLogsSection';
import { AdminSettingsSection } from './admin/AdminSettingsSection';
import { RoleClassificationManagement } from './RoleClassificationManagement';
import { AdminRoleManagement } from './AdminRoleManagement';
import { ScreenshotConverter } from './ScreenshotConverter';
import { DatabaseMigrationsTab } from './DatabaseMigrationsTab';
import { DropdownManager } from './DropdownManager';

import { 
  dbFetchUsers,
  dbUpsertUser,
  dbUpdateUserBlockStatus,
  dbFetchPropertyGroups,
  dbUpsertPropertyGroup,
  dbDeletePropertyGroup,
  dbFetchPropertyTypes,
  dbUpsertPropertyType,
  dbDeletePropertyType,
  dbFetchFormFieldDefinitions,
  dbUpsertFormFieldDefinition,
  dbDeleteFormFieldDefinition,
  dbFetchPropertyRatings,
  dbDeletePropertyRating,
  dbFetchTrendPosts,
  dbUpdateTrendPostStatus,
  dbDeleteTrendPost,
  dbDeleteProperty,
  dbDeleteTenantRequest
} from '../lib/supabase';

interface AdminPanelProps {
  currentUser?: AppUser | null;
  properties: Property[];
  onUpdatePropertyStatus: (propertyId: string, newStatus: PropertyStatus, note?: string) => void;
  onOpenDetails: (property: Property) => void;
  onDeleteProperty?: (propertyId: string) => void;
  onEditProperty?: (property: Property) => void;
  onAddProperty?: (property: Property) => void;
  tenantRequests?: TenantRequest[];
  onOpenTenantRequestDetails?: (request: TenantRequest) => void;
  onUpdateTenantRequestStatus?: (requestId: string, newStatus: any, note?: string) => void;
  onEditTenantRequest?: (request: TenantRequest) => void;
  onDeleteTenantRequest?: (requestId: string) => void;
  onAddTenantRequest?: (request: TenantRequest) => void;
  dropdownCategories: Record<string, DropdownCategory>;
  onUpdateDropdownCategories: (catKey: string, updatedCat: DropdownCategory) => void;
  utilityDefinitions: UtilityOptionDefinition[];
  onUpdateUtilityDefinitions: (updated: UtilityOptionDefinition[]) => void;
  onResetDefaults?: () => void;
  onLockAdmin?: () => void;
  blockedUsers?: BlockedUser[];
  onAddBlockedUser?: (user: Omit<BlockedUser, 'id' | 'blockedAt'>) => void;
  onRemoveBlockedUser?: (id: string) => void;
  isDrawerOpen?: boolean;
  setIsDrawerOpen?: (open: boolean) => void;
  onToggleDrawer?: (open?: boolean) => void;
  onCloseDrawer?: () => void;
  onAddToast?: (toast: any) => void;
  inspections?: any[];
  onUpdateInspectionStatus?: (id: string, status: any, feePaid?: boolean) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  properties,
  onUpdatePropertyStatus,
  onOpenDetails,
  onDeleteProperty,
  onEditProperty,
  onAddProperty,
  tenantRequests = [],
  onOpenTenantRequestDetails,
  onUpdateTenantRequestStatus,
  onEditTenantRequest,
  onDeleteTenantRequest,
  onAddTenantRequest,
  dropdownCategories,
  onUpdateDropdownCategories,
  utilityDefinitions,
  onUpdateUtilityDefinitions,
  onResetDefaults,
  onLockAdmin,
  blockedUsers = [],
  onAddBlockedUser,
  onRemoveBlockedUser,
  isDrawerOpen: propIsDrawerOpen,
  setIsDrawerOpen: propSetIsDrawerOpen,
  onCloseDrawer,
  onAddToast,
}) => {
  // Active Navigation Section
  const [activeSection, setActiveSection] = useState<AdminSectionId>('overview');

  // Mobile Drawer State
  const [localDrawerOpen, setLocalDrawerOpen] = useState(false);
  const isDrawerOpen = propIsDrawerOpen !== undefined ? propIsDrawerOpen : localDrawerOpen;
  const setIsDrawerOpen = propSetIsDrawerOpen || setLocalDrawerOpen;

  // Real database states
  const [users, setUsers] = useState<AppUser[]>([]);
  const [groups, setGroups] = useState<PropertyGroupDefinition[]>(INITIAL_PROPERTY_GROUPS);
  const [propertyTypes, setPropertyTypes] = useState<PropertyTypeDefinition[]>(INITIAL_PROPERTY_TYPES);
  const [formFields, setFormFields] = useState<FormFieldDefinition[]>(INITIAL_FIELD_DEFINITIONS);
  const [districts, setDistricts] = useState<string[]>(ASSIUT_DISTRICTS_LIST);
  const [ratings, setRatings] = useState<PropertyRating[]>([]);
  const [trendPosts, setTrendPosts] = useState<TrendPost[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Load Real Data from Supabase
  const loadDatabaseData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [
        fetchedUsers,
        fetchedGroups,
        fetchedTypes,
        fetchedFields,
        fetchedRatings,
        fetchedTrend
      ] = await Promise.allSettled([
        dbFetchUsers(),
        dbFetchPropertyGroups(),
        dbFetchPropertyTypes(),
        dbFetchFormFieldDefinitions(),
        dbFetchPropertyRatings(),
        dbFetchTrendPosts(),
      ]);

      if (fetchedUsers.status === 'fulfilled' && fetchedUsers.value) {
        setUsers(fetchedUsers.value);
      }
      if (fetchedGroups.status === 'fulfilled' && fetchedGroups.value && fetchedGroups.value.length > 0) {
        setGroups(fetchedGroups.value);
      }
      if (fetchedTypes.status === 'fulfilled' && fetchedTypes.value && fetchedTypes.value.length > 0) {
        setPropertyTypes(fetchedTypes.value);
      }
      if (fetchedFields.status === 'fulfilled' && fetchedFields.value && fetchedFields.value.length > 0) {
        setFormFields(fetchedFields.value);
      }
      if (fetchedRatings.status === 'fulfilled' && fetchedRatings.value) {
        setRatings(fetchedRatings.value);
      }
      if (fetchedTrend.status === 'fulfilled' && fetchedTrend.value) {
        setTrendPosts(fetchedTrend.value);
      }
    } catch (err) {
      console.warn('Error loading admin Supabase data:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadDatabaseData();
  }, [loadDatabaseData]);

  // Toast feedback helper
  const showToast = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (onAddToast) {
      onAddToast({
        id: `toast-${Date.now()}`,
        type,
        title,
        message,
        duration: 3500,
      });
    }
  };

  // Group Handlers
  const handleUpsertGroup = async (group: PropertyGroupDefinition): Promise<boolean> => {
    const success = await dbUpsertPropertyGroup(group);
    if (success) {
      setGroups((prev) => {
        const idx = prev.findIndex((g) => g.id === group.id);
        const updated = idx >= 0 ? prev.map((g) => (g.id === group.id ? group : g)) : [...prev, group];
        safeStorageSetItem('ardaw_dynamic_groups', updated);
        window.dispatchEvent(new CustomEvent('ardaw_form_config_updated'));
        return updated;
      });
      showToast('المجموعات العقارية', `تم حفظ وتحديث مجموعة "${group.name}" بنجاح في Supabase.`);
      return true;
    }
    showToast('خطأ في الحفظ', 'تعذر حفظ المجموعة في قاعدة البيانات. تحقق من الاتصال.', 'error');
    return false;
  };

  const handleDeleteGroup = async (groupId: string): Promise<boolean> => {
    const success = await dbDeletePropertyGroup(groupId);
    if (success) {
      setGroups((prev) => {
        const updated = prev.filter((g) => g.id !== groupId);
        safeStorageSetItem('ardaw_dynamic_groups', updated);
        window.dispatchEvent(new CustomEvent('ardaw_form_config_updated'));
        return updated;
      });
      showToast('حذف المجموعة', 'تم حذف المجموعة بنجاح من قاعدة البيانات.');
      return true;
    }
    showToast('خطأ في الحذف', 'تعذر حذف المجموعة من Supabase.', 'error');
    return false;
  };

  // Property Type Handlers
  const handleUpsertType = async (type: PropertyTypeDefinition): Promise<boolean> => {
    const success = await dbUpsertPropertyType(type);
    if (success) {
      setPropertyTypes((prev) => {
        const idx = prev.findIndex((t) => t.id === type.id);
        const updated = idx >= 0 ? prev.map((t) => (t.id === type.id ? type : t)) : [...prev, type];
        safeStorageSetItem('ardaw_dynamic_types', updated);
        window.dispatchEvent(new CustomEvent('ardaw_form_config_updated'));
        return updated;
      });
      showToast('أنواع العقارات', `تم حفظ وتحديث نوع "${type.name}" بنجاح في Supabase.`);
      return true;
    }
    showToast('خطأ في الحفظ', 'تعذر حفظ نوع العقار في قاعدة البيانات.', 'error');
    return false;
  };

  const handleDeleteType = async (typeId: string): Promise<boolean> => {
    const success = await dbDeletePropertyType(typeId);
    if (success) {
      setPropertyTypes((prev) => {
        const updated = prev.filter((t) => t.id !== typeId);
        safeStorageSetItem('ardaw_dynamic_types', updated);
        window.dispatchEvent(new CustomEvent('ardaw_form_config_updated'));
        return updated;
      });
      showToast('حذف النوع', 'تم حذف نوع العقار بنجاح من قاعدة البيانات.');
      return true;
    }
    showToast('خطأ في الحذف', 'تعذر حذف نوع العقار من Supabase.', 'error');
    return false;
  };

  // Field Definition Handlers
  const handleUpsertField = async (field: FormFieldDefinition): Promise<boolean> => {
    const success = await dbUpsertFormFieldDefinition(field);
    if (success) {
      setFormFields((prev) => {
        const idx = prev.findIndex((f) => f.id === field.id);
        const updated = idx >= 0 ? prev.map((f) => (f.id === field.id ? field : f)) : [...prev, field];
        safeStorageSetItem('ardaw_dynamic_fields', updated);
        window.dispatchEvent(new CustomEvent('ardaw_form_config_updated'));
        return updated;
      });
      showToast('حقول الاستمارات', `تم حفظ الحقل "${field.label}" بنجاح في Supabase.`);
      return true;
    }
    showToast('خطأ في الحفظ', 'تعذر حفظ الحقل في قاعدة البيانات.', 'error');
    return false;
  };

  const handleDeleteField = async (fieldId: string): Promise<boolean> => {
    const success = await dbDeleteFormFieldDefinition(fieldId);
    if (success) {
      setFormFields((prev) => {
        const updated = prev.filter((f) => f.id !== fieldId);
        safeStorageSetItem('ardaw_dynamic_fields', updated);
        window.dispatchEvent(new CustomEvent('ardaw_form_config_updated'));
        return updated;
      });
      showToast('حذف الحقل', 'تم حذف الحقل بنجاح من قاعدة البيانات.');
      return true;
    }
    showToast('خطأ في الحذف', 'تعذر حذف الحقل من Supabase.', 'error');
    return false;
  };

  // Rating Delete Handler
  const handleDeleteRating = async (ratingId: string): Promise<boolean> => {
    const success = await dbDeletePropertyRating(ratingId);
    if (success) {
      setRatings((prev) => prev.filter((r) => r.id !== ratingId));
      showToast('تقييمات العقارات', 'تم حذف التقييم بنجاح من قاعدة البيانات.');
      return true;
    }
    showToast('خطأ في الحذف', 'تعذر حذف التقييم من Supabase.', 'error');
    return false;
  };

  // Trend Post Handlers
  const handleUpdateTrendStatus = async (
    postId: string, 
    status: 'active' | 'approved' | 'rejected' | 'pending' | 'removed', 
    isApproved?: boolean
  ): Promise<boolean> => {
    const success = await dbUpdateTrendPostStatus(postId, status, isApproved);
    if (success) {
      setTrendPosts((prev) =>
        prev.map((tp) => (tp.id === postId ? { ...tp, status, isApproved: Boolean(isApproved) } : tp))
      );
      showToast('منشورات الترند', `تم تحديث حالة المنشور إلى: ${status === 'approved' ? 'معتمد' : status}`);
      return true;
    }
    showToast('خطأ في التحديث', 'تعذر تحديث حالة المنشور في Supabase.', 'error');
    return false;
  };

  const handleDeleteTrendPost = async (postId: string): Promise<boolean> => {
    const success = await dbDeleteTrendPost(postId);
    if (success) {
      setTrendPosts((prev) => prev.filter((tp) => tp.id !== postId));
      showToast('منشورات الترند', 'تم حذف المنشور نهائياً من قاعدة البيانات.');
      return true;
    }
    showToast('خطأ في الحذف', 'تعذر حذف المنشور من Supabase.', 'error');
    return false;
  };

  // User Handlers
  const handleUpdateUser = async (user: AppUser): Promise<boolean> => {
    const success = await dbUpsertUser(user);
    if (success) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
      showToast('إدارة المستخدمين', `تم تحديث بيانات المستخدم ${user.name} بنجاح.`);
      return true;
    }
    showToast('خطأ في التحديث', 'تعذر تحديث بيانات المستخدم.', 'error');
    return false;
  };

  const handleBlockUser = async (userId: string, isBlocked: boolean, reason?: string): Promise<boolean> => {
    const success = await dbUpdateUserBlockStatus(userId, isBlocked, reason);
    if (success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId || u.phone === userId ? { ...u, isBlocked, blockedReason: reason } : u))
      );
      showToast('حظر المستخدمين', isBlocked ? 'تم حظر المستخدم بنجاح.' : 'تم إلغاء حظر المستخدم بنجاح.');
      return true;
    }
    showToast('خطأ في الحظر', 'تعذر تحديث حالة حظر المستخدم في Supabase.', 'error');
    return false;
  };

  // Property Delete Handler
  const handleDeletePropertyWrap = async (propertyId: string): Promise<boolean> => {
    if (onDeleteProperty) {
      onDeleteProperty(propertyId);
    } else {
      await dbDeleteProperty(propertyId);
    }
    showToast('حذف العقار', 'تم حذف العقار نهائياً من المنظومة.');
    return true;
  };

  // Tenant Request Delete Handler
  const handleDeleteTenantRequestWrap = async (requestId: string): Promise<boolean> => {
    if (onDeleteTenantRequest) {
      onDeleteTenantRequest(requestId);
    } else {
      await dbDeleteTenantRequest(requestId);
    }
    showToast('حذف الطلب', 'تم حذف طلب المستأجر نهائياً من المنظومة.');
    return true;
  };

  // Pending Moderation Count
  const pendingModerationCount = properties.filter(
    (p) => !p.isApproved && p.status !== 'approved' && p.status !== 'rejected'
  ).length;

  const blockedUsersCount = users.filter((u) => u.isBlocked).length;

  // Active section renderer
  const renderActiveSectionContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <AdminOverviewSection
            currentUser={currentUser}
            properties={properties}
            tenantRequests={tenantRequests}
            users={users}
            ratings={ratings}
            trendPosts={trendPosts}
            groups={groups}
            propertyTypes={propertyTypes}
            fields={formFields}
            onNavigate={(sec) => setActiveSection(sec)}
            onRefreshAll={loadDatabaseData}
          />
        );

      case 'properties':
      case 'moderation':
        return (
          <AdminPropertiesSection
            currentUser={currentUser}
            properties={properties}
            groups={groups}
            onUpdateStatus={(pId, stat, reason) => onUpdatePropertyStatus(pId, stat, reason)}
            onDeleteProperty={handleDeletePropertyWrap}
            onOpenDetails={onOpenDetails}
            onEditProperty={onEditProperty}
            onRefresh={loadDatabaseData}
          />
        );

      case 'requests':
        return (
          <AdminRequestsSection
            currentUser={currentUser}
            tenantRequests={tenantRequests}
            properties={properties}
            groups={groups}
            onUpdateStatus={onUpdateTenantRequestStatus}
            onDeleteRequest={handleDeleteTenantRequestWrap}
            onOpenDetails={onOpenTenantRequestDetails}
            onEditRequest={onEditTenantRequest}
            onRefresh={loadDatabaseData}
          />
        );

      case 'users':
      case 'blocks':
        return (
          <AdminUsersSection
            currentUser={currentUser}
            users={users}
            properties={properties}
            tenantRequests={tenantRequests}
            onUpdateUser={handleUpdateUser}
            onBlockUser={handleBlockUser}
            onRefresh={loadDatabaseData}
            onOpenPropertyDetails={onOpenDetails}
            onOpenRequestDetails={onOpenTenantRequestDetails}
          />
        );

      case 'groups':
        return (
          <AdminGroupsSection
            currentUser={currentUser}
            groups={groups}
            propertyTypes={propertyTypes}
            onUpsertGroup={handleUpsertGroup}
            onDeleteGroup={handleDeleteGroup}
            onRefresh={loadDatabaseData}
          />
        );

      case 'types':
        return (
          <AdminTypesSection
            currentUser={currentUser}
            propertyTypes={propertyTypes}
            groups={groups}
            onUpsertType={handleUpsertType}
            onDeleteType={handleDeleteType}
            onRefresh={loadDatabaseData}
          />
        );

      case 'fields':
        return (
          <AdminFieldsSection
            currentUser={currentUser}
            fields={formFields}
            groups={groups}
            onUpsertField={handleUpsertField}
            onDeleteField={handleDeleteField}
            onRefresh={loadDatabaseData}
          />
        );

      case 'districts':
        return (
          <AdminDistrictsSection
            currentUser={currentUser}
            districts={districts}
            onUpdateDistricts={(updated) => {
              setDistricts(updated);
              safeStorageSetItem('ardaw_dynamic_districts', updated);
              window.dispatchEvent(new CustomEvent('ardaw_form_config_updated'));
              showToast('أحياء أسيوط', 'تم تحديث قائمة المناطق بنجاح.');
            }}
          />
        );

      case 'ratings':
        return (
          <AdminRatingsSection
            currentUser={currentUser}
            ratings={ratings}
            onDeleteRating={handleDeleteRating}
            onRefresh={loadDatabaseData}
          />
        );

      case 'trend':
        return (
          <AdminTrendPostsSection
            currentUser={currentUser}
            trendPosts={trendPosts}
            onUpdateStatus={handleUpdateTrendStatus}
            onDeletePost={handleDeleteTrendPost}
            onRefresh={loadDatabaseData}
          />
        );

      case 'roles_management':
        return (
          <RoleClassificationManagement
            currentUser={currentUser}
            onNavigateToUsers={() => setActiveSection('users')}
          />
        );

      case 'admins':
        return (
          <AdminRoleManagement
            currentUser={currentUser}
            onAdminsUpdated={loadDatabaseData}
          />
        );

      case 'logs':
        return (
          <AdminAuditLogsSection
            currentUser={currentUser}
          />
        );

      case 'settings':
      case 'export_settings':
        return (
          <AdminSettingsSection
            currentUser={currentUser}
            properties={properties}
            tenantRequests={tenantRequests}
            users={users}
          />
        );

      case 'screenshot_converter':
        return (
          <ScreenshotConverter
            onPublishProperty={(p) => onAddProperty && onAddProperty(p)}
            onPublishTenantRequest={(r) => onAddTenantRequest && onAddTenantRequest(r)}
          />
        );

      case 'database_migrations':
        return (
          <DatabaseMigrationsTab
            onAddToast={onAddToast}
          />
        );

      case 'dropdowns':
        return (
          <DropdownManager
            categories={dropdownCategories}
            onUpdateCategory={onUpdateDropdownCategories}
            utilities={utilityDefinitions}
            onUpdateUtilities={onUpdateUtilityDefinitions}
            onResetDefaults={onResetDefaults}
          />
        );

      default:
        return (
          <AdminOverviewSection
            currentUser={currentUser}
            properties={properties}
            tenantRequests={tenantRequests}
            users={users}
            ratings={ratings}
            trendPosts={trendPosts}
            groups={groups}
            propertyTypes={propertyTypes}
            fields={formFields}
            onNavigate={(sec) => setActiveSection(sec)}
            onRefreshAll={loadDatabaseData}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFB] text-[#24313D] pb-16" dir="rtl">
      {/* Top Mobile / Tablet Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Drawer Toggle */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              aria-label="فتح القائمة الجانبية"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#124C46] text-white flex items-center justify-center font-bold shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-extrabold text-[#124C46] font-['Tajawal','Cairo',sans-serif]">
                  لوحة تحكم سكن أسيوط
                </h1>
                <p className="text-[10px] text-slate-500 hidden sm:block">
                  إدارة شاملة وقابلة للتعديل المباشر في قاعدة البيانات
                </p>
              </div>
            </div>
          </div>

          {/* Quick User & Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadDatabaseData}
              disabled={isLoadingData}
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              title="تحديث البيانات من Supabase"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
            </button>

            {onLockAdmin && (
              <button
                type="button"
                onClick={onLockAdmin}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">قفل اللوحة</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Layout with Desktop Sidebar & Mobile Drawer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
        <div className="flex gap-6 items-start">
          {/* Desktop Fixed Sidebar (Docked on Right in RTL) */}
          <div className="hidden lg:block w-72 shrink-0 sticky top-20 max-h-[calc(100vh-6rem)]">
            <AdminDrawer
              isOpen={true}
              variant="sidebar"
              onClose={() => {}}
              activeSection={activeSection}
              onSelectSection={(sec) => setActiveSection(sec)}
              currentUser={currentUser}
              pendingModerationCount={pendingModerationCount}
              blockedUsersCount={blockedUsersCount}
              onLockAdmin={onLockAdmin}
            />
          </div>

          {/* Mobile Overlay Drawer */}
          <AdminDrawer
            isOpen={isDrawerOpen}
            variant="drawer"
            onClose={() => setIsDrawerOpen(false)}
            activeSection={activeSection}
            onSelectSection={(sec) => {
              setActiveSection(sec);
              setIsDrawerOpen(false);
            }}
            currentUser={currentUser}
            pendingModerationCount={pendingModerationCount}
            blockedUsersCount={blockedUsersCount}
            onLockAdmin={onLockAdmin}
          />

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            {renderActiveSectionContent()}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;

