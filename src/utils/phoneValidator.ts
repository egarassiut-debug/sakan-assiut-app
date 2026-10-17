/**
 * Utility for validating and normalizing Egyptian mobile phone numbers.
 * 
 * Rules for Egyptian mobile numbers:
 * - Exactly 11 digits
 * - Must start with 01
 * - The third digit must be 0, 1, 2, or 5:
 *   - 010: Vodafone Egypt
 *   - 011: Etisalat Egypt (e&)
 *   - 012: Orange Egypt
 *   - 015: WE (Telecom Egypt)
 */

export const EGYPTIAN_MOBILE_PREFIXES = ['010', '011', '012', '015'] as const;

/**
 * Converts eastern Arabic-Indic numerals (٠-٩) to standard ASCII digits (0-9).
 */
export function convertArabicToEnglishDigits(str: string): string {
  if (!str) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[٠-٩]/g, (w) => arabicDigits.indexOf(w).toString());
}

/**
 * Normalizes phone string into clean 11-digit Egyptian format.
 * Strips whitespace, dashes, country code (+20, 0020, 20), etc.
 */
export function normalizeEgyptianPhone(input: string): string {
  if (!input) return '';
  
  // Convert Arabic numerals to standard digits
  let cleaned = convertArabicToEnglishDigits(input.trim());

  // Remove any non-digit characters except leading plus if any
  cleaned = cleaned.replace(/[^\d+]/g, '');

  // Handle international formats:
  // e.g. +201012345678 -> 01012345678
  // e.g. 00201012345678 -> 01012345678
  if (cleaned.startsWith('+20')) {
    cleaned = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('0020')) {
    cleaned = '0' + cleaned.substring(4);
  } else if (cleaned.startsWith('20') && cleaned.length === 12 && cleaned[2] === '1') {
    // 201012345678 -> 01012345678
    cleaned = '0' + cleaned.substring(2);
  }

  // Strip any remaining non-digits
  return cleaned.replace(/\D/g, '');
}

/**
 * Checks whether the given phone number is a valid 11-digit Egyptian mobile number.
 */
export function isValidEgyptianPhone(phone: string): boolean {
  const normalized = normalizeEgyptianPhone(phone);
  // Must be 11 digits and start with 010, 011, 012, or 015
  return /^01[0125]\d{8}$/.test(normalized);
}

/**
 * Returns a human-friendly Arabic error message explaining the validation error,
 * or null if the phone number is completely valid.
 */
export function validateEgyptianPhone(phone: string, fieldName: string = 'رقم الهاتف'): string | null {
  if (!phone || !phone.trim()) {
    return `يرجى إدخال ${fieldName}.`;
  }

  const normalized = normalizeEgyptianPhone(phone);

  if (normalized.length === 0) {
    return `${fieldName} غير صالح، يرجى كتابة أرقام فقط.`;
  }

  if (!normalized.startsWith('01')) {
    return `${fieldName} يجب أن يبدأ بـ 01 (مثال: 010 أو 011 أو 012 أو 015).`;
  }

  if (normalized.length >= 3) {
    const prefix = normalized.substring(0, 3);
    if (!['010', '011', '012', '015'].includes(prefix)) {
      return `بادئة ${fieldName} (${prefix}) غير صحيحة. يجب أن تبدأ بـ 010 (فودافون) أو 011 (اتصالات) أو 012 (أورنج) أو 015 (وي).`;
    }
  }

  if (normalized.length !== 11) {
    return `${fieldName} يجب أن يتكون من 11 رقماً بالضبط (المكتوب حالياً: ${normalized.length} رقم).`;
  }

  if (!/^01[0125]\d{8}$/.test(normalized)) {
    return `${fieldName} غير صحيح. يرجى إدخال 11 رقماً تبدأ بـ 010 أو 011 أو 012 أو 015.`;
  }

  return null;
}
