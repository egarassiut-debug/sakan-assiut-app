export type PropertyGroupId = 'residential' | 'commercial' | 'admin_medical' | 'lands' | 'industrial_storage';

export interface PropertyGroupDefinition {
  id: PropertyGroupId;
  name: string;
  description: string;
  iconName: string;
  sortOrder: number;
  isActive: boolean;
}

export interface PropertyTypeDefinition {
  id: string;
  groupId: PropertyGroupId;
  name: string;
  description?: string;
  sortOrder: number;
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
  applicableGroups: ('all' | PropertyGroupId)[];
  applicableTypes?: string[];
  options?: string[];
  sortOrderOffer: number;
  sortOrderRequest: number;
  isActive: boolean;
}

export interface DynamicFormConfig {
  groups: PropertyGroupDefinition[];
  propertyTypes: PropertyTypeDefinition[];
  fieldDefinitions: FormFieldDefinition[];
  districts: string[];
  finishingOptions: string[];
  paymentFrequencies: { id: string; label: string }[];
  version: string;
}
