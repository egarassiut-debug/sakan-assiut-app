import { normalizeEgyptianPhone } from './phoneValidator';

export interface ParsedVoiceResult {
  propertyType?: string;
  purpose?: 'rent' | 'sale';
  district?: string;
  area?: number | string;
  price?: number | string;
  bedrooms?: number | string;
  bathrooms?: number | string;
  floorLevel?: number | string;
  hasElevator?: boolean;
  ownerPhone?: string;
  address?: string;
  facade?: string;
  description?: string;
}

/**
 * Intelligent voice parsing utility for Egyptian Arabic real estate descriptions
 * e.g. "شقة للإيجار في شركة قلتة مساحة 120 متر ثلاث غرف وحمامين الدور الرابع وفيه اسانسير مطلوب 3500 جنيه"
 */
export function parseArabicVoiceTranscript(
  transcript: string,
  activePropertyTypes: string[] = [],
  activeDistricts: string[] = [],
  _utilityDefinitions?: any[]
): ParsedVoiceResult {
  const result: ParsedVoiceResult = {};
  if (!transcript || !transcript.trim()) return result;

  const text = transcript.toLowerCase();

  // 1. Detect Purpose
  if (text.includes('إيجار') || text.includes('ايجار') || text.includes('للايجار') || text.includes('للإيجار')) {
    result.purpose = 'rent';
  } else if (text.includes('بيع') || text.includes('تمليك') || text.includes('للبيع')) {
    result.purpose = 'sale';
  }

  // 2. Detect Property Type from active types
  for (const pType of activePropertyTypes) {
    if (text.includes(pType.toLowerCase())) {
      result.propertyType = pType;
      break;
    }
  }
  if (!result.propertyType) {
    if (text.includes('شقة')) result.propertyType = 'شقة سكنية';
    else if (text.includes('محل') || text.includes('تجاري')) result.propertyType = 'محل تجاري';
    else if (text.includes('مكتب') || text.includes('عيادة')) result.propertyType = 'مكتب إداري';
    else if (text.includes('فيلا')) result.propertyType = 'فيلا';
    else if (text.includes('أرض') || text.includes('ارض')) result.propertyType = 'قطعة أرض';
  }

  // 3. Detect District from active districts
  for (const dist of activeDistricts) {
    if (text.includes(dist.toLowerCase())) {
      result.district = dist;
      break;
    }
  }

  // 4. Detect Area (e.g. مساحة 120 متر or 150م)
  const areaMatch = text.match(/(?:مساحة|مساحتها|بمساحة)?\s*([0-9٠-٩]+)\s*(?:متر|م²|م)/);
  if (areaMatch) {
    const norm = normalizeEgyptianPhone(areaMatch[1]);
    if (norm) result.area = parseInt(norm, 10);
  }

  // 5. Detect Price (e.g. مطلوب 3500 جنيه or 4000ج or السعر 5000)
  const priceMatch = text.match(/(?:سعر|مطلوب|بمبلغ|إيجار|ايجار)\s*([0-9٠-٩]+)\s*(?:جنيه|ج|الف|ألف)?/);
  if (priceMatch) {
    const norm = normalizeEgyptianPhone(priceMatch[1]);
    if (norm) result.price = parseInt(norm, 10);
  }

  // 6. Detect Bedrooms
  if (text.includes('غرفة واحدة') || text.includes('اوضة واحدة') || text.includes('استوديو')) {
    result.bedrooms = '1';
  } else if (text.includes('غرفتين') || text.includes('اوضتين') || text.includes('2 غرف')) {
    result.bedrooms = '2';
  } else if (text.includes('3 غرف') || text.includes('ثلاث غرف') || text.includes('تلات غرف') || text.includes('تلات اوض')) {
    result.bedrooms = '3';
  } else if (text.includes('4 غرف') || text.includes('أربع غرف') || text.includes('اربع غرف')) {
    result.bedrooms = '4';
  }

  // 7. Detect Bathrooms
  if (text.includes('حمامين') || text.includes('2 حمام')) {
    result.bathrooms = '2';
  } else if (text.includes('3 حمام') || text.includes('ثلاث حمامات')) {
    result.bathrooms = '3';
  } else if (text.includes('حمام')) {
    result.bathrooms = '1';
  }

  // 8. Detect Floor
  if (text.includes('أرضي') || text.includes('ارضي')) {
    result.floorLevel = '0';
  } else if (text.includes('الدور الاول') || text.includes('الدور الأول') || text.includes('اول بلكونة')) {
    result.floorLevel = '1';
  } else if (text.includes('الدور الثاني') || text.includes('الدور التاني')) {
    result.floorLevel = '2';
  } else if (text.includes('الدور الثالث') || text.includes('الدور التالت')) {
    result.floorLevel = '3';
  } else if (text.includes('الدور الرابع')) {
    result.floorLevel = '4';
  } else if (text.includes('الدور الخامس')) {
    result.floorLevel = '5';
  }

  // 9. Detect Elevator
  if (text.includes('اسانسير') || text.includes('أسانسير') || text.includes('مصعد')) {
    result.hasElevator = !text.includes('بدون اسانسير') && !text.includes('من غير اسانسير') && !text.includes('لا يوجد اسانسير');
  }

  // 10. Detect Phone number
  const phoneMatch = text.match(/(?:01[0125][0-9٠-٩]{8})/);
  if (phoneMatch) {
    result.ownerPhone = normalizeEgyptianPhone(phoneMatch[0]);
  }

  // 11. Description fallback
  result.description = transcript.trim();

  return result;
}
