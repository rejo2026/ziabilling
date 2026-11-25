import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, AlertCircle, Check } from 'lucide-react';
import { LoginDesignerConfig } from '../types';

interface LoginPageProps {
  onLoginSuccess: (session: any) => void;
  branches: any[];
  config?: Partial<LoginDesignerConfig>;
  currentLang: string;
  onLanguageChange: (lang: string) => void;
}

// Fine-line brake rotor: the one drawing on the page. Built from circles and
// slots so it stays crisp at any size.
function RotorDrawing() {
  const cx = 200;
  const slots = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    const r1 = 100;
    const r2 = 158;
    return { x1: cx + Math.cos(a) * r1, y1: cx + Math.sin(a) * r1, x2: cx + Math.cos(a) * r2, y2: cx + Math.sin(a) * r2 };
  });
  const bolts = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(a) * 42, y: cx + Math.sin(a) * 42 };
  });
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full" fill="none" stroke="currentColor" aria-hidden="true">
      <g style={{ transformOrigin: '200px 200px', animation: 'rotor-spin 120s linear infinite' }}>
        <circle cx={cx} cy={cx} r="186" strokeWidth="1.2" />
        <circle cx={cx} cy={cx} r="172" strokeWidth="0.8" opacity="0.7" />
        <circle cx={cx} cy={cx} r="164" strokeWidth="0.8" opacity="0.5" />
        <circle cx={cx} cy={cx} r="94" strokeWidth="0.8" opacity="0.5" />
        <circle cx={cx} cy={cx} r="76" strokeWidth="1.2" />
        <circle cx={cx} cy={cx} r="58" strokeWidth="0.8" opacity="0.7" />
        <circle cx={cx} cy={cx} r="20" strokeWidth="1.2" />
        {slots.map((s, i) => (
          <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} strokeWidth="0.8" opacity="0.55" />
        ))}
        {bolts.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r="6.5" strokeWidth="1" />
        ))}
      </g>
      {/* dimension line */}
      <g strokeWidth="0.8" opacity="0.8">
        <line x1="14" y1="394" x2="386" y2="394" />
        <line x1="14" y1="388" x2="14" y2="400" />
        <line x1="386" y1="388" x2="386" y2="400" />
      </g>
    </svg>
  );
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
  const [showPassword, setShowPassword] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [defaultAdminActive, setDefaultAdminActive] = useState(false);

  const isRTL = currentLang === 'ar';
  const t = (en: string, ar: string) => (isRTL ? ar : en);

  const companyName = config?.companyName || 'Zia-Billing';
  const accent = config?.buttonColor;

  useEffect(() => {
    fetch('http://localhost:4200/api/auth/bootstrap-status')
      .then(r => r.json())
      .then(d => setDefaultAdminActive(!!d.defaultAdminPasswordUnchanged))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedBranch && branches[0]?.id) setSelectedBranch(branches[0].id);
  }, [branches, selectedBranch]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('http://localhost:4200/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, branchId: selectedBranch })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || t('Sign-in failed. Check your username and password.', 'فشل تسجيل الدخول. تحقق من اسم المستخدم وكلمة المرور.'));
      } else {
        onLoginSuccess(data);
      }
    } catch {
      setErrorMsg(t('Cannot reach the Zia-Billing server. Make sure the app is running.', 'تعذر الاتصال بخادم النظام. تأكد من تشغيل التطبيق.'));
    } finally {
      setLoading(false);
    }
  };

  const field =
    'w-full h-11 rounded-lg bg-slate-950 border border-slate-700 px-3.5 text-sm text-slate-100 placeholder:text-slate-500 ' +
    'hover:border-slate-600 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-colors';

  const points = [
    t('Fast counter billing and POS', 'فوترة سريعة ونقطة بيع'),
    t('Stock tracked across every branch', 'مخزون متتبع في كل الفروع'),
    t('VAT 201 returns for the UAE', 'إقرارات ضريبة القيمة المضافة 201')
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] bg-slate-950 text-slate-100" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-slate-900 border-e border-slate-800 p-12">
        <div className="absolute -end-72 top-1/2 -translate-y-1/2 w-[760px] h-[760px] text-blue-400/25 pointer-events-none">
          <RotorDrawing />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 grid place-items-center font-black text-white">Z</div>
          <span className="font-semibold text-slate-100">{companyName}</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white">
            {t('Billing, stock and VAT for every counter.', 'الفوترة والمخزون وضريبة القيمة المضافة لكل نقطة بيع.')}
          </h1>
          <ul className="mt-8 space-y-3 text-sm text-slate-300">
            {points.map(p => (
              <li key={p} className="flex items-center gap-3">
                <span className="grid place-items-center w-5 h-5 rounded-full bg-blue-600/25 text-blue-300"><Check size={12} strokeWidth={3} /></span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">{config?.announcementText || t('Official UAE Federal Tax Authority 5% VAT system.', 'نظام ضريبة القيمة المضافة 5% المعتمد في الإمارات.')}</p>
      </aside>

      {/* Sign-in panel */}
      <main className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between lg:justify-end">
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-600 grid place-items-center font-black text-white text-sm">Z</div>
            <span className="font-semibold">{companyName}</span>
          </div>
          <button
            type="button"
            onClick={() => onLanguageChange(isRTL ? 'en' : 'ar')}
            className="text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-md border border-slate-700 hover:border-slate-600 transition-colors"
          >
            {isRTL ? 'English' : 'العربية'}
          </button>
        </div>

        <div className="flex-1 grid place-items-center">
          <div className="w-full max-w-sm">
            {!showForgot ? (
              <>
                <h2 className="text-2xl font-semibold text-white tracking-tight">{t('Sign in', 'تسجيل الدخول')}</h2>
                <p className="mt-1.5 text-sm text-slate-400">
                  {config?.subtitle || t('Use the login your administrator gave you.', 'استخدم بيانات الدخول التي زودك بها المسؤول.')}
                </p>

                {errorMsg && (
                  <div role="alert" className="mt-5 flex items-start gap-2.5 rounded-lg border border-rose-800/70 bg-rose-950/50 p-3 text-sm text-rose-200">
                    <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-slate-200 mb-1.5">{t('Username', 'اسم المستخدم')}</label>
                    <input
                      id="username"
                      type="text"
                      required
                      autoFocus
                      autoComplete="username"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="username"
                      className={field}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="password" className="block text-sm font-medium text-slate-200">{t('Password', 'كلمة المرور')}</label>
                      <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-blue-400 hover:text-blue-300">
                        {t('Forgot password?', 'نسيت كلمة المرور؟')}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className={`${field} pe-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        aria-label={showPassword ? t('Hide password', 'إخفاء كلمة المرور') : t('Show password', 'إظهار كلمة المرور')}
                        className="absolute inset-y-0 end-0 w-11 grid place-items-center text-slate-400 hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="branch" className="block text-sm font-medium text-slate-200 mb-1.5">{t('Branch', 'الفرع')}</label>
                    <select id="branch" value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className={field}>
                      {branches && branches.length > 0 ? (
                        branches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}{b.emirate ? ` (${b.emirate})` : ''}</option>
                        ))
                      ) : (
                        <option value="">{t('Your assigned branch', 'الفرع المخصص لك')}</option>
                      )}
                    </select>
                    <p className="mt-1.5 text-xs text-slate-500">
                      {t('Staff always sign in to their assigned branch. Only administrators can choose.', 'يدخل الموظفون إلى فرعهم المخصص فقط. المسؤولون فقط يمكنهم الاختيار.')}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={accent ? { backgroundColor: accent } : undefined}
                    className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? t('Signing in…', 'جارٍ تسجيل الدخول…') : t('Sign in', 'تسجيل الدخول')}
                  </button>
                </form>

                {defaultAdminActive && (
                  <div className="mt-6 rounded-lg border border-amber-800/50 bg-amber-950/30 p-3.5 text-sm text-amber-100">
                    <p className="font-medium">{t('First time using Zia-Billing?', 'أول استخدام للنظام؟')}</p>
                    <p className="mt-1 text-amber-200/90">
                      {t('Sign in as', 'سجّل الدخول باسم')} <span className="font-mono text-white">admin</span> {t('with password', 'وكلمة المرور')} <span className="font-mono text-white">admin123</span>
                      {t('. You will be asked to choose your own password straight away.', '. سيُطلب منك اختيار كلمة مرور خاصة بك فوراً.')}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="text-2xl font-semibold text-white tracking-tight">{t('Reset your password', 'إعادة تعيين كلمة المرور')}</h2>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  {t(
                    'Your administrator resets passwords. Ask them to set a temporary password for you in Module Manager, then sign in and choose your own.',
                    'يقوم المسؤول بإعادة تعيين كلمات المرور. اطلب منه تعيين كلمة مرور مؤقتة لك ثم سجّل الدخول واختر كلمة مرورك.'
                  )}
                </p>
                <button
                  onClick={() => setShowForgot(false)}
                  className="mt-6 w-full h-11 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-semibold transition-colors"
                >
                  {t('Back to sign in', 'العودة لتسجيل الدخول')}
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500">© 2026 {companyName}</p>
      </main>
    </div>
  );
}
