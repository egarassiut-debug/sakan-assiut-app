import React, { useState, useEffect } from 'react';
import { AppUser } from '../types/property';
import { 
  Building2, User, ShieldCheck, Lock, Phone, 
  CheckCircle2, AlertCircle, Eye, EyeOff, UserPlus, LogIn, KeyRound 
} from 'lucide-react';
import { verifyAdminPasskey, saveSecureSession } from '../utils/security';
import { validateEgyptianPhone, normalizeEgyptianPhone, isValidEgyptianPhone } from '../utils/phoneValidator';

interface AuthScreenProps {
  onLoginSuccess: (user: AppUser) => void;
}

// Default demonstration users
const DEFAULT_USERS: AppUser[] = [
  {
    id: 'user-regular-default',
    name: 'م. أحمد عبد الرحيم',
    phone: '01012345678',
    pin: '1234',
    role: 'user',
    createdAt: '2026-10-10',
  },
];

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  // Navigation mode: 'login' | 'register' | 'admin'
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'admin'>('login');
  
  // Standard user state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [adminSecurityCode, setAdminSecurityCode] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPin, setShowPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dedicated admin portal state
  const [adminIdentifier, setAdminIdentifier] = useState('admin');
  const [adminPasskey, setAdminPasskey] = useState('');
  const [showAdminPasskey, setShowAdminPasskey] = useState(false);

  // Initialize and load saved credentials or user db
  useEffect(() => {
    try {
      // 1. Ensure default users exist in db
      const existingDb = localStorage.getItem('ardaw_users_db');
      if (!existingDb) {
        localStorage.setItem('ardaw_users_db', JSON.stringify(DEFAULT_USERS));
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

  // Standard Login / Registration Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let usersDb: AppUser[] = DEFAULT_USERS;
    try {
      const stored = localStorage.getItem('ardaw_users_db');
      if (stored) usersDb = JSON.parse(stored);
    } catch {
      usersDb = DEFAULT_USERS;
    }

    if (authMode === 'register') {
      // 1. Strict Egyptian Mobile Validation (11 digits, 010/011/012/015)
      const phoneError = validateEgyptianPhone(phone, 'رقم الموبايل');
      if (phoneError) {
        setErrorMessage(phoneError);
        return;
      }

      if (pin.length !== 4) {
        setErrorMessage('كلمة المرور يجب أن تتكون من 4 أرقام بالضبط (مثال: 1234).');
        return;
      }
      if (!name.trim()) {
        setErrorMessage('برجاء إدخال الاسم بالكامل.');
        return;
      }

      // If registering as admin, securely verify passkey against cryptographic hash
      if (role === 'admin') {
        const isAllowed = await verifyAdminPasskey(adminSecurityCode);
        if (!isAllowed) {
          setErrorMessage('رمز التحقق الإداري السري غير صحيح أو غير مصرح به.');
          return;
        }
      }

      // Check if phone already exists
      const existingUser = usersDb.find((u) => u.phone === phone);
      if (existingUser) {
        setErrorMessage(`رقم الهاتف (${phone}) مسجل بالفعل لدينا. يمكنك تسجيل الدخول مباشرة.`);
        setAuthMode('login');
        return;
      }

      const newUser: AppUser = {
        id: `user-${Date.now()}`,
        name: name.trim(),
        phone,
        pin,
        role,
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
      // Login Mode: validate phone format if not using admin username
      if (phone !== 'admin' && phone !== '01000000000') {
        const phoneError = validateEgyptianPhone(phone, 'رقم الموبايل');
        if (phoneError) {
          setErrorMessage(phoneError);
          return;
        }
      }

      if (pin.length !== 4) {
        setErrorMessage('كلمة المرور يجب أن تتكون من 4 أرقام بالضبط (مثال: 1234).');
        return;
      }

      // Credential check
      let foundUser = usersDb.find((u) => u.phone === phone && u.pin === pin);

      // Support entering admin passkey directly in standard login
      if (!foundUser) {
        const isAdminPass = await verifyAdminPasskey(pin);
        if (isAdminPass && (phone === 'admin' || phone === '01000000000' || usersDb.some((u) => u.phone === phone && u.role === 'admin'))) {
          foundUser = usersDb.find((u) => u.role === 'admin') || {
            id: 'admin-master',
            name: 'مدير المنظومة',
            phone: phone === 'admin' ? '01000000000' : phone,
            pin: '••••',
            role: 'admin',
            createdAt: new Date().toISOString().split('T')[0],
          };
        }
      }

      if (!foundUser) {
        setErrorMessage('رقم الهاتف أو كلمة المرور غير صحيحة! تأكد من صحة البيانات.');
        return;
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

  // Dedicated Admin Portal Login Handler
  const handleAdminPortalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const passkey = adminPasskey.trim();
    if (!passkey) {
      setErrorMessage('برجاء إدخال كلمة مرور أو رمز الإدارة السري.');
      return;
    }

    // Cryptographic SHA-256 verification against authorized hashes
    const isValid = await verifyAdminPasskey(passkey);
    if (!isValid) {
      setErrorMessage('رمز المرور الإداري غير صحيح أو غير مصرح به.');
      return;
    }

    let usersDb: AppUser[] = [];
    try {
      const stored = localStorage.getItem('ardaw_users_db');
      if (stored) usersDb = JSON.parse(stored);
    } catch {
      usersDb = [];
    }

    const identifier = adminIdentifier.trim() || 'admin';
    if (identifier !== 'admin' && /\d/.test(identifier)) {
      const phoneError = validateEgyptianPhone(identifier, 'رقم هاتف الإدارة');
      if (phoneError) {
        setErrorMessage(phoneError);
        return;
      }
    }

    const existingAdmin = usersDb.find((u) => u.role === 'admin');
    const adminUser: AppUser = existingAdmin || {
      id: 'admin-master',
      name: identifier === 'admin' ? 'مدير المنظومة' : identifier,
      phone: identifier === 'admin' ? '01000000000' : identifier,
      pin: '••••',
      role: 'admin',
      createdAt: new Date().toISOString().split('T')[0],
    };

    // Store admin in users list if new
    if (!existingAdmin) {
      localStorage.setItem('ardaw_users_db', JSON.stringify([adminUser, ...usersDb]));
    }

    if (rememberMe) {
      localStorage.setItem('ardaw_saved_credentials', JSON.stringify({ phone: adminUser.phone, pin: '••••' }));
    }

    // Generate cryptographic signed session
    await saveSecureSession(adminUser);

    // Direct routing to Admin Dashboard
    onLoginSuccess(adminUser);
  };

  // Quick Demo Login Handler (Regular User only)
  const handleQuickDemoLogin = async () => {
    const user = DEFAULT_USERS[0];
    if (rememberMe) {
      localStorage.setItem('ardaw_saved_credentials', JSON.stringify({ phone: user.phone, pin: user.pin }));
    }
    await saveSecureSession(user);
    onLoginSuccess(user);
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

          <div className="absolute top-4 left-4">
            <span className="text-[10px] bg-[#FFB300] text-[#002B49] font-black px-2 py-0.5 rounded-full shadow-xs">
              أسيوط
            </span>
          </div>
        </div>

        {/* Tab Switcher: تسجيل الدخول vs حساب جديد vs دخول الإدارة */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-1.5 gap-1 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
              authMode === 'login'
                ? 'bg-[#002B49] text-[#FFB300] shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>تسجيل الدخول</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
              authMode === 'register'
                ? 'bg-[#002B49] text-[#FFB300] shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>حساب جديد</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('admin');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
              authMode === 'admin'
                ? 'bg-amber-500 text-[#002B49] shadow-xs font-black ring-1 ring-amber-600'
                : 'text-amber-900 bg-amber-50/70 hover:bg-amber-100 border border-amber-200/80 font-bold'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
            <span>دخول الإدارة 🛡️</span>
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

          {/* 1. DEDICATED ADMIN PORTAL TAB */}
          {authMode === 'admin' ? (
            <form onSubmit={handleAdminPortalLogin} className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 bg-gradient-to-r from-amber-50 via-amber-50/60 to-white border border-amber-300 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-[#002B49] flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldCheck className="w-5 h-5 font-bold" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-amber-950">بوابة تسجيل دخول مدير المنظومة</h3>
                  <p className="text-[10px] text-amber-800/90 font-medium mt-0.5">
                    مخصصة للإدارة المعتمدة للتحكم الكامل في العروض والطلبات والاعتمادات
                  </p>
                </div>
              </div>

              {/* Admin Username / Phone */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">
                  اسم المستخدم أو هاتف الإدارة <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={adminIdentifier}
                    onChange={(e) => setAdminIdentifier(e.target.value)}
                    placeholder="admin أو 01000000000"
                    className="w-full pr-10 pl-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                </div>
              </div>

              {/* Admin Passkey */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>رمز المرور الإداري السري</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-amber-900 font-bold bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300">
                    تشفير SHA-256
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showAdminPasskey ? 'text' : 'password'}
                    required
                    value={adminPasskey}
                    onChange={(e) => setAdminPasskey(e.target.value)}
                    placeholder="أدخل رمز مرور الإدارة (1234 أو admin1234)"
                    className="w-full pr-10 pl-10 py-2.5 text-center text-xs tracking-wider bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPasskey(!showAdminPasskey)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showAdminPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 text-[10px] text-slate-600 space-y-0.5">
                  <div>
                    🔑 <span className="font-bold">الرمز الافتراضي المعتمد للإدارة:</span>{' '}
                    <span className="font-mono font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">1234</span>{' '}
                    أو{' '}
                    <span className="font-mono font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">admin1234</span>
                  </div>
                </div>
              </div>

              {/* Remember Admin Session */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-[#002B49] focus:ring-[#002B49] w-4 h-4 cursor-pointer"
                  />
                  <span>تذكر جلسة الإدارة الآمنة على هذا الجهاز</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#002B49] via-[#00223B] to-[#001D33] hover:from-[#001D33] hover:to-[#001424] text-[#FFB300] font-black text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer border border-amber-400/40"
              >
                <ShieldCheck className="w-4 h-4 text-[#FFB300]" />
                <span>دخول لوحة التحكم الإدارية (Admin Dashboard)</span>
              </button>
            </form>
          ) : (
            /* 2. STANDARD USER / REGISTRATION FORM */
            <form onSubmit={handleSubmit} className="space-y-3.5">
              
              {/* Full Name (Registration only) */}
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

              {/* Phone Number (Username) */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">
                  رقم الموبايل (اسم المستخدم) <span className="text-rose-500">*</span>
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
              </div>

              {/* Account Type Selection (Registration only) */}
              {authMode === 'register' && (
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-black text-slate-800">
                    نوع الحساب <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('user')}
                      className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                        role === 'user'
                          ? 'border-[#002B49] bg-blue-50/70 text-[#002B49] shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <User className={`w-4 h-4 ${role === 'user' ? 'text-[#002B49]' : 'text-slate-400'}`} />
                        {role === 'user' && <CheckCircle2 className="w-3.5 h-3.5 text-[#002B49]" />}
                      </div>
                      <div className="mt-2">
                        <div className="font-black text-xs">مستخدم عادي</div>
                        <div className="text-[10px] text-slate-500">باحث / مستأجر / مالك</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                        role === 'admin'
                          ? 'border-amber-500 bg-amber-50/80 text-amber-950 shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <ShieldCheck className={`w-4 h-4 ${role === 'admin' ? 'text-amber-600' : 'text-slate-400'}`} />
                        {role === 'admin' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />}
                      </div>
                      <div className="mt-2">
                        <div className="font-black text-xs">مدير النظام (أدمن)</div>
                        <div className="text-[10px] text-slate-500">صلاحيات الإدارة الكاملة</div>
                      </div>
                    </button>
                  </div>

                  {/* Admin Verification Code field if admin is selected */}
                  {role === 'admin' && (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-1 animate-in fade-in">
                      <label className="block text-[11px] font-black text-amber-950">
                        كود التحقق الإداري السري <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="password"
                        value={adminSecurityCode}
                        onChange={(e) => setAdminSecurityCode(e.target.value)}
                        placeholder="أدخل رمز التحقق الإداري السري (1234)"
                        className="w-full p-2 text-xs bg-white border border-amber-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-mono text-center font-bold"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Remember Me Option */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-[#002B49] focus:ring-[#002B49] w-4 h-4 cursor-pointer"
                  />
                  <span>تذكر بيانات الدخول على هذا الجهاز</span>
                </label>

                {authMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setErrorMessage(null);
                    }}
                    className="text-xs text-[#002B49] font-black hover:underline"
                  >
                    حساب جديد؟
                  </button>
                )}
              </div>

              {/* Primary Action Button */}
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-[#FFB300] font-black text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {authMode === 'register' ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>إنشاء الحساب وبدء الاستخدام</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>تسجيل الدخول للمنظومة</span>
                  </>
                )}
              </button>

              {/* Quick switch to Admin Login */}
              {authMode === 'login' && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('admin');
                      setErrorMessage(null);
                    }}
                    className="text-xs text-amber-800 hover:text-amber-950 font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>هل أنت مدير المنظومة؟ اضغط هنا للدخول الإداري 🛡️</span>
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Quick Demo Preview Button (Regular User only) */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 block text-center">
              دخول سريع وتجربة فورية (للمعاينة):
            </span>
            <div className="w-full">
              <button
                type="button"
                onClick={handleQuickDemoLogin}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-slate-200 cursor-pointer"
              >
                <User className="w-4 h-4 text-blue-600" />
                <span>دخول سريع لحساب مستخدم عادي (استعراض العروض والطلبات)</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      <div className="mt-4 text-center text-xs text-slate-400">
        منظومة عرض وطلب العقارية • محافظة أسيوط
      </div>
    </div>
  );
};
