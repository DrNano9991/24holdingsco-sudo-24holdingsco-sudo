import React from 'react';
import { GCSState, MEWSState, SIRSState, QSOFAState } from '../types';
import { GCS_OPTIONS } from '../constants';
import ScoreCard from './ScoreCard';
import { Brain, Activity, Zap, AlertTriangle } from 'lucide-react';

import { ScoringEngine } from '../services/scoringEngine';

interface Props {
  gcs: GCSState;
  setGcs: (val: GCSState) => void;
  mews: MEWSState;
  setMews: (val: MEWSState) => void;
  sirs: SIRSState;
  setSirs: (val: SIRSState) => void;
}

const CombinedCalculators: React.FC<Props> = ({ gcs, setGcs, mews, setMews, sirs, setSirs }) => {
  const gcsTotal = ScoringEngine.calculateGCS(gcs);

  const handleGcsChange = (key: keyof GCSState, val: number) => {
    setGcs({ ...gcs, [key]: val });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* GCS Calculator */}
      <ScoreCard title="GCS" subtitle="Glasgow Coma Scale" icon={<Brain size={20} />} score={gcsTotal} color="indigo">
        <div className="space-y-4">
          {(['eye', 'verbal', 'motor'] as const).map((type) => (
            <div key={type}>
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">{type} Response</p>
              <div className="grid grid-cols-2 gap-2">
                {GCS_OPTIONS[type].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleGcsChange(type, opt.value)}
                    className={`p-2 text-left rounded-xl border-2 transition-all ${
                      gcs[type] === opt.value 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900' 
                        : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs">{opt.label}</div>
                    <div className="text-[9px] opacity-70 font-medium">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScoreCard>

      {/* MEWS Calculator */}
      <ScoreCard title="MEWS" subtitle="Modified Early Warning" icon={<Zap size={20} />} color="orange">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">SBP (mmHg)</label>
              <input 
                type="number" 
                value={mews.sbp} 
                onChange={e => setMews({...mews, sbp: Number(e.target.value)})}
                className={`w-full p-3 bg-slate-900/40 border-2 rounded-xl font-bold text-sm outline-none transition-all ${
                  mews.sbp < 40 || mews.sbp > 250 ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800 focus:border-orange-400'
                }`}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">HR (bpm)</label>
              <input 
                type="number" 
                value={mews.hr} 
                onChange={e => setMews({...mews, hr: Number(e.target.value)})}
                className={`w-full p-3 bg-slate-900/40 border-2 rounded-xl font-bold text-sm outline-none transition-all ${
                  mews.hr < 20 || mews.hr > 220 ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800 focus:border-orange-400'
                }`}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">AVPU Score</label>
            <div className="grid grid-cols-4 gap-2">
              {['Alert', 'Voice', 'Pain', 'Unresp'].map((label, i) => (
                <button
                  key={i}
                  onClick={() => setMews({...mews, avpu: i})}
                  className={`p-2 rounded-xl border-2 text-[10px] font-black transition-all ${
                    mews.avpu === i ? 'border-orange-600 bg-orange-50 text-orange-900' : 'border-slate-100 bg-slate-50 text-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScoreCard>

      {/* SIRS Criteria */}
      <ScoreCard title="SIRS" subtitle="Inflammatory Response" icon={<Activity size={20} />} color="red">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Temp (°C)</label>
              <input 
                type="number" 
                value={sirs.temp} 
                onChange={e => setSirs({...sirs, temp: e.target.value === '' ? '' : Number(e.target.value)})}
                className={`w-full p-3 bg-slate-900/40 border-2 rounded-xl font-bold text-sm outline-none transition-all ${
                  sirs.temp !== '' && (sirs.temp < 30 || sirs.temp > 45) ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800 focus:border-red-400'
                }`}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">WBC (K/uL)</label>
              <input 
                type="number" 
                value={sirs.wbc} 
                onChange={e => setSirs({...sirs, wbc: e.target.value === '' ? '' : Number(e.target.value)})}
                className={`w-full p-3 bg-slate-900/40 border-2 rounded-xl font-bold text-sm outline-none transition-all ${
                  sirs.wbc !== '' && (sirs.wbc < 0 || sirs.wbc > 100) ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800 focus:border-red-400'
                }`}
              />
            </div>
          </div>
        </div>
      </ScoreCard>
    </div>
  );
};

export default CombinedCalculators;
