import React, { useState, useEffect } from 'react';
import MedicalBackground from './MedicalBackground';
import ECGAnimation from './ECGAnimation';
import { Activity, ShieldAlert } from 'lucide-react';
import { useTranslation } from '../contexts/TranslationContext';

const Screensaver: React.FC = () => {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<'default' | 'emerald' | 'rose' | 'amber'>('default');
  const themes: ('default' | 'emerald' | 'rose' | 'amber')[] = ['default', 'emerald', 'rose', 'amber'];

  useEffect(() => {
    const interval = setInterval(() => {
      setTheme(prev => {
        const currentIndex = themes.indexOf(prev);
        return themes[(currentIndex + 1) % themes.length];
      });
    }, 8000); // Cycle every 8 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[200] bg-[#f8fafc] flex flex-col items-center justify-center overflow-hidden animate-in fade-in duration-1000">
      {/* Intense DNA Background */}
      <div className="absolute inset-0 opacity-100">
        <MedicalBackground theme={theme} />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col items-center space-y-12 w-full max-w-4xl px-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-red-600/5 border border-red-500/10 text-red-600 animate-pulse">
            <ShieldAlert size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">{t('systemStandby')}</span>
          </div>
          <h1 className="text-6xl font-black text-slate-800 tracking-tighter">
            AI <span className="text-red-600">MEDICA</span>
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.5em] text-xs">{t('biometricStream')}</p>
        </div>

        {/* ECG Display */}
        <div className="w-full glass-panel p-8 shadow-2xl relative group overflow-hidden">
          <div className="absolute top-4 left-6 flex items-center gap-2">
            <Activity className="text-red-500 animate-pulse" size={16} />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('liveECG')}</span>
          </div>
          <div className="absolute top-4 right-6 text-[10px] font-mono text-emerald-600 uppercase">
            {t('heartRate')}: 72 BPM • {t('sinusRhythm')}
          </div>
          <ECGAnimation />
        </div>

        <div className="grid grid-cols-3 gap-8 w-full">
          {[
            { label: t('neuralLink'), value: 'Active', color: 'text-blue-600' },
            { label: t('bioSync'), value: '98.4%', color: 'text-emerald-600' },
            { label: t('uptime'), value: '24:00:00', color: 'text-slate-500' }
          ].map((stat, i) => (
            <div key={i} className="text-center space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="pt-12">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] animate-bounce">
            {t('resume')}
          </p>
        </div>
      </div>

      {/* Ambient Glows */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-red-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-600/5 rounded-full blur-[120px]" />
      </div>
    </div>
  );
};

export default Screensaver;
