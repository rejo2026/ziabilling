import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Lock, 
  User, 
  ArrowRight, 
  ShieldCheck, 
  Globe2, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { LoginDesignerConfig } from '../types';

interface LoginPageProps {
  onLoginSuccess: (session: any) => void;
  branches: any[];
  config?: Partial<LoginDesignerConfig>;
  currentLang: string;
  onLanguageChange: (lang: string) => void;
}

export default function LoginPage({
  onLoginSuccess,
  branches,
  config,
  currentLang,
  onLanguageChange
}: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.id || 'BR-DXB-01');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [defaultAdminActive, setDefaultAdminActive] = useState(false);

  useEffect(() => {
    fetch('http://localhost:4200/api/auth/bootstrap-status')
      .then(r => r.json())
      .then(d => setDefaultAdminActive(!!d.defaultAdminPasswordUnchanged))
      .catch(() => {});
  }, []);

  const isRTL = currentLang === 'ar';

  const defaultBranding = {
    companyName: config?.companyName || 'Al Futtaim Auto Spare Parts ERP',
    loginHeading: config?.loginHeading || 'UAE Automotive Spare Parts Portal',
    subtitle: config?.subtitle || 'Bilingual POS, Multi-Branch Inventory & FTA VAT Compliance',
    announcementText: config?.announcementText || 'Official UAE Federal Tax Authority 5% VAT System • Support: +971 4 345 6789',
    backgroundColor: config?.backgroundColor || '#0f172a',
    buttonColor: config?.buttonColor || '#1e3a8a'
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('http://localhost:4200/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          branchId: selectedBranch
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Authentication failed. Please verify credentials.');
      } else {
        onLoginSuccess(data);
      }
    } catch (err: any) {
      setErrorMsg('Cannot connect to local ERP backend server at port 4200.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className={`min-h-screen flex flex-col justify-between p-4 md:p-8 text-slate-100 ${isRTL ? 'rtl' : 'ltr'}`}
      style={{ backgroundColor: defaultBranding.backgroundColor }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Top Bar with Language Selector */}
      <div className="flex justify-between items-center max-w-6xl mx-auto w-full py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/30">
            🏎️
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-wide text-white">{defaultBranding.companyName}</h1>
            <p className="text-xs text-blue-300">United Arab Emirates • UAE FTA TRN: 100482910400003</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-sm">
            <Globe2 className="w-4 h-4 text-blue-400" />
            <select
              value={currentLang}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-transparent text-xs text-white border-none outline-none cursor-pointer"
            >
              <option value="en" className="bg-slate-900 text-white">English (UAE)</option>
              <option value="ar" className="bg-slate-900 text-white">العربية (الإمارات)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-auto bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
        {/* Banner Notice */}
        {defaultBranding.announcementText && (
          <div className="mb-6 p-3 bg-blue-950/60 border border-blue-800/60 rounded-xl flex items-center gap-2.5 text-xs text-blue-300">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{defaultBranding.announcementText}</span>
          </div>
        )}

        {!showForgot ? (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white tracking-tight">{defaultBranding.loginHeading}</h2>
              <p className="text-xs text-slate-400 mt-1">{defaultBranding.subtitle}</p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl flex items-center gap-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  {isRTL ? 'اسم المستخدم' : 'Username'}
                </label>
                <div className="relative">
                  <User className={`w-4 h-4 text-slate-400 absolute top-3 ${isRTL ? 'right-3' : 'left-3'}`} />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    autoComplete="username"
                    className={`w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    {isRTL ? 'كلمة المرور' : 'Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {isRTL ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                  </button>
                </div>
                <div className="relative">
                  <Lock className={`w-4 h-4 text-slate-400 absolute top-3 ${isRTL ? 'right-3' : 'left-3'}`} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={`w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                  />
                </div>
              </div>

              {/* Branch Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  {isRTL ? 'فرع المتجر / المستودع' : 'Operational Branch / Warehouse'}
                </label>
                <div className="relative">
                  <Building2 className={`w-4 h-4 text-slate-400 absolute top-3 ${isRTL ? 'right-3' : 'left-3'}`} />
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className={`w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                  >
                    {branches && branches.length > 0 ? (
                      branches.map((b) => (
                        <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                          {b.name} ({b.emirate || 'UAE'})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="BR-DXB-01" className="bg-slate-900 text-white">Al Quoz Central Hub (Dubai)</option>
                        <option value="BR-SHJ-01" className="bg-slate-900 text-white">Sharjah Industrial Spare Parts (Sharjah)</option>
                        <option value="BR-AUH-01" className="bg-slate-900 text-white">Mussafah Logistics Depot (Abu Dhabi)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="remember" className="text-xs text-slate-300 cursor-pointer">
                  {isRTL ? 'تذكر جلسة تسجيل الدخول' : 'Remember my login session'}
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.99] transition-all shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>{isRTL ? 'جاري التحقق...' : 'Authenticating...'}</span>
                ) : (
                  <>
                    <span>{isRTL ? 'تسجيل الدخول للنظام' : 'Access Automotive ERP'}</span>
                    <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                  </>
                )}
              </button>
            </form>

            {defaultAdminActive && (
              <div className="mt-5 p-3 bg-amber-950/40 border border-amber-800/50 rounded-xl text-xs text-amber-200">
                <p className="font-semibold mb-0.5">First time here?</p>
                <p>Sign in as <span className="font-mono text-white">admin</span> with password <span className="font-mono text-white">admin123</span>. You will be asked to choose your own password right away.</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{isRTL ? 'استعادة كلمة المرور' : 'Forgot your password?'}</h2>
            <p className="text-xs text-slate-300 mb-6">
              {isRTL
                ? 'يقوم المسؤول بإعادة تعيين كلمات المرور. اطلب منه إعادة تعيين كلمة مرورك ثم سجّل الدخول بكلمة المرور المؤقتة.'
                : 'Passwords are reset by your administrator. Ask them to set a temporary password for you in Admin Hub → Users, then sign in and choose your own.'}
            </p>
            <button
              onClick={() => setShowForgot(false)}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors"
            >
              {isRTL ? 'العودة لتسجيل الدخول' : 'Back to sign in'}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 max-w-md mx-auto w-full py-2">
        <p>© 2026 {defaultBranding.companyName} • UAE Automotive ERP V2.0</p>
        <p className="text-[11px] text-slate-600 mt-1">Multi-Branch Inventory • POS Fast Billing • FTA VAT 5% Compliance</p>
      </div>
    </div>
  );
}
