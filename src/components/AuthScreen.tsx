import React, { useState, useEffect } from 'react';
import { AppUser } from '../types/property';
import { 
  Building2, User, Lock, Phone, 
  CheckCircle2, AlertCircle, Eye, EyeOff, UserPlus, LogIn, MessageCircle 
} from 'lucide-react';
import { verifyAdminPasskey, saveSecureSession } from '../utils/security';
import { validateEgyptianPhone, normalizeEgyptianPhone, isValidEgyptianPhone } from '../utils/phoneValidator';
import { isAuthorizedAdminPhone, findAdminByPhone } from '../utils/adminManager';
import { PWAInstallButton } from './PWAInstallButton';

interface AuthScreenProps {
  onLoginSuccess: (user: AppUser) => void;
}

// Default Demonstration Users with preconfigured accounts
const DEFAULT_USERS: AppUser[] = [
  {
    id: 'user-regular-default',
    name: 'م. أحمد عبد الرحيم',
    phone: '01012345678',
    pin: '1234',
    role: 'user',
    createdAt: '2026-10-10',
  },
  {
    id: 'admin-sec-1',
    name: 'مسؤول المنظومة',
    phone: '01002345678',
    pin: '1234',
    role: 'admin',
    createdAt: '2026-10-10',
  },
  {
    id: 'admin-sec-2',
    name: 'المشرف العام',
    phone: '01000000000',
    pin: '1234',
    role: 'admin',
    createdAt: '2026-10-10',
  },
  {
    id: 'admin-sec-3',
    name: 'مسؤول العمليات',
    phone: '01011112222',
    pin: '1234',
    role: 'admin',
    createdAt: '2026-10-10',
  },
  {
    id: 'admin-sec-4',
    name: 'مسؤول المعاينات',
    phone: '01122334455',
    pin: '1234',
    role: 'admin',
    createdAt: '2026-10-10',
  },
  {
    id: 'admin-sec-5',
    name: 'مسؤول التدقيق',
    phone: '01223344556',
    pin: '1234',
    role: 'admin',
    createdAt: '2026-10-10',
  },
];

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  // Navigation mode: 'login' | 'register' (Clean 2-mode UI)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Input fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPin, setShowPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize and load saved credentials or user db
  useEffect(() => {
    try {
      // 1. Ensure default users exist in db
      const existingDb = localStorage.getItem('ardaw_users_db');
      if (!existingDb) {
        localStorage.setItem('ardaw_users_db', JSON.stringify(DEFAULT_USERS));
      } else {
        // Ensure admin accounts are populated in db if missing
        try {
          const parsed: AppUser[] = JSON.parse(existingDb);
          let modified = false;
          DEFAULT_USERS.forEach((defUser) => {
            if (!parsed.some((u) => u.phone === defUser.phone)) {
              parsed.push(defUser);
              modified = true;
            }
          });
          if (modified) {
            localStorage.setItem('ardaw_users_db', JSON.stringify(parsed));
          }
        } catch {
          // ignore parsing error
        }
      }

      // 2. Load saved credentials if available
      const savedCreds = localStorage.getItem('ardaw_saved_credentials');
      if (savedCreds) {
        const parsed = JSON.parse(savedCreds);
        if (parsed.phone && parsed.pin) {
          setPhone(parsed.phone);
          setPin(parsed.pin);
          setAuthMode('login');
        }
      }
    } catch (e) {
      console.error('Error reading auth cache:', e);
    }
  }, []);

  const handlePhoneChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length <= 11) {
      setPhone(cleaned);
      setErrorMessage(null);
    }
  };

  const handlePinChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length <= 4) {
      setPin(cleaned);
      setErrorMessage(null);
    }
  };

  // Form Submission Handler: Single unified login and registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const normalizedPhone = normalizeEgyptianPhone(phone);

    // 1. Strict Egyptian Mobile Validation (11 digits starting with 010, 011, 012, 015)
    const phoneError = validateEgyptianPhone(phone, 'رقم الموبايل');
    if (phoneError) {
      setErrorMessage(phoneError);
      return;
    }

    // 2. PIN Validation (4 digits)
    if (pin.length !== 4) {
      setErrorMessage('كلمة المرور يجب أن تتكون من 4 أرقام بالضبط (مثال: 1234).');
      return;
    }

    let usersDb: AppUser[] = DEFAULT_USERS;
    try {
      const stored = localStorage.getItem('ardaw_users_db');
      if (stored) usersDb = JSON.parse(stored);
    } catch {
      usersDb = DEFAULT_USERS;
    }

    // Check if the phone belongs to the authorized admins list
    const isAuthorizedAdmin = isAuthorizedAdminPhone(phone) || isAuthorizedAdminPhone(normalizedPhone);

    if (authMode === 'register') {
      if (!name.trim()) {
        setErrorMessage('برجاء إدخال الاسم بالكامل.');
        return;
      }

      // Check if phone already registered
      const existingUser = usersDb.find((u) => u.phone === phone || u.phone === normalizedPhone);
      if (existingUser) {
        setErrorMessage(`رقم الهاتف (${phone}) مسجل بالفعل لدينا. يمكنك تسجيل الدخول مباشرة.`);
        setAuthMode('login');
        return;
      }

      // Role is determined strictly by the phone number
      const assignedRole: 'user' | 'admin' = isAuthorizedAdmin ? 'admin' : 'user';

      const newUser: AppUser = {
        id: isAuthorizedAdmin ? `admin-${Date.now()}` : `user-${Date.now()}`,
        name: name.trim(),
        phone,
        pin,
        role: assignedRole,
        createdAt: new Date().toISOString().split('T')[0],
      };

      const updatedDb = [newUser, ...usersDb];
      localStorage.setItem('ardaw_users_db', JSON.stringify(updatedDb));

      if (rememberMe) {
        localStorage.setItem('ardaw_saved_credentials', JSON.stringify({ phone, pin }));
      }

      await saveSecureSession(newUser);
      onLoginSuccess(newUser);
    } else {
      // Login Mode
      let foundUser = usersDb.find(
        (u) => (u.phone === phone || u.phone === normalizedPhone) && u.pin === pin
      );

      // Support fallback for approved admin numbers with their registered PIN, default PIN '1234', or admin passkey
      if (!foundUser && isAuthorizedAdmin) {
        const matchingAdmin = findAdminByPhone(phone) || findAdminByPhone(normalizedPhone);
        const isPasskeyMatch = await verifyAdminPasskey(pin);
        if ((matchingAdmin && matchingAdmin.pin === pin) || pin === '1234' || isPasskeyMatch) {
          foundUser = {
            id: matchingAdmin ? matchingAdmin.id : `admin-${phone}`,
            name: matchingAdmin ? matchingAdmin.name : 'مشرف المنظومة',
            phone,
            pin,
            role: 'admin',
            createdAt: matchingAdmin ? matchingAdmin.createdAt : new Date().toISOString().split('T')[0],
          };
          const updatedDb = [foundUser, ...usersDb.filter((u) => u.phone !== phone)];
          localStorage.setItem('ardaw_users_db', JSON.stringify(updatedDb));
        }
      }

      // Support fallback for demo regular user with PIN '1234'
      if (!foundUser && phone === '01012345678' && pin === '1234') {
        foundUser = DEFAULT_USERS[0];
      }

      if (!foundUser) {
        setErrorMessage('رقم الهاتف أو كلمة المرور غير صحيحة! تأكد من صحة البيانات.');
        return;
      }

      // Check if user is blocked by administration
      if (foundUser.isBlocked) {
        setErrorMessage(
          `هذا الحساب محظور حالياً من قِبل إدارة المنظومة ${
            foundUser.blockedReason ? `(السبب: ${foundUser.blockedReason})` : ''
          }. برجاء التواصل مع الإدارة عبر الواتساب لإعادة تفعيل الحساب.`
        );
        return;
      }

      // Hidden role enforcement: The 5 approved admin phone numbers always get 'admin' role
      if (isAuthorizedAdmin) {
        foundUser.role = 'admin';
      } else {
        foundUser.role = 'user';
      }

      if (rememberMe) {
        localStorage.setItem('ardaw_saved_credentials', JSON.stringify({ phone, pin }));
      } else {
        localStorage.removeItem('ardaw_saved_credentials');
      }

      await saveSecureSession(foundUser);
      onLoginSuccess(foundUser);
    }
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-b from-[#002B49] via-[#001D33] to-slate-900 flex flex-col justify-center items-center px-4 py-8 text-slate-800 font-['Cairo'] select-none"
      dir="rtl"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Branding */}
        <div className="bg-[#002B49] p-6 text-center text-white relative">
          <div className="w-16 h-16 mx-auto bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-md mb-3">
            <Building2 className="w-9 h-9 text-[#FFB300]" />
          </div>
          <h1 className="text-xl font-black text-white">منصة عرض وطلب - أسيوط</h1>
          <p className="text-xs text-slate-300 mt-1">
            المنظومة العقارية المعتمدة لعروض وطلبات العقارات بأسيوط
          </p>

          <div className="absolute top-4 left-4 flex items-center gap-2">
            <PWAInstallButton />
            <span className="text-[10px] bg-[#FFB300] text-[#002B49] font-black px-2 py-0.5 rounded-full shadow-xs">
              أسيوط
            </span>
          </div>
        </div>

        {/* Tab Switcher: Only 2 options (تسجيل الدخول / حساب جديد) without any admin references */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-1.5 gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'login'
                ? 'bg-[#002B49] text-[#FFB300] shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>تسجيل الدخول</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'register'
                ? 'bg-[#002B49] text-[#FFB300] shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>حساب جديد</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2 text-xs text-rose-800 font-semibold animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name (Only shown when creating a new account) */}
            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">
                  الاسم بالكامل <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: أحمد عبد الرحيم"
                    className="w-full pr-10 pl-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002B49] font-medium"
                  />
                </div>
              </div>
            )}

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-black text-slate-800 mb-1">
                رقم الموبايل <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  dir="ltr"
                  required
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="01012345678"
                  className="w-full pr-10 pl-16 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002B49] font-mono font-bold text-right"
                />
                {isValidEgyptianPhone(phone) ? (
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    صحيح
                  </span>
                ) : phone.length > 0 ? (
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono font-bold">
                    {phone.length}/11
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                <span>11 رقماً يبدأ بـ (010، 011، 012، 015)</span>
                {phone.length >= 3 && (
                  <span className={`font-bold ${['010','011','012','015'].includes(phone.substring(0,3)) ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {phone.startsWith('010') ? 'فودافون' : phone.startsWith('011') ? 'اتصالات' : phone.startsWith('012') ? 'أورنج' : phone.startsWith('015') ? 'وي' : 'بادئة غير صحيحة'}
                  </span>
                )}
              </div>
            </div>

            {/* 4-Digit Password / PIN */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black text-slate-800">
                  كلمة المرور (4 أرقام) <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  {pin.length}/4 أرقام
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  dir="ltr"
                  maxLength={4}
                  required
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  placeholder="••••"
                  className="w-full pr-10 pl-10 py-2.5 text-center text-sm tracking-widest bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002B49] font-mono font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* رابط استعادة كلمة المرور عبر الواتساب */}
              {authMode === 'login' && (
                <div className="flex justify-end mt-1.5">
                  <a
                    href={`https://wa.me/201002345678?text=${encodeURIComponent(
                      `السلام عليكم ورحمة الله، أود استعادة أو إعادة تعيين كلمة المرور (رمز PIN) لحسابي على منصة عرض وطلب أسيوط${
                        phone ? ` (رقم هاتفي المسجل: ${phone})` : ''
                      }.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>نسيت كلمة المرور؟ تواصل مع الإدارة عبر الواتساب</span>
                  </a>
                </div>
              )}
            </div>

            {/* Remember Me Option */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-[#002B49] focus:ring-[#002B49] w-4 h-4 cursor-pointer"
                />
                <span>تذكر بيانات الدخول</span>
              </label>

              {authMode === 'login' ? (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMessage(null);
                  }}
                  className="text-xs text-[#002B49] font-black hover:underline cursor-pointer"
                >
                  حساب جديد؟
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMessage(null);
                  }}
                  className="text-xs text-[#002B49] font-black hover:underline cursor-pointer"
                >
                  لديك حساب؟ تسجيل الدخول
                </button>
              )}
            </div>

            {/* Single Large Action Button */}
            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-[#FFB300] font-black text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-3"
            >
              {authMode === 'register' ? (
                <>
                  <UserPlus className="w-4.5 h-4.5" />
                  <span>إنشاء حساب جديد</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4.5 h-4.5" />
                  <span>تسجيل الدخول</span>
                </>
              )}
            </button>
          </form>
        </div>

      </div>

      <div className="mt-4 text-center text-xs text-slate-400">
        منظومة عرض وطلب العقارية • محافظة أسيوط
      </div>
    </div>
  );
};
