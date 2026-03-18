import React from 'react';
import { GCSState, MEWSState, SIRSState, QSOFAState, PEWSState, AgeGroup, ExamState, SurgicalState } from '../types';
import { GCS_OPTIONS } from '../constants';
import ScoreCard from './ScoreCard';
import Tooltip from './Tooltip';
import { Brain, Activity, Zap, AlertTriangle, Baby, Info, User, Scissors, Thermometer, Droplets } from 'lucide-react';

import { ScoringEngine } from '../services/scoringEngine';

interface Props {
  ageGroup: AgeGroup;
  gcs: GCSState;
  setGcs: (val: GCSState) => void;
  mews: MEWSState;
  setMews: (val: MEWSState) => void;
  sirs: SIRSState;
  setSirs: (val: SIRSState) => void;
  qsofa: QSOFAState;
  setQsofa: (val: QSOFAState) => void;
  pews: PEWSState;
  setPews: (val: PEWSState) => void;
  surgery: SurgicalState;
  setSurgery: (val: SurgicalState) => void;
}

const CombinedCalculators: React.FC<Props> = ({ 
  ageGroup, gcs, setGcs, mews, setMews, sirs, setSirs, qsofa, setQsofa, pews, setPews, surgery, setSurgery 
}) => {
  const gcsTotal = ScoringEngine.calculateGCS(gcs);
  const vitalsClass = ScoringEngine.classifyVitals(ageGroup, mews.hr, mews.rr, mews.sbp);
  const ariscatScore = ScoringEngine.calculateARISCAT(surgery);

  const handleGcsChange = (key: keyof GCSState, val: number) => {
    setGcs({ ...gcs, [key]: val });
  };

  const getSeverityColor = (severity: string) => {
    if (severity === 'Critical') return 'text-red-500';
    if (severity === 'Abnormal') return 'text-orange-500';
    return 'text-emerald-500';
  };

  const getAriscatRisk = (score: number) => {
    if (score >= 45) return { label: 'High Risk', color: 'text-red-600' };
    if (score >= 26) return { label: 'Intermediate Risk', color: 'text-orange-600' };
    return { label: 'Low Risk', color: 'text-emerald-600' };
  };

  const ariscatRisk = getAriscatRisk(ariscatScore);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* GCS Calculator */}
      <ScoreCard title="GCS" subtitle="Glasgow Coma Scale" icon={<Brain size={20} />} score={gcsTotal} color="indigo">
        <div className="space-y-4">
          {(['eye', 'verbal', 'motor'] as const).map((type) => (
            <div key={type}>
              <div className="flex items-center gap-1 mb-2">
                <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest">{type} Response</p>
                <Tooltip text={`Assess the patient's ${type} response to stimuli.`}>
                  <Info size={10} className="text-slate-600" />
                </Tooltip>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {GCS_OPTIONS[type].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleGcsChange(type, opt.value)}
                    className={`p-2 text-left rounded-xl border-2 transition-all ${
                      gcs[type] === opt.value 
                        ? 'border-indigo-600 bg-indigo-600/20 text-indigo-900 dark:text-indigo-100 shadow-lg shadow-indigo-600/20' 
                        : 'border-slate-200 bg-white dark:bg-slate-800 text-slate-600 hover:border-indigo-200'
                    }`}
                  >
                    <div className="font-bold text-xs">{opt.label}</div>
                    <div className="text-[10px] opacity-70 font-medium">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScoreCard>

      {/* MEWS Calculator */}
      <ScoreCard title="MEWS" subtitle="Modified Early Warning" icon={<Zap size={20} />} score={ScoringEngine.calculateMEWS(mews)} color="orange">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="text-[11px] font-black text-slate-600 uppercase block">SBP (mmHg)</label>
                <span className={`text-[10px] font-bold ${getSeverityColor(vitalsClass.sbp.severity)}`}>{vitalsClass.sbp.status}</span>
              </div>
              <input 
                type="number" 
                value={mews.sbp} 
                onChange={e => setMews({...mews, sbp: Math.max(0, Math.min(300, Number(e.target.value)))})}
                className={`w-full p-3 bg-white border-2 rounded-xl font-bold text-sm outline-none transition-all ${
                  vitalsClass.sbp.severity === 'Critical' ? 'border-red-500' : vitalsClass.sbp.severity === 'Abnormal' ? 'border-orange-500' : 'border-slate-200 focus:border-orange-400'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="text-[11px] font-black text-slate-600 uppercase block">HR (bpm)</label>
                <span className={`text-[10px] font-bold ${getSeverityColor(vitalsClass.hr.severity)}`}>{vitalsClass.hr.status}</span>
              </div>
              <input 
                type="number" 
                value={mews.hr} 
                onChange={e => setMews({...mews, hr: Math.max(0, Math.min(300, Number(e.target.value)))})}
                className={`w-full p-3 bg-white border-2 rounded-xl font-bold text-sm outline-none transition-all ${
                  vitalsClass.hr.severity === 'Critical' ? 'border-red-500' : vitalsClass.hr.severity === 'Abnormal' ? 'border-orange-500' : 'border-slate-200 focus:border-orange-400'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="text-[11px] font-black text-slate-600 uppercase block">RR (/min)</label>
                <span className={`text-[10px] font-bold ${getSeverityColor(vitalsClass.rr.severity)}`}>{vitalsClass.rr.status}</span>
              </div>
              <input 
                type="number" 
                value={mews.rr} 
                onChange={e => setMews({...mews, rr: Math.max(0, Math.min(100, Number(e.target.value)))})}
                className={`w-full p-3 bg-white border-2 rounded-xl font-bold text-sm outline-none transition-all ${
                  vitalsClass.rr.severity === 'Critical' ? 'border-red-500' : vitalsClass.rr.severity === 'Abnormal' ? 'border-orange-500' : 'border-slate-200 focus:border-orange-400'
                }`}
              />
            </div>
            <div>
              <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">Temp (°C)</label>
              <input 
                type="number" 
                value={mews.temp} 
                onChange={e => setMews({...mews, temp: Number(e.target.value)})}
                className={`w-full p-3 bg-white border-2 rounded-xl font-bold text-sm outline-none transition-all ${
                  mews.temp < 35 || mews.temp > 39 ? 'border-orange-500' : 'border-slate-200 focus:border-orange-400'
                }`}
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">AVPU Score</label>
            <div className="grid grid-cols-4 gap-2">
              {['Alert', 'Voice', 'Pain', 'Unresp'].map((label, i) => (
                <button
                  key={i}
                  onClick={() => setMews({...mews, avpu: i})}
                  className={`p-2 rounded-xl border-2 text-[11px] font-black transition-all ${
                    mews.avpu === i 
                      ? 'border-orange-600 bg-orange-600/20 text-orange-900 dark:text-orange-100 shadow-lg shadow-orange-600/20' 
                      : 'border-slate-200 bg-white dark:bg-slate-800 text-slate-600'
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
              <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">Temp (°C)</label>
              <input 
                type="number" 
                value={sirs.temp} 
                onChange={e => setSirs({...sirs, temp: e.target.value === '' ? '' : Number(e.target.value)})}
                className={`w-full p-3 bg-white border-2 rounded-xl font-bold text-sm outline-none transition-all ${
                  sirs.temp !== '' && (sirs.temp < 30 || sirs.temp > 45) ? 'border-red-500/50 focus:border-red-500' : 'border-slate-200 focus:border-red-400'
                }`}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">WBC (K/uL)</label>
              <input 
                type="number" 
                value={sirs.wbc} 
                onChange={e => setSirs({...sirs, wbc: e.target.value === '' ? '' : Number(e.target.value)})}
                className={`w-full p-3 bg-white border-2 rounded-xl font-bold text-sm outline-none transition-all ${
                  sirs.wbc !== '' && (sirs.wbc < 0 || sirs.wbc > 100) ? 'border-red-500/50 focus:border-red-500' : 'border-slate-200 focus:border-red-400'
                }`}
              />
            </div>
          </div>
        </div>
      </ScoreCard>

      {/* qSOFA Calculator */}
      <ScoreCard title="qSOFA" subtitle="Quick Sepsis Organ Failure" icon={<Zap size={20}/>} score={ScoringEngine.calculateQSOFA(qsofa)} color="amber">
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all border border-slate-200">
            <span className="font-bold text-slate-700 text-sm">SBP ≤ 100 mmHg</span>
            <input type="checkbox" checked={qsofa.lowBP} onChange={e => setQsofa({...qsofa, lowBP: e.target.checked})} className="h-5 w-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 bg-white" />
          </label>
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all border border-slate-200">
            <span className="font-bold text-slate-700 text-sm">Resp Rate ≥ 22/min</span>
            <input type="checkbox" checked={qsofa.highRR} onChange={e => setQsofa({...qsofa, highRR: e.target.checked})} className="h-5 w-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 bg-white" />
          </label>
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all border border-slate-200">
            <span className="font-bold text-slate-700 text-sm">Altered Mentation</span>
            <input type="checkbox" checked={qsofa.alteredMentation} onChange={e => setQsofa({...qsofa, alteredMentation: e.target.checked})} className="h-5 w-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 bg-white" />
          </label>
        </div>
      </ScoreCard>

      {/* PEWS Calculator */}
      <ScoreCard title="PEWS" subtitle="Pediatric Early Warning" icon={<Baby size={20} />} score={ScoringEngine.calculatePEWS(pews)} color="pink">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            {(['behavior', 'cardiovascular', 'respiratory'] as const).map((type) => (
              <div key={type}>
                <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">{type} (0-3)</label>
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((val) => (
                    <button
                      key={val}
                      onClick={() => setPews({...pews, [type]: val})}
                      className={`flex-1 p-2 rounded-lg border-2 text-xs font-bold transition-all ${
                        pews[type] === val 
                          ? 'border-pink-600 bg-pink-600/20 text-pink-900 dark:text-pink-100 shadow-lg shadow-pink-600/20' 
                          : 'border-slate-200 bg-white dark:bg-slate-800 text-slate-600'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <label className="flex-1 flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-all">
              <span className="text-[11px] font-bold text-slate-600">Nebulizer</span>
              <input type="checkbox" checked={pews.nebulizer} onChange={e => setPews({...pews, nebulizer: e.target.checked})} className="h-4 w-4 text-pink-600 bg-white border-slate-300" />
            </label>
            <label className="flex-1 flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-all">
              <span className="text-[11px] font-bold text-slate-600">Vomiting</span>
              <input type="checkbox" checked={pews.persistentVomiting} onChange={e => setPews({...pews, persistentVomiting: e.target.checked})} className="h-4 w-4 text-pink-600 bg-white border-slate-300" />
            </label>
          </div>
        </div>
      </ScoreCard>

      {/* Surgical Risk Calculator */}
      <ScoreCard title="Surgical Risk" subtitle="ARISCAT Score" icon={<Scissors size={20} />} score={ariscatScore} color="emerald">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] font-black text-slate-600 uppercase">Risk Level</span>
            <span className={`text-xs font-black uppercase ${ariscatRisk.color}`}>{ariscatRisk.label}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">ASA Physical Status</label>
              <select 
                value={surgery.asa} 
                onChange={e => setSurgery({...surgery, asa: Number(e.target.value)})}
                className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-400 transition-all"
              >
                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>ASA {v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">Pre-op SpO2 (%)</label>
              <input 
                type="number" 
                value={surgery.preOpSpO2} 
                onChange={e => setSurgery({...surgery, preOpSpO2: e.target.value === '' ? '' : Number(e.target.value)})}
                className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-400 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">Surgical Incision Type</label>
            <select 
              value={surgery.surgeryType} 
              onChange={e => setSurgery({...surgery, surgeryType: e.target.value})}
              className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-400 transition-all"
            >
              <option value="Peripheral">Peripheral</option>
              <option value="Upper Abdominal">Upper Abdominal</option>
              <option value="Intrathoracic">Intrathoracic</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-all">
              <span className="text-[11px] font-bold text-slate-600">Resp Infection (1mo)</span>
              <input type="checkbox" checked={surgery.respInfection} onChange={e => setSurgery({...surgery, respInfection: e.target.checked})} className="h-4 w-4 text-emerald-600 bg-white border-slate-300 rounded" />
            </label>
            <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-all">
              <span className="text-[11px] font-bold text-slate-600">Pre-op Anemia</span>
              <input type="checkbox" checked={surgery.preOpAnemia} onChange={e => setSurgery({...surgery, preOpAnemia: e.target.checked})} className="h-4 w-4 text-emerald-600 bg-white border-slate-300 rounded" />
            </label>
          </div>
          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">Surgery Duration</label>
            <div className="grid grid-cols-3 gap-2">
              {['<2h', '2-3h', '>3h'].map(d => (
                <button 
                  key={d} 
                  onClick={() => setSurgery({...surgery, duration: d})}
                  className={`p-2 rounded-xl border-2 text-[11px] font-black transition-all ${surgery.duration === d ? 'border-emerald-600 bg-emerald-600/20 text-emerald-900 dark:text-emerald-100 shadow-lg shadow-emerald-600/20' : 'border-slate-200 bg-white dark:bg-slate-800 text-slate-600'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScoreCard>
    </div>
  );
};

export default CombinedCalculators;
