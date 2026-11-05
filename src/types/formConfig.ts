export type PropertyCategoryId = 'residential' | 'commercial' | 'admin_medical' | 'lands' | 'industrial_storage' | string;
export type PropertyGroupId = PropertyCategoryId;

export interface PropertyCategoryDefinition {
  id: PropertyCategoryId;
  name: string;
  description: string;
  icon: string;
  displayOrder: number;
  isActive: boolean;
  // Aliases for backwards compatibility
  iconName?: string;
  sortOrder?: number;
}
export type PropertyGroupDefinition = PropertyCategoryDefinition;

export interface PropertyTypeDefinition {
  id: string;
  categoryId: PropertyCategoryId;
  // Alias for backwards compatibility
  groupId?: PropertyCategoryId;
  name: string;
  description?: string;
  displayOrder: number;
  sortOrder?: number;
  isActive: boolean;
}

export type FormFieldType = 
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'currency'
  | 'single_select'
  | 'multi_select'
  | 'boolean'
  | 'range'
  | 'date';

export type FormDisplayType =
  | 'quick_chips'
  | 'dropdown'
  | 'multi_chips'
  | 'number_stepper'
  | 'range_slider'
  | 'toggle'
  | 'text_input';

export interface FormFieldDefinition {
  id: string;
  fieldKey: string;
  label: string;
  helpText?: string;
  fieldType: FormFieldType;
  displayType: FormDisplayType;
  isRequired: boolean;
  formScope: 'offer_only' | 'request_only' | 'both';
  operationScope: 'sale_only' | 'rent_only' | 'both';
  applicableGroups: ('all' | PropertyCategoryId)[];
  applicableCategories?: ('all' | PropertyCategoryId)[];
  applicableTypes?: string[];
  options?: string[];
  sortOrderOffer: number;
  sortOrderRequest: number;
  isActive: boolean;
}

export interface DynamicFormConfig {
  categories?: PropertyCategoryDefinition[];
  groups: PropertyCategoryDefinition[];
  propertyTypes: PropertyTypeDefinition[];
  fieldDefinitions: FormFieldDefinition[];
  districts: string[];
  finishingOptions: string[];
  paymentFrequencies: { id: string; label: string }[];
  version: string;
}

