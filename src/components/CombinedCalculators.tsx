import React, { useEffect, useRef } from 'react';
import { GCSState, MEWSState, SIRSState, QSOFAState, PEWSState, AgeGroup, ExamState, SurgicalState } from '../types';
import { GCS_OPTIONS } from '../constants';
import ScoreCard from './ScoreCard';
import Tooltip from './Tooltip';
import { Brain, Activity, Zap, AlertTriangle, Baby, Info, User, Scissors, Thermometer, Droplets } from 'lucide-react';

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
}

const CombinedCalculators: React.FC<Props> = ({ 
  ageGroup, gcs, setGcs, mews, setMews, sirs, setSirs, qsofa, setQsofa, pews, setPews, surgery, setSurgery 
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* GCS Calculator */}
      <ScoreCard title="GCS" subtitle="Glasgow Coma Scale" icon={<Brain size={20} />} score={gcsTotal} color="indigo">
        <div className="space-y-4">
          {(['eye', 'verbal', 'motor'] as const).map((type) => (
            <div key={type}>
              <div className="flex items-center gap-1 mb-2">
                <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest">
                  {type === 'eye' ? t('eyeOpening') : type === 'verbal' ? t('verbalResponse') : t('motorResponse')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-0 border border-border">
                {GCS_OPTIONS[type].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleGcsChange(type, opt.value)}
                    className={`p-2 text-left border-r border-b border-border last:border-r-0 transition-all ${
                      gcs[type] === opt.value 
                        ? 'active z-10' 
                        : 'bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-xs">{t(opt.label.toLowerCase().replace(/\s+/g, '') as any)}</div>
                    <div className="text-[10px] opacity-70 font-medium">{t(opt.sub.toLowerCase().replace(/\s+/g, '').replace(/[(),]/g, '') as any)}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScoreCard>

      {/* MEWS Calculator */}
      <ScoreCard 
        title="MEWS" 
        subtitle="Modified Early Warning" 
        icon={<Zap size={20} />} 
        score={ScoringEngine.calculateMEWS(mews)} 
        color={isMewsCritical || isVitalsCritical ? "red" : "orange"}
      >
        <div className="space-y-4">
          {(isMewsCritical || isVitalsCritical) && (
            <div className="bg-red-50 text-red-600 p-1.5 border border-red-200 text-[9px] font-bold uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle size={10} />
              {t('criticalAlert')}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="text-[11px] font-black text-slate-600 uppercase block">{t('systolicBPLabel')} (mmHg)</label>
                <span className={`text-[10px] font-bold ${getSeverityColor(vitalsClass.sbp.severity)}`}>{translateStatus(vitalsClass.sbp.status)}</span>
              </div>
              <input 
                type="number" 
                value={mews.sbp} 
                onChange={e => setMews({...mews, sbp: Math.max(0, Math.min(300, Number(e.target.value)))})}
                className={`w-full p-2 bg-white border font-bold text-sm outline-none ${
                  vitalsClass.sbp.severity === 'Critical' ? 'border-red-500' : vitalsClass.sbp.severity === 'Abnormal' ? 'border-orange-500' : 'border-border focus:border-primary'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="text-[11px] font-black text-slate-600 uppercase block">{t('heartRateLabel')} (bpm)</label>
                <span className={`text-[10px] font-bold ${getSeverityColor(vitalsClass.hr.severity)}`}>{translateStatus(vitalsClass.hr.status)}</span>
              </div>
              <input 
                type="number" 
                value={mews.hr} 
                onChange={e => setMews({...mews, hr: Math.max(0, Math.min(300, Number(e.target.value)))})}
                className={`w-full p-2 bg-white border font-bold text-sm outline-none ${
                  vitalsClass.hr.severity === 'Critical' ? 'border-red-500' : vitalsClass.hr.severity === 'Abnormal' ? 'border-orange-500' : 'border-border focus:border-primary'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="text-[11px] font-black text-slate-600 uppercase block">{t('respiratoryRateLabel')} (/min)</label>
                <span className={`text-[10px] font-bold ${getSeverityColor(vitalsClass.rr.severity)}`}>{translateStatus(vitalsClass.rr.status)}</span>
              </div>
              <input 
                type="number" 
                value={mews.rr} 
                onChange={e => setMews({...mews, rr: Math.max(0, Math.min(100, Number(e.target.value)))})}
                className={`w-full p-2 bg-white border font-bold text-sm outline-none ${
                  vitalsClass.rr.severity === 'Critical' ? 'border-red-500' : vitalsClass.rr.severity === 'Abnormal' ? 'border-orange-500' : 'border-border focus:border-primary'
                }`}
              />
            </div>
            <div>
              <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">{t('temperatureLabel')} (°C)</label>
              <input 
                type="number" 
                value={mews.temp} 
                onChange={e => setMews({...mews, temp: Number(e.target.value)})}
                className={`w-full p-2 bg-white border font-bold text-sm outline-none ${
                  mews.temp < 35 || mews.temp > 39 ? 'border-orange-500' : 'border-border focus:border-primary'
                }`}
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">{t('avpu')} Score</label>
            <div className="grid grid-cols-4 gap-0 border border-border">
              {['Alert', 'Voice', 'Pain', 'Unresp'].map((label, i) => (
                <button
                  key={i}
                  onClick={() => setMews({...mews, avpu: i})}
                  className={`p-2 border-r border-border last:border-r-0 text-[11px] font-bold transition-all ${
                    mews.avpu === i 
                      ? 'active z-10' 
                      : 'bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-50'
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
      <ScoreCard title="SIRS" subtitle={t('inflammatoryResponse')} icon={<Activity size={20} />} color="red">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">{t('temperatureLabel')} (°C)</label>
              <input 
                type="number" 
                value={sirs.temp} 
                onChange={e => setSirs({...sirs, temp: e.target.value === '' ? '' : Number(e.target.value)})}
                className={`w-full p-2 bg-white border font-bold text-sm outline-none transition-none ${
                  sirs.temp !== '' && (sirs.temp < 30 || sirs.temp > 45) ? 'border-red-500' : 'border-border focus:border-red-400'
                }`}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">{t('wbcCountLabel')} (K/uL)</label>
              <input 
                type="number" 
                value={sirs.wbc} 
                onChange={e => setSirs({...sirs, wbc: e.target.value === '' ? '' : Number(e.target.value)})}
                className={`w-full p-2 bg-white border font-bold text-sm outline-none transition-none ${
                  sirs.wbc !== '' && (sirs.wbc < 0 || sirs.wbc > 100) ? 'border-red-500' : 'border-border focus:border-red-400'
                }`}
              />
            </div>
          </div>
        </div>
      </ScoreCard>

      {/* qSOFA Calculator */}
      <ScoreCard title="qSOFA" subtitle={t('quickSepsisOrganFailure')} icon={<Zap size={20}/>} score={ScoringEngine.calculateQSOFA(qsofa)} color="amber">
        <div className="space-y-1">
          <div className="flex items-center justify-between p-2 bg-white border border-border">
            <span className="font-bold text-slate-700 text-xs">SBP ≤ 100 mmHg</span>
            <select 
              value={qsofa.lowBP ? 'yes' : 'no'} 
              onChange={e => setQsofa({...qsofa, lowBP: e.target.value === 'yes'})}
              className="p-1 bg-white border border-border font-bold text-xs outline-none focus:border-amber-600"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div className="flex items-center justify-between p-2 bg-white border border-border">
            <span className="font-bold text-slate-700 text-xs">Resp Rate ≥ 22/min</span>
            <select 
              value={qsofa.highRR ? 'yes' : 'no'} 
              onChange={e => setQsofa({...qsofa, highRR: e.target.value === 'yes'})}
              className="p-1 bg-white border border-border font-bold text-xs outline-none focus:border-amber-600"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div className="flex items-center justify-between p-2 bg-white border border-border">
            <span className="font-bold text-slate-700 text-xs">{t('alteredMentation')}</span>
            <select 
              value={qsofa.alteredMentation ? 'yes' : 'no'} 
              onChange={e => setQsofa({...qsofa, alteredMentation: e.target.value === 'yes'})}
              className="p-1 bg-white border border-border font-bold text-xs outline-none focus:border-amber-600"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
        </div>
      </ScoreCard>

      {/* PEWS Calculator */}
      <ScoreCard 
        title="PEWS" 
        subtitle={t('pediatricEarlyWarning')} 
        icon={<Baby size={20} />} 
        score={ScoringEngine.calculatePEWS(pews)} 
        color={isPewsCritical ? "red" : "pink"}
      >
        <div className="space-y-4">
          {isPewsCritical && (
            <div className="bg-red-50 text-red-600 p-1.5 border border-red-200 text-[9px] font-bold uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle size={10} />
              {t('criticalAlert')}
            </div>
          )}
          <div className="grid grid-cols-1 gap-2">
            {(['behavior', 'cardiovascular', 'respiratory'] as const).map((type) => (
              <div key={type}>
                <label className="text-[11px] font-black text-slate-600 uppercase block mb-1">{t(type as any)} (0-3)</label>
                <div className="flex gap-0 border border-border">
                  {[0, 1, 2, 3].map((val) => (
                    <button
                      key={val}
                      onClick={() => setPews({...pews, [type]: val})}
                      className={`flex-1 p-2 border-r border-border last:border-r-0 text-xs font-bold transition-all ${
                        pews[type] === val 
                          ? 'active z-10' 
                          : 'bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-0 border border-border">
            <div className="flex-1 flex items-center justify-between p-2 bg-white border-r border-border">
              <span className="text-[11px] font-bold text-slate-600">{t('nebulizer')}</span>
              <select 
                value={pews.nebulizer ? 'yes' : 'no'} 
                onChange={e => setPews({...pews, nebulizer: e.target.value === 'yes'})}
                className="p-1 bg-white border border-border font-bold text-[10px] outline-none focus:border-primary"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div className="flex-1 flex items-center justify-between p-2 bg-white">
              <span className="text-[11px] font-bold text-slate-600">{t('vomiting')}</span>
              <select 
                value={pews.persistentVomiting ? 'yes' : 'no'} 
                onChange={e => setPews({...pews, persistentVomiting: e.target.value === 'yes'})}
                className="p-1 bg-white border border-border font-bold text-[10px] outline-none focus:border-primary"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
          </div>
        </div>
      </ScoreCard>

      {/* Surgical Risk Calculator */}
      <ScoreCard title={t('surgicalRisk')} subtitle="ARISCAT Score" icon={<Scissors size={20} />} score={ariscatScore} color="emerald">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-3 py-2 bg-white border border-border">
            <span className="text-[11px] font-bold text-slate-500 uppercase">{t('riskLevel')}</span>
            <span className={`text-xs font-bold uppercase ${ariscatRisk.color}`}>{ariscatRisk.label}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">ASA Physical Status</label>
              <select 
                value={surgery.asa} 
                onChange={e => setSurgery({...surgery, asa: Number(e.target.value)})}
                className="w-full p-2 bg-white border border-border font-bold text-sm outline-none focus:border-primary"
              >
                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>ASA {v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Pre-op SpO2 (%)</label>
              <input 
                type="number" 
                value={surgery.preOpSpO2} 
                onChange={e => setSurgery({...surgery, preOpSpO2: e.target.value === '' ? '' : Number(e.target.value)})}
                className="w-full p-2 bg-white border border-border font-bold text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">{t('surgicalSite')}</label>
            <select 
              value={surgery.surgeryType} 
              onChange={e => setSurgery({...surgery, surgeryType: e.target.value})}
              className="w-full p-2 bg-white border border-border font-bold text-sm outline-none focus:border-primary"
            >
              <option value="Peripheral">{t('peripheral')}</option>
              <option value="Upper Abdominal">{t('upperAbdominal')}</option>
              <option value="Intrathoracic">{t('intrathoracic')}</option>
            </select>
          </div>
          <div className="flex gap-0 border border-border">
            <div className="flex-1 flex items-center justify-between p-2 bg-white border-r border-border">
              <span className="text-[11px] font-bold text-slate-600">{t('respiratoryInfection')}</span>
              <select 
                value={surgery.respInfection ? 'yes' : 'no'} 
                onChange={e => setSurgery({...surgery, respInfection: e.target.value === 'yes'})}
                className="p-1 bg-white border border-border font-bold text-[10px] outline-none focus:border-primary"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div className="flex-1 flex items-center justify-between p-2 bg-white">
              <span className="text-[11px] font-bold text-slate-600">{t('anemia')}</span>
              <select 
                value={surgery.preOpAnemia ? 'yes' : 'no'} 
                onChange={e => setSurgery({...surgery, preOpAnemia: e.target.value === 'yes'})}
                className="p-1 bg-white border border-border font-bold text-[10px] outline-none focus:border-primary"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">{t('duration')}</label>
            <div className="grid grid-cols-3 gap-0 border border-border">
              {['<2h', '2-3h', '>3h'].map(d => (
                <button 
                  key={d} 
                  onClick={() => setSurgery({...surgery, duration: d})}
                  className={`p-2 border-r border-border last:border-r-0 text-[11px] font-bold transition-all ${surgery.duration === d ? 'active z-10' : 'bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-50'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScoreCard>
      </div>
    </div>
  );
};

export default CombinedCalculators;
