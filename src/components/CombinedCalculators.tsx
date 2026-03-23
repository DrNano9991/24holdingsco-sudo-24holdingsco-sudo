import React, { useEffect, useRef } from 'react';
import { GCSState, MEWSState, SIRSState, QSOFAState, PEWSState, AgeGroup, ExamState, SurgicalState } from '../types';
import { GCS_OPTIONS } from '../constants';
import ScoreCard from './ScoreCard';
import Tooltip from './Tooltip';
import { Brain, Activity, Zap, AlertTriangle, Baby, Info, User, Scissors, Thermometer, Droplets, Ruler, Calculator } from 'lucide-react';

import { ScoringEngine } from '../services/scoringEngine';
import { speechService } from '../services/speechService';
import { useTranslation } from '../contexts/TranslationContext';

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
  activeCalculator?: string;
}

const CombinedCalculators: React.FC<Props> = ({ 
  ageGroup, gcs, setGcs, mews, setMews, sirs, setSirs, qsofa, setQsofa, pews, setPews, surgery, setSurgery,
  activeCalculator 
}) => {
  const { t } = useTranslation();
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
    if (score >= 45) return { label: t('highRisk'), color: 'text-red-600' };
    if (score >= 26) return { label: t('intermediateRisk'), color: 'text-orange-600' };
    return { label: t('lowRisk'), color: 'text-emerald-600' };
  };

  const ariscatRisk = getAriscatRisk(ariscatScore);

  const isMewsCritical = ScoringEngine.calculateMEWS(mews) >= 5;
  const isPewsCritical = ScoringEngine.calculatePEWS(pews) >= 5;
  const isVitalsCritical = vitalsClass.hr.severity === 'Critical' || vitalsClass.rr.severity === 'Critical' || vitalsClass.sbp.severity === 'Critical';
  const isAnyCritical = (ageGroup === 'Adult' && (isMewsCritical || isVitalsCritical)) || (ageGroup !== 'Adult' && isPewsCritical);

  // --- CHANGE DETECTION NOTIFICATIONS ---
  const prevGcs = useRef(gcsTotal);
  const prevMews = useRef(ScoringEngine.calculateMEWS(mews));
  const prevPews = useRef(ScoringEngine.calculatePEWS(pews));
  const prevCritical = useRef(false);

  useEffect(() => {
    if (isAnyCritical && !prevCritical.current) {
      speechService.notifyChange(t('criticalAlert'), t('interventionRequired'));
      // Simple auditory beep using Web Audio API
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
      } catch (e) {
        console.error('Audio alert failed', e);
      }
    }
    prevCritical.current = isAnyCritical;
  }, [isAnyCritical, t]);

  useEffect(() => {
    if (gcsTotal !== prevGcs.current) {
      speechService.notifyChange(t('neurologicalStatus'), `${t('gcsScoreUpdated')} ${gcsTotal}.`);
      prevGcs.current = gcsTotal;
    }
  }, [gcsTotal, t]);

  useEffect(() => {
    const currentMews = ScoringEngine.calculateMEWS(mews);
    if (currentMews !== prevMews.current && ageGroup === 'Adult') {
      speechService.notifyChange(t('clinicalWarning'), `${t('mewsScoreChanged')} ${currentMews}.`);
      prevMews.current = currentMews;
    }
  }, [mews, ageGroup, t]);

  useEffect(() => {
    const currentPews = ScoringEngine.calculatePEWS(pews);
    if (currentPews !== prevPews.current && ageGroup !== 'Adult') {
      speechService.notifyChange(t('clinicalWarning'), `${t('pewsScoreChanged')} ${currentPews}.`);
      prevPews.current = currentPews;
    }
  }, [pews, ageGroup, t]);

  const translateStatus = (status: string) => {
    const key = status.toLowerCase() as any;
    try {
      return t(key);
    } catch {
      return status;
    }
  };

  const translateSeverity = (severity: string) => {
    const key = severity.toLowerCase() as any;
    try {
      return t(key);
    } catch {
      return severity;
    }
  };

  const renderActiveCalculator = () => {
    switch (activeCalculator) {
      case 'GCS':
        return (
          <div className="bg-white border-4 border-slate-800 p-6 shadow-[8px_8px_0px_0px_rgba(30,41,59,1)] transition-none animate-slide-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800">
                  <Brain className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 leading-none uppercase tracking-tight">GCS</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Glasgow Coma Scale</p>
                </div>
              </div>
              <div className="text-3xl font-black text-slate-800 leading-none tracking-tighter">{gcsTotal}</div>
            </div>
            
            <div className="space-y-4">
              {(['eye', 'verbal', 'motor'] as const).map((type) => (
                <div key={type}>
                  <div className="flex items-center gap-1 mb-2">
                    <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest">
                      {type === 'eye' ? t('eyeOpening') : type === 'verbal' ? t('verbalResponse') : t('motorResponse')}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-1 border-2 border-slate-200 p-1 bg-slate-100">
                    {GCS_OPTIONS[type].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleGcsChange(type, opt.value)}
                        className={`p-2 text-left border-2 transition-none ${
                          gcs[type] === opt.value 
                            ? 'bg-slate-800 text-white border-slate-800 z-10' 
                            : 'bg-white text-slate-400 border-transparent hover:border-slate-200'
                        }`}
                      >
                        <div className={`font-black text-[10px] uppercase ${gcs[type] === opt.value ? 'text-white' : 'text-slate-800'}`}>{t(opt.label.toLowerCase().replace(/\s+/g, '') as any)}</div>
                        <div className={`text-[9px] font-bold ${gcs[type] === opt.value ? 'text-slate-300' : 'text-slate-400'}`}>{t(opt.sub.toLowerCase().replace(/\s+/g, '').replace(/[(),]/g, '') as any)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'MEWS':
        return (
          <div className="bg-white border-4 border-slate-800 p-6 shadow-[8px_8px_0px_0px_rgba(30,41,59,1)] transition-none animate-slide-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800">
                  <Zap className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 leading-none uppercase tracking-tight">MEWS</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Modified Early Warning</p>
                </div>
              </div>
              <div className="text-3xl font-black text-slate-800 leading-none tracking-tighter">{ScoringEngine.calculateMEWS(mews)}</div>
            </div>

            <div className="space-y-4">
              {(isMewsCritical || isVitalsCritical) && (
                <div className="bg-red-600 text-white p-2 border-2 border-red-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle size={12} />
                  {t('criticalAlert')}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-[11px] font-black text-slate-600 uppercase block">{t('systolicBPLabel')}</label>
                    <span className={`text-[10px] font-bold ${getSeverityColor(vitalsClass.sbp.severity)}`}>{translateStatus(vitalsClass.sbp.status)}</span>
                  </div>
                  <input 
                    type="number" 
                    value={mews.sbp} 
                    onChange={e => setMews({...mews, sbp: Math.max(0, Math.min(300, Number(e.target.value)))})}
                    className={`w-full p-3 bg-slate-50 border-2 font-black text-sm outline-none transition-none ${
                      vitalsClass.sbp.severity === 'Critical' ? 'border-red-500' : vitalsClass.sbp.severity === 'Abnormal' ? 'border-orange-500' : 'border-slate-200 focus:border-slate-800'
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-[11px] font-black text-slate-600 uppercase block">{t('heartRateLabel')}</label>
                    <span className={`text-[10px] font-bold ${getSeverityColor(vitalsClass.hr.severity)}`}>{translateStatus(vitalsClass.hr.status)}</span>
                  </div>
                  <input 
                    type="number" 
                    value={mews.hr} 
                    onChange={e => setMews({...mews, hr: Math.max(0, Math.min(300, Number(e.target.value)))})}
                    className={`w-full p-3 bg-slate-50 border-2 font-black text-sm outline-none transition-none ${
                      vitalsClass.hr.severity === 'Critical' ? 'border-red-500' : vitalsClass.hr.severity === 'Abnormal' ? 'border-orange-500' : 'border-slate-200 focus:border-slate-800'
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-[11px] font-black text-slate-600 uppercase block">{t('respiratoryRateLabel')}</label>
                    <span className={`text-[10px] font-bold ${getSeverityColor(vitalsClass.rr.severity)}`}>{translateStatus(vitalsClass.rr.status)}</span>
                  </div>
                  <input 
                    type="number" 
                    value={mews.rr} 
                    onChange={e => setMews({...mews, rr: Math.max(0, Math.min(100, Number(e.target.value)))})}
                    className={`w-full p-3 bg-slate-50 border-2 font-black text-sm outline-none transition-none ${
                      vitalsClass.rr.severity === 'Critical' ? 'border-red-500' : vitalsClass.rr.severity === 'Abnormal' ? 'border-orange-500' : 'border-slate-200 focus:border-slate-800'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">{t('temperatureLabel')}</label>
                  <input 
                    type="number" 
                    value={mews.temp} 
                    onChange={e => setMews({...mews, temp: Number(e.target.value)})}
                    className={`w-full p-3 bg-slate-50 border-2 font-black text-sm outline-none transition-none ${
                      mews.temp < 35 || mews.temp > 39 ? 'border-orange-500' : 'border-slate-200 focus:border-slate-800'
                    }`}
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">{t('avpu')} Score</label>
                <div className="grid grid-cols-4 gap-1 border-2 border-slate-200 p-1 bg-slate-100">
                  {['Alert', 'Voice', 'Pain', 'Unresp'].map((label, i) => (
                    <button
                      key={i}
                      onClick={() => setMews({...mews, avpu: i})}
                      className={`p-2 border-2 text-[10px] font-black uppercase transition-none ${
                        mews.avpu === i 
                          ? 'bg-slate-800 text-white border-slate-800 z-10' 
                          : 'bg-white text-slate-400 border-transparent hover:border-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'SIRS':
        return (
          <div className="bg-white border-4 border-slate-800 p-6 shadow-[8px_8px_0px_0px_rgba(30,41,59,1)] transition-none animate-slide-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800">
                  <Activity className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 leading-none uppercase tracking-tight">SIRS</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t('inflammatoryResponse')}</p>
                </div>
              </div>
              <div className="text-3xl font-black text-slate-800 leading-none tracking-tighter">{ScoringEngine.calculateSIRS(sirs)}</div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">{t('temperatureLabel')}</label>
                  <input 
                    type="number" 
                    value={sirs.temp} 
                    onChange={e => setSirs({...sirs, temp: e.target.value === '' ? '' : Number(e.target.value)})}
                    className={`w-full p-3 bg-slate-50 border-2 font-black text-sm outline-none transition-none ${
                      sirs.temp !== '' && (sirs.temp < 30 || sirs.temp > 45) ? 'border-red-500' : 'border-slate-200 focus:border-slate-800'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">{t('wbcCountLabel')}</label>
                  <input 
                    type="number" 
                    value={sirs.wbc} 
                    onChange={e => setSirs({...sirs, wbc: e.target.value === '' ? '' : Number(e.target.value)})}
                    className={`w-full p-3 bg-slate-50 border-2 font-black text-sm outline-none transition-none ${
                      sirs.wbc !== '' && (sirs.wbc < 0 || sirs.wbc > 100) ? 'border-red-500' : 'border-slate-200 focus:border-slate-800'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 'qSOFA':
        return (
          <div className="bg-white border-4 border-slate-800 p-6 shadow-[8px_8px_0px_0px_rgba(30,41,59,1)] transition-none animate-slide-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800">
                  <Zap className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 leading-none uppercase tracking-tight">qSOFA</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t('quickSepsisOrganFailure')}</p>
                </div>
              </div>
              <div className="text-3xl font-black text-slate-800 leading-none tracking-tighter">{ScoringEngine.calculateQSOFA(qsofa)}</div>
            </div>
            <div className="space-y-2">
              {[
                { label: 'SBP ≤ 100 mmHg', key: 'lowBP' },
                { label: 'Resp Rate ≥ 22/min', key: 'highRR' },
                { label: t('alteredMentation'), key: 'alteredMentation' }
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 bg-slate-50 border-2 border-slate-200">
                  <span className="font-black text-slate-800 text-[11px] uppercase tracking-tight">{item.label}</span>
                  <div className="flex gap-1">
                    {[false, true].map((val) => (
                      <button
                        key={val ? 'yes' : 'no'}
                        onClick={() => setQsofa({...qsofa, [item.key]: val})}
                        className={`px-3 py-1 border-2 text-[10px] font-black uppercase transition-none ${
                          qsofa[item.key as keyof QSOFAState] === val
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'bg-white text-slate-400 border-transparent hover:border-slate-200'
                        }`}
                      >
                        {val ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'PEWS':
        return (
          <div className="bg-white border-4 border-slate-800 p-6 shadow-[8px_8px_0px_0px_rgba(30,41,59,1)] transition-none animate-slide-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800">
                  <Baby className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 leading-none uppercase tracking-tight">PEWS</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t('pediatricEarlyWarning')}</p>
                </div>
              </div>
              <div className="text-3xl font-black text-slate-800 leading-none tracking-tighter">{ScoringEngine.calculatePEWS(pews)}</div>
            </div>
            <div className="space-y-4">
              {isPewsCritical && (
                <div className="bg-red-600 text-white p-2 border-2 border-red-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle size={12} />
                  {t('criticalAlert')}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4">
                {(['behavior', 'cardiovascular', 'respiratory'] as const).map((type) => (
                  <div key={type}>
                    <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">{t(type as any)} (0-3)</label>
                    <div className="flex gap-1 border-2 border-slate-200 p-1 bg-slate-100">
                      {[0, 1, 2, 3].map((val) => (
                        <button
                          key={val}
                          onClick={() => setPews({...pews, [type]: val})}
                          className={`flex-1 p-2 border-2 text-xs font-black transition-none ${
                            pews[type] === val 
                              ? 'bg-slate-800 text-white border-slate-800 z-10' 
                              : 'bg-white text-slate-400 border-transparent hover:border-slate-200'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: t('nebulizer'), key: 'nebulizer' },
                  { label: t('vomiting'), key: 'persistentVomiting' }
                ].map((item) => (
                  <div key={item.key} className="p-3 bg-slate-50 border-2 border-slate-200">
                    <span className="text-[10px] font-black text-slate-600 uppercase block mb-2">{item.label}</span>
                    <div className="flex gap-1">
                      {[false, true].map((val) => (
                        <button
                          key={val ? 'yes' : 'no'}
                          onClick={() => setPews({...pews, [item.key as keyof PEWSState]: val})}
                          className={`flex-1 py-1 border-2 text-[10px] font-black uppercase transition-none ${
                            pews[item.key as keyof PEWSState] === val
                              ? 'bg-slate-800 text-white border-slate-800'
                              : 'bg-white text-slate-400 border-transparent hover:border-slate-200'
                          }`}
                        >
                          {val ? 'Yes' : 'No'}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'Surgical':
        return (
          <div className="bg-white border-4 border-slate-800 p-6 shadow-[8px_8px_0px_0px_rgba(30,41,59,1)] transition-none animate-slide-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800">
                  <Scissors className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 leading-none uppercase tracking-tight">{t('surgicalRisk')}</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">ARISCAT Score</p>
                </div>
              </div>
              <div className="text-3xl font-black text-slate-800 leading-none tracking-tighter">{ariscatScore}</div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-2 border-slate-800">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t('riskLevel')}</span>
                <span className={`text-xs font-black uppercase text-white`}>{ariscatRisk.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">ASA Status</label>
                  <select 
                    value={surgery.asa} 
                    onChange={e => setSurgery({...surgery, asa: Number(e.target.value)})}
                    className="w-full p-2 bg-slate-50 border-2 border-slate-200 font-black text-sm outline-none focus:border-slate-800 transition-none"
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
                    className="w-full p-2 bg-slate-50 border-2 border-slate-200 font-black text-sm outline-none focus:border-slate-800 transition-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">{t('surgicalSite')}</label>
                <select 
                  value={surgery.surgeryType} 
                  onChange={e => setSurgery({...surgery, surgeryType: e.target.value})}
                  className="w-full p-2 bg-slate-50 border-2 border-slate-200 font-black text-sm outline-none focus:border-slate-800 transition-none"
                >
                  <option value="Peripheral">{t('peripheral')}</option>
                  <option value="Upper Abdominal">{t('upperAbdominal')}</option>
                  <option value="Intrathoracic">{t('intrathoracic')}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: t('respiratoryInfection'), key: 'respInfection' },
                  { label: t('anemia'), key: 'preOpAnemia' }
                ].map((item) => (
                  <div key={item.key} className="p-3 bg-slate-50 border-2 border-slate-200">
                    <span className="text-[10px] font-black text-slate-600 uppercase block mb-2">{item.label}</span>
                    <div className="flex gap-1">
                      {[false, true].map((val) => (
                        <button
                          key={val ? 'yes' : 'no'}
                          onClick={() => setSurgery({...surgery, [item.key as keyof SurgicalState]: val})}
                          className={`flex-1 py-1 border-2 text-[10px] font-black uppercase transition-none ${
                            surgery[item.key as keyof SurgicalState] === val
                              ? 'bg-slate-800 text-white border-slate-800'
                              : 'bg-white text-slate-400 border-transparent hover:border-slate-200'
                          }`}
                        >
                          {val ? 'Yes' : 'No'}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">{t('duration')}</label>
                <div className="grid grid-cols-3 gap-1 border-2 border-slate-200 p-1 bg-slate-100">
                  {['<2h', '2-3h', '>3h'].map(d => (
                    <button 
                      key={d} 
                      onClick={() => setSurgery({...surgery, duration: d})}
                      className={`p-2 border-2 text-[10px] font-black uppercase transition-none ${surgery.duration === d ? 'bg-slate-800 text-white border-slate-800 z-10' : 'bg-white text-slate-400 border-transparent hover:border-slate-200'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'Anthro':
        return (
          <div className="bg-white border-4 border-slate-800 p-6 shadow-[8px_8px_0px_0px_rgba(30,41,59,1)] transition-none animate-slide-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800">
                  <Ruler className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 leading-none uppercase tracking-tight">{t('anthropometrics')}</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">BMI & WHR</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-2 border-slate-200 text-center">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">{t('usePhysicalExamTab')}</p>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white border-4 border-slate-800 p-12 text-center shadow-[8px_8px_0px_0px_rgba(30,41,59,1)]">
            <Calculator size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-widest">Select a calculator above to begin</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {isAnyCritical && (
        <div className="bg-red-600 text-white p-4 border border-red-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold uppercase tracking-tighter leading-none text-white">{t('criticalAlert')}</h3>
              <p className="text-[10px] font-bold opacity-90 uppercase tracking-widest mt-1">{t('interventionRequired')}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold leading-none">
              {ageGroup === 'Adult' ? `MEWS: ${ScoringEngine.calculateMEWS(mews)}` : `PEWS: ${ScoringEngine.calculatePEWS(pews)}`}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        {renderActiveCalculator()}
      </div>
    </div>
  );
};

export default CombinedCalculators;
