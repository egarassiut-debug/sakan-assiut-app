/**
 * Normalizes an Egyptian phone number:
 * - Converts Arabic digits (٠-٩) to English digits (0-9)
 * - Removes non-digits (+, -, spaces, parentheses)
 * - Handles country code prefixes (+20, 0020, 20) by turning them into Egyptian local standard (01...)
 */
export function normalizeEgyptianPhone(phone: string | null | undefined): string {
  if (!phone) return '';

  // 1. Replace Eastern Arabic numerals with Western digits
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let cleaned = phone.toString();
  for (let i = 0; i < 10; i++) {
    cleaned = cleaned.replace(new RegExp(arabicDigits[i], 'g'), i.toString());
  }

  // 2. Remove all non-numeric characters
  cleaned = cleaned.replace(/\D/g, '');

  // 3. Normalize international prefixes (+20 or 0020)
  if (cleaned.startsWith('0020')) {
    cleaned = '0' + cleaned.substring(4);
  } else if (cleaned.startsWith('20') && cleaned.length === 12) {
    cleaned = '0' + cleaned.substring(2);
  }

  return cleaned;
}

/**
 * Validates if the phone number is a valid 11-digit Egyptian mobile number:
 * Starting with 010, 011, 012, or 015.
 */
export function isValidEgyptianPhone(phone: string | null | undefined): boolean {
  const normalized = normalizeEgyptianPhone(phone);
  const regex = /^01[0125][0-9]{8}$/;
  return regex.test(normalized);
}

/**
 * Returns an Arabic validation error string if invalid, or null if valid.
 */
export function validateEgyptianPhone(
  phone: string | null | undefined,
  label: string = 'رقم الهاتف'
): string | null {
  if (!phone || !phone.trim()) {
    return `يرجى إدخال ${label}.`;
  }

  const normalized = normalizeEgyptianPhone(phone);

  if (normalized.length === 0) {
    return `يرجى إدخال ${label} بالأرقام فقط.`;
  }

  if (normalized.length !== 11) {
    return `${label} يجب أن يتكون من 11 رقماً (أدخلت ${normalized.length} أرقام).`;
  }

  if (!isValidEgyptianPhone(normalized)) {
    return `${label} غير صحيح. يجب أن يبدأ بكود شبكات مصر (010 أو 011 أو 012 أو 015).`;
  }

  return null;
}
