import { AppUser, Property, TenantRequest } from '../types/property';
import { isStaffRole, hasSectionAccess } from './adminManager';
import { normalizeEgyptianPhone } from './phoneValidator';

/**
 * Checks if two Egyptian phone numbers match after standardizing formats
 * (e.g. '01001234567', '+201001234567', '201001234567')
 */
export function arePhonesMatching(phone1?: string | null, phone2?: string | null): boolean {
  if (!phone1 || !phone2) return false;
  const p1 = String(phone1).trim();
  const p2 = String(phone2).trim();
  if (p1 === p2) return true;

  const digits1 = p1.replace(/\D/g, '');
  const digits2 = p2.replace(/\D/g, '');
  if (digits1 && digits2 && digits1 === digits2) return true;

  const norm1 = normalizeEgyptianPhone(p1);
  const norm2 = normalizeEgyptianPhone(p2);
  if (norm1 && norm2 && norm1 === norm2) return true;

  // Handle leading 20 vs 0 (e.g. 20100... vs 0100...)
  const trimmed1 = digits1.startsWith('20') ? digits1.slice(2) : digits1.startsWith('0') ? digits1.slice(1) : digits1;
  const trimmed2 = digits2.startsWith('20') ? digits2.slice(2) : digits2.startsWith('0') ? digits2.slice(1) : digits2;
  return Boolean(trimmed1 && trimmed2 && trimmed1 === trimmed2);
}

/**
 * Evaluates whether currentUser is authorized to edit a property:
 * 1. Super Admins & General Admins (always authorized)
 * 2. Reviewers / Staff with 'moderation' permission (authorized)
 * 3. Support staff (NOT authorized for editing ads unless given moderation permission)
 * 4. Property Owner whose phone strictly matches property.ownerPhone
 * 5. Publisher / Account owner whose ID or phone matches
 * 6. Regular users browsing someone else's ad: STRICTLY FORBIDDEN (returns false)
 */
export function canUserEditProperty(
  currentUser: AppUser | null | undefined, 
  property: Property | null | undefined
): boolean {
  if (!currentUser || !property) return false;

  // 1. Super Admin and General Admin have operational clearance
  if (currentUser.role === 'super_admin' || currentUser.role === 'admin') {
    return true;
  }

  // 2. Staff roles must have explicit 'moderation' permission
  if (isStaffRole(currentUser.role)) {
    return hasSectionAccess(currentUser.role, 'moderation');
  }

  // 3. Regular users: must be the verified owner of the ad by phone or ID
  // Note: Never rely on matching names alone (name collision / forgery risk)
  if (arePhonesMatching(currentUser.phone, property.ownerPhone)) {
    return true;
  }

  // If the property has an explicit publisher/creator phone or userId:
  const anyProp = property as any;
  if (anyProp.publisherPhone && arePhonesMatching(currentUser.phone, anyProp.publisherPhone)) {
    return true;
  }
  if (anyProp.userId && currentUser.id && anyProp.userId === currentUser.id) {
    return true;
  }

  return false;
}

/**
 * Evaluates whether currentUser is authorized to delete a property:
 * 1. Super Admin and Admin (authorized)
 * 2. Property Owner whose phone strictly matches
 */
export function canUserDeleteProperty(
  currentUser: AppUser | null | undefined, 
  property: Property | null | undefined
): boolean {
  if (!currentUser || !property) return false;
  if (currentUser.role === 'super_admin' || currentUser.role === 'admin') {
    return true;
  }
  if (arePhonesMatching(currentUser.phone, property.ownerPhone)) {
    return true;
  }
  const anyProp = property as any;
  if (anyProp.userId && currentUser.id && anyProp.userId === currentUser.id) {
    return true;
  }
  return false;
}

/**
 * Evaluates whether currentUser is authorized to edit a tenant request
 */
export function canUserEditTenantRequest(
  currentUser: AppUser | null | undefined, 
  request: TenantRequest | null | undefined
): boolean {
  if (!currentUser || !request) return false;

  if (currentUser.role === 'super_admin' || currentUser.role === 'admin') {
    return true;
  }

  if (isStaffRole(currentUser.role)) {
    return hasSectionAccess(currentUser.role, 'moderation');
  }

  if (arePhonesMatching(currentUser.phone, request.tenantPhone)) {
    return true;
  }

  const anyReq = request as any;
  if (anyReq.userId && currentUser.id && anyReq.userId === currentUser.id) {
    return true;
  }

  return false;
}

/**
 * Evaluates whether currentUser is authorized to delete a tenant request
 */
export function canUserDeleteTenantRequest(
  currentUser: AppUser | null | undefined, 
  request: TenantRequest | null | undefined
): boolean {
  if (!currentUser || !request) return false;
  if (currentUser.role === 'super_admin' || currentUser.role === 'admin') {
    return true;
  }
  if (arePhonesMatching(currentUser.phone, request.tenantPhone)) {
    return true;
  }
  const anyReq = request as any;
  if (anyReq.userId && currentUser.id && anyReq.userId === currentUser.id) {
    return true;
  }
  return false;
}
