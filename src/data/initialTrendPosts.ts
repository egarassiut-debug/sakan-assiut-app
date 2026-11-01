import { TrendPost, TrendSettings } from '../types/property';

export const DEFAULT_TREND_SETTINGS: TrendSettings = {
  expiryDays: 30, // شهر افتراضياً
  maxCharacters: 180,
  allowImageUpload: true,
};

// Compute expiry date helper
export const calculateExpiryDate = (days: number, fromDate: Date = new Date()): string => {
  const d = new Date(fromDate);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

export const INITIAL_TREND_POSTS: TrendPost[] = [
  {
    id: 'trend-1',
    authorName: 'م. أحمد عبد الرحيم',
    authorPhone: '01012345678',
    authorRole: 'مواطن / صاحب إعلان',
    content: 'فرصة عاجلة: شقة سوبر لوكس 3 غرف وريسبشن ببرج مرخص بالنميس قريبة من مستشفى الشرطة متاحة للإيجار من أول الشهر القادم.',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    expiresAt: calculateExpiryDate(30, new Date(Date.now() - 2 * 60 * 60 * 1000)),
    likesCount: 14,
    status: 'active',
    isPinned: true,
  },
  {
    id: 'trend-2',
    authorName: 'إدارة منظومة سكن أسيوط',
    authorPhone: '01002345678',
    authorRole: 'إدارة المنظومة الرسمية',
    content: 'تنويه لجميع الملاك والمستأجرين: يتم تدقيق الموقف القانوني للعقارات المعروضة والتأكد من مطابقة تراخيص المباني بأسيوط لحماية حقوق الطرفين.',
    createdAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(), // 14 hours ago
    expiresAt: calculateExpiryDate(30, new Date(Date.now() - 14 * 60 * 60 * 1000)),
    likesCount: 29,
    status: 'active',
    isPinned: true,
  },
  {
    id: 'trend-3',
    authorName: 'د. سامح كامل',
    authorPhone: '01007788990',
    authorRole: 'مالك مباشر',
    content: 'مطلوب استفسار سريع: هل متوفر مكتب إداري أو عيادة طبية بمساحة في حدود 70 متر بشارع الجمهورية أو الهلالي؟ التواصل اتصال أو واتساب فوراً.',
    createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(), // 1 day ago
    expiresAt: calculateExpiryDate(30, new Date(Date.now() - 26 * 60 * 60 * 1000)),
    likesCount: 6,
    status: 'active',
  },
  {
    id: 'trend-4',
    authorName: 'الأستاذة ميرفت حسين',
    authorPhone: '01289900112',
    authorRole: 'مشرفة سكن طالبات',
    content: 'متاح غرفتان بسكن طالبات هادئ بالوليدية بالقرب من جامعة الأزهر مع أمن وإنترنت فايبر ونظافة يومية. المعاينة متاحة يومياً من 4 حتى 8 مساءً.',
    image: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80',
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
    expiresAt: calculateExpiryDate(30, new Date(Date.now() - 48 * 60 * 60 * 1000)),
    likesCount: 19,
    status: 'active',
  },
];
