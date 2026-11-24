import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Layout, 
  Type, 
  Sliders, 
  Save, 
  CheckCircle2, 
  Sparkles, 
  Eye, 
  RotateCcw,
  Monitor
} from 'lucide-react';
import { ThemeConfig } from '../types';

interface ThemeSettingsProps {
  isRTL: boolean;
  onThemeUpdate?: (theme: ThemeConfig) => void;
}

export default function ThemeSettingsPage({ isRTL, onThemeUpdate }: ThemeSettingsProps) {
  const [theme, setTheme] = useState<ThemeConfig>({
    themeMode: 'light',
    primaryColor: '#1e3a8a',
    accentColor: '#d97706',
    sidebarColor: '#0f172a',
    buttonRadius: '8px',
    cardRadius: '10px',
    tableDensity: 'compact',
    fontSize: '14px',
    fontFamily: 'Inter, system-ui, sans-serif'
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetch('http://localhost:4200/api/settings/theme')
      .then(res => res.json())
      .then(d => {
        if (d && d.primaryColor) setTheme(d);
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:4200/api/settings/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(theme)
      });
      if (res.ok) {
        setSavedSuccess(true);
        if (onThemeUpdate) onThemeUpdate(theme);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const applyPreset = (presetName: string) => {
    if (presetName === 'uae-navy') {
      setTheme({
        themeMode: 'light',
        primaryColor: '#1e3a8a',
        accentColor: '#d97706',
        sidebarColor: '#0f172a',
        buttonRadius: '8px',
        cardRadius: '12px',
        tableDensity: 'compact',
        fontSize: '14px',
        fontFamily: 'Inter, system-ui, sans-serif'
      });
    } else if (presetName === 'emerald-gulf') {
      setTheme({
        themeMode: 'light',
        primaryColor: '#065f46',
        accentColor: '#ca8a04',
        sidebarColor: '#064e3b',
        buttonRadius: '6px',
        cardRadius: '8px',
        tableDensity: 'compact',
        fontSize: '14px',
        fontFamily: 'Inter, system-ui, sans-serif'
      });
    } else if (presetName === 'dark-enterprise') {
      setTheme({
        themeMode: 'dark',
        primaryColor: '#3b82f6',
        accentColor: '#f59e0b',
        sidebarColor: '#020617',
        buttonRadius: '10px',
        cardRadius: '14px',
        tableDensity: 'normal',
        fontSize: '14px',
        fontFamily: 'Inter, system-ui, sans-serif'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Palette className="w-6 h-6 text-amber-500" />
            <span>{isRTL ? 'تخصيص مظهر وواجهة المستخدم' : 'ERP Theme Customizer & Design Tokens'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRTL 
              ? 'تغيير ألوان النظام، هوية المتجر، كثافة الجداول، ودرجة استدارة الأزرار والبطاقات'
              : 'Customize application brand colors, typography, sidebar palettes, and layout density.'}
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 bg-emerald-950 border border-emerald-800 px-3 py-1.5 rounded-xl text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>{isRTL ? 'تم حفظ وتطبيق المظهر بنجاح!' : 'Theme updated and applied!'}</span>
          </div>
        )}
      </div>

      {/* Theme Presets */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{isRTL ? 'الأنماط الجاهزة (Presets)' : 'Design Presets'}</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => applyPreset('uae-navy')}
            className="p-3 rounded-xl border border-blue-800 bg-blue-950/40 hover:bg-blue-950 text-left cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3.5 h-3.5 rounded-full bg-blue-600 inline-block" />
              <span className="w-3.5 h-3.5 rounded-full bg-amber-500 inline-block" />
              <strong className="text-xs text-white">UAE Corporate Navy</strong>
            </div>
            <p className="text-[11px] text-slate-400">Professional dark blue & desert gold</p>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('emerald-gulf')}
            className="p-3 rounded-xl border border-emerald-800 bg-emerald-950/40 hover:bg-emerald-950 text-left cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 inline-block" />
              <span className="w-3.5 h-3.5 rounded-full bg-yellow-500 inline-block" />
              <strong className="text-xs text-white">Gulf Emerald</strong>
            </div>
            <p className="text-[11px] text-slate-400">Deep emerald green & gold accent</p>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('dark-enterprise')}
            className="p-3 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-800 text-left cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3.5 h-3.5 rounded-full bg-slate-900 inline-block" />
              <span className="w-3.5 h-3.5 rounded-full bg-blue-500 inline-block" />
              <strong className="text-xs text-white">Midnight Enterprise</strong>
            </div>
            <p className="text-[11px] text-slate-400">OLED high contrast dark mode</p>
          </button>
        </div>
      </div>

      {/* Custom Form */}
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Colors */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm border-b border-slate-800 pb-2">
              {isRTL ? 'ألوان الواجهة والعلامة التجارية' : 'Brand & Interface Colors'}
            </h4>
            
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Primary Color (Action Buttons)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={theme.primaryColor}
                  onChange={e => setTheme({ ...theme, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={theme.primaryColor}
                  onChange={e => setTheme({ ...theme, primaryColor: e.target.value })}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Accent Color (Badges & Highlights)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={theme.accentColor}
                  onChange={e => setTheme({ ...theme, accentColor: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={theme.accentColor}
                  onChange={e => setTheme({ ...theme, accentColor: e.target.value })}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Sidebar Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={theme.sidebarColor}
                  onChange={e => setTheme({ ...theme, sidebarColor: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={theme.sidebarColor}
                  onChange={e => setTheme({ ...theme, sidebarColor: e.target.value })}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Density & Radii */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm border-b border-slate-800 pb-2">
              {isRTL ? 'كثافة الجداول والاستدارة' : 'Geometry & Density'}
            </h4>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Table & Row Density</label>
              <select
                value={theme.tableDensity}
                onChange={e => setTheme({ ...theme, tableDensity: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
              >
                <option value="compact">Compact (High Information Density for POS)</option>
                <option value="normal">Standard Normal</option>
                <option value="spacious">Spacious</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Button Corner Radius</label>
              <select
                value={theme.buttonRadius}
                onChange={e => setTheme({ ...theme, buttonRadius: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
              >
                <option value="4px">Slight (4px)</option>
                <option value="8px">Medium Modern (8px)</option>
                <option value="12px">Rounded (12px)</option>
                <option value="9999px">Fully Pill (Pill Shaped)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Card & Modal Radius</label>
              <select
                value={theme.cardRadius}
                onChange={e => setTheme({ ...theme, cardRadius: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
              >
                <option value="6px">Sharp (6px)</option>
                <option value="10px">Standard (10px)</option>
                <option value="16px">Modern Curved (16px)</option>
              </select>
            </div>
          </div>

          {/* Typography */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm border-b border-slate-800 pb-2">
              {isRTL ? 'الخطوط والطباعة' : 'Typography'}
            </h4>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Font Family</label>
              <select
                value={theme.fontFamily}
                onChange={e => setTheme({ ...theme, fontFamily: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
              >
                <option value="Inter, system-ui, sans-serif">Inter (Modern Clean Sans)</option>
                <option value="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif">Segoe UI / Corporate ERP</option>
                <option value="'Cairo', 'Tajawal', sans-serif">Cairo / Tajawal (Enhanced Arabic)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Base Font Size</label>
              <select
                value={theme.fontSize}
                onChange={e => setTheme({ ...theme, fontSize: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
              >
                <option value="13px">Compact (13px)</option>
                <option value="14px">Standard (14px)</option>
                <option value="15px">Comfortable Large (15px)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/30 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isRTL ? 'حفظ وتطبيق إعدادات المظهر' : 'Save Theme Tokens'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
