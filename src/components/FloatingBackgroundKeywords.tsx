import React, { memo } from 'react';

/**
 * Aesthetic Floating Keywords Background Overlay (Exclusive to Landing/Welcome Screen)
 * Displays semi-transparent, randomly angled Arabic real estate keywords
 * ('بيع', 'شراء', 'إيجار', 'شقق', 'أسيوط', 'مفروش', 'تمليك', etc.)
 * Strictly configured with opacity 0.20, pointer-events-none, and positioned
 * exclusively along the outer screen perimeters and flanks so that NO words ever
 * sit behind or clutter the login form or inner application interfaces.
 */
interface KeywordItem {
  id: string;
  text: string;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  rotation: string;
  fontSize: string;
  color: string;
  weight: string;
  visibility?: string;
}

const KEYWORDS_LIST: KeywordItem[] = [
  // Top Perimeter (Above the central form)
  { id: 'top-1', text: 'أسيوط', top: '3%', right: '10%', rotation: '-rotate-12', fontSize: 'text-2xl md:text-4xl', color: 'text-[#124C46]', weight: 'font-black' },
  { id: 'top-2', text: 'بيع', top: '4%', left: '12%', rotation: 'rotate-15', fontSize: 'text-2xl md:text-3xl', color: 'text-[#D4AF37]', weight: 'font-extrabold' },
  { id: 'top-3', text: 'شقق', top: '5%', right: '40%', rotation: '-rotate-6', fontSize: 'text-xl md:text-2xl', color: 'text-[#124C46]', weight: 'font-bold', visibility: 'hidden sm:block' },
  { id: 'top-4', text: 'إيجار', top: '4%', left: '42%', rotation: 'rotate-12', fontSize: 'text-xl md:text-3xl', color: 'text-[#124C46]', weight: 'font-black', visibility: 'hidden sm:block' },

  // Right Flank (Out on the right margin - hidden on mobile so it never collides with login form)
  { id: 'rf-1', text: 'عقارات', top: '22%', right: '4%', rotation: 'rotate-18', fontSize: 'text-2xl md:text-4xl', color: 'text-[#124C46]', weight: 'font-black', visibility: 'hidden md:block' },
  { id: 'rf-2', text: 'تمليك', top: '40%', right: '3%', rotation: '-rotate-15', fontSize: 'text-2xl md:text-3xl', color: 'text-[#D4AF37]', weight: 'font-black', visibility: 'hidden md:block' },
  { id: 'rf-3', text: 'أبراج', top: '58%', right: '5%', rotation: 'rotate-14', fontSize: 'text-2xl md:text-4xl', color: 'text-[#124C46]', weight: 'font-black', visibility: 'hidden md:block' },
  { id: 'rf-4', text: 'استثمار', top: '75%', right: '4%', rotation: '-rotate-20', fontSize: 'text-xl md:text-3xl', color: 'text-[#D4AF37]', weight: 'font-bold', visibility: 'hidden md:block' },

  // Left Flank (Out on the left margin - hidden on mobile so it never collides with login form)
  { id: 'lf-1', text: 'شراء', top: '24%', left: '4%', rotation: '-rotate-18', fontSize: 'text-2xl md:text-3xl', color: 'text-[#0D3D38]', weight: 'font-extrabold', visibility: 'hidden md:block' },
  { id: 'lf-2', text: 'مفروش', top: '42%', left: '3%', rotation: 'rotate-15', fontSize: 'text-2xl md:text-4xl', color: 'text-[#D4AF37]', weight: 'font-black', visibility: 'hidden md:block' },
  { id: 'lf-3', text: 'سكن', top: '60%', left: '5%', rotation: '-rotate-12', fontSize: 'text-2xl md:text-4xl', color: 'text-[#124C46]', weight: 'font-black', visibility: 'hidden md:block' },
  { id: 'lf-4', text: 'أراضي', top: '78%', left: '4%', rotation: 'rotate-20', fontSize: 'text-xl md:text-3xl', color: 'text-[#124C46]', weight: 'font-extrabold', visibility: 'hidden md:block' },

  // Bottom Perimeter (Below the central form)
  { id: 'bot-1', text: 'معاينة', bottom: '3%', right: '14%', rotation: '-rotate-12', fontSize: 'text-xl md:text-2xl', color: 'text-[#0D3D38]', weight: 'font-bold' },
  { id: 'bot-2', text: 'أسيوط', bottom: '3%', left: '16%', rotation: 'rotate-15', fontSize: 'text-2xl md:text-3xl', color: 'text-[#124C46]', weight: 'font-black' },
  { id: 'bot-3', text: 'توثيق', bottom: '3%', right: '45%', rotation: '-rotate-8', fontSize: 'text-lg md:text-2xl', color: 'text-[#D4AF37]', weight: 'font-bold', visibility: 'hidden sm:block' },
];

export const FloatingBackgroundKeywords: React.FC = memo(() => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0"
      style={{ opacity: 0.2 }}
    >
      {KEYWORDS_LIST.map((item) => (
        <span
          key={item.id}
          className={`absolute ${item.rotation} ${item.fontSize} ${item.color} ${item.weight} tracking-wider font-['Tajawal','Cairo',sans-serif] ${item.visibility || ''}`}
          style={{
            top: item.top,
            bottom: item.bottom,
            left: item.left,
            right: item.right,
            userSelect: 'none',
          }}
        >
          {item.text}
        </span>
      ))}
    </div>
  );
});

FloatingBackgroundKeywords.displayName = 'FloatingBackgroundKeywords';
