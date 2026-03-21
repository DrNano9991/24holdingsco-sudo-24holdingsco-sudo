import React, { useEffect } from 'react';
import ECGAnimation from './ECGAnimation';
import { Activity, ShieldAlert } from 'lucide-react';
import { useTranslation } from '../contexts/TranslationContext';

const Screensaver: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-[200] bg-[#F3F3F3] flex flex-col items-center justify-center overflow-hidden animate-in fade-in duration-500">
      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col items-center space-y-8 w-full max-w-4xl px-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-2 py-1 bg-white border border-[#D1D1D1] text-red-600">
            <ShieldAlert size={14} />
            <span className="text-[9px] font-bold uppercase tracking-wider">{t('systemStandby')}</span>
          </div>
          <h1 className="text-5xl font-bold text-slate-800">
            AI <span className="text-[#0078D7]">MEDICA</span>
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">{t('biometricStream')}</p>
        </div>

        {/* ECG Display */}
        <div className="w-full bg-white border border-[#D1D1D1] p-6 relative group overflow-hidden shadow-none">
          <div className="absolute top-2 left-4 flex items-center gap-2">
            <Activity className="text-red-500" size={14} />
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('liveECG')}</span>
          </div>
          <div className="absolute top-2 right-4 text-[9px] font-mono text-emerald-600 uppercase">
            {t('heartRate')}: 72 BPM • {t('sinusRhythm')}
          </div>
          <div className="mt-4">
            <ECGAnimation />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 w-full">
          {[
            { label: t('neuralLink'), value: 'Active', color: 'text-[#0078D7]' },
            { label: t('bioSync'), value: '98.4%', color: 'text-emerald-600' },
            { label: t('uptime'), value: '24:00:00', color: 'text-slate-500' }
          ].map((stat, i) => (
            <div key={i} className="text-center space-y-1 bg-white border border-[#D1D1D1] py-3">
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="pt-8">
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">
            {t('resume')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Screensaver;
