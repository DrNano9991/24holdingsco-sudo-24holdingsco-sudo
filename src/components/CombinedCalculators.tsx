import React, { useEffect, useRef } from 'react';
import { GCSState, MEWSState, SIRSState, QSOFAState, PEWSState, AgeGroup, ExamState, SurgicalState, PHQ9State, GAD7State, AMTSState } from '../types';
import { GCS_OPTIONS } from '../constants';
import ScoreCard from './ScoreCard';
import Tooltip from './Tooltip';
import { Brain, Activity, Zap, AlertTriangle, Baby, Info, User, Scissors, Thermometer, Droplets, Ruler, Calculator, Stethoscope, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  phq9: PHQ9State;
  setPhq9: (val: PHQ9State) => void;
  gad7: GAD7State;
  setGad7: (val: GAD7State) => void;
  amts: AMTSState;
  setAmts: (val: AMTSState) => void;
  surgery: SurgicalState;
  setSurgery: (val: SurgicalState) => void;
  activeCalculator?: string;
}

const CombinedCalculators: React.FC<Props> = ({ 
  ageGroup, gcs, setGcs, mews, setMews, sirs, setSirs, qsofa, setQsofa, pews, setPews, 
  phq9, setPhq9, gad7, setGad7, amts, setAmts,
  surgery, setSurgery,
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

  const getGcsSeverity = (score: number) => {
    if (score <= 8) return { label: t('severe'), color: 'text-destructive', bg: 'bg-destructive/10' };
    if (score <= 12) return { label: t('moderate'), color: 'text-warning', bg: 'bg-warning/10' };
    return { label: t('mild'), color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
  };

  const renderActiveCalculator = () => {
    switch (activeCalculator) {
      case 'GCS': {
        const severity = getGcsSeverity(gcsTotal);
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card p-8 rounded-3xl border border-border shadow-sm overflow-hidden relative"
          >
            {/* Background Accent */}
            <div className={`absolute top-0 right-0 w-32 h-32 ${severity.bg} blur-3xl -mr-16 -mt-16 rounded-full transition-colors duration-500`} />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-2xl shadow-inner">
                  <Brain className="text-primary" size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground tracking-tight">GCS</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Glasgow Coma Scale</p>
                </div>
              </div>

              <div className="flex items-center gap-6 bg-muted/30 p-4 rounded-2xl border border-border/50">
                <div className="relative w-16 h-16">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-muted/20"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={`${(gcsTotal / 15) * 100}, 100`}
                      className={`transition-all duration-500 ${severity.color}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold tracking-tighter">{gcsTotal}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${severity.color}`}>
                    {severity.label}
                  </div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Total Score
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
              {(['eye', 'verbal', 'motor'] as const).map((type) => (
                <div key={type} className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                      <p className="text-[10px] font-bold text-foreground uppercase tracking-[0.15em]">
                        {type === 'eye' ? t('eyeOpening') : type === 'verbal' ? t('verbalResponse') : t('motorResponse')}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {gcs[type]}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {GCS_OPTIONS[type].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleGcsChange(type, opt.value)}
                        className={`w-full p-3 text-left rounded-xl border transition-all duration-300 group relative overflow-hidden ${
                          gcs[type] === opt.value 
                            ? 'bg-primary border-primary shadow-lg shadow-primary/20 scale-[1.02]' 
                            : 'bg-muted/30 border-border/50 hover:border-primary/30 hover:bg-muted/50'
                        }`}
                      >
                        {gcs[type] === opt.value && (
                          <motion.div 
                            layoutId={`${type}-active-bg`}
                            className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80"
                          />
                        )}
                        <div className="relative z-10 flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className={`font-bold text-[11px] uppercase tracking-tight truncate ${gcs[type] === opt.value ? 'text-primary-foreground' : 'text-foreground'}`}>
                              {t(opt.label.toLowerCase().replace(/\s+/g, '') as any)}
                            </div>
                            <div className={`text-[9px] font-medium leading-tight mt-0.5 line-clamp-1 ${gcs[type] === opt.value ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {t(opt.sub.toLowerCase().replace(/\s+/g, '').replace(/[(),]/g, '') as any)}
                            </div>
                          </div>
                          <div className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                            gcs[type] === opt.value ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                          }`}>
                            {opt.value}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );
      }
      case 'MEWS': {
        const mewsScore = ScoringEngine.calculateMEWS(mews);
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card p-8 rounded-3xl border border-border shadow-sm relative overflow-hidden"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-2xl shadow-inner">
                  <Zap className="text-primary" size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground tracking-tight">MEWS</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Modified Early Warning</p>
                </div>
              </div>
              <div className="flex items-center gap-6 bg-muted/30 p-4 rounded-2xl border border-border/50">
                <div className="text-4xl font-black text-primary tracking-tighter">{mewsScore}</div>
                <div className="space-y-1">
                  <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${mewsScore >= 5 ? 'text-destructive' : 'text-emerald-500'}`}>
                    {mewsScore >= 5 ? t('critical') : t('stable')}
                  </div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Total Score
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8 relative z-10">
              <AnimatePresence>
                {(isMewsCritical || isVitalsCritical) && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-destructive text-destructive-foreground p-4 rounded-2xl border border-destructive/20 shadow-lg shadow-destructive/20 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-xl">
                        <AlertTriangle size={20} />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t('criticalAlert')}</p>
                        <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest">{t('interventionRequired')}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  { label: t('systolicBPLabel'), value: mews.sbp, setter: (v: number) => setMews({...mews, sbp: v}), vitals: vitalsClass.sbp, max: 300, normal: 120, unit: 'mmHg' },
                  { label: t('heartRateLabel'), value: mews.hr, setter: (v: number) => setMews({...mews, hr: v}), vitals: vitalsClass.hr, max: 300, normal: 75, unit: 'bpm' },
                  { label: t('respiratoryRateLabel'), value: mews.rr, setter: (v: number) => setMews({...mews, rr: v}), vitals: vitalsClass.rr, max: 100, normal: 16, unit: '/min' },
                  { label: t('temperatureLabel'), value: mews.temp, setter: (v: number) => setMews({...mews, temp: v}), vitals: { severity: (mews.temp < 35 || mews.temp > 39) ? 'Abnormal' : 'Normal', status: '' }, max: 50, normal: 37, unit: '°C' },
                ].map((field, i) => (
                  <div key={i} className="space-y-3 group">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{field.label}</label>
                      <div className="flex items-center gap-2">
                        {field.vitals.severity !== 'Normal' && (
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            field.vitals.severity === 'Critical' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                          }`}>
                            {translateStatus(field.vitals.status)}
                          </span>
                        )}
                        <button 
                          onClick={() => field.setter(field.normal)}
                          className="text-[9px] font-bold text-primary hover:underline uppercase tracking-widest"
                        >
                          {t('setNormal')}
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={field.value} 
                        onChange={e => field.setter(Math.max(0, Math.min(field.max, Number(e.target.value))))}
                        className={`w-full p-5 bg-muted/30 rounded-2xl border-2 font-mono text-2xl font-bold outline-none transition-all pr-16 ${
                          field.vitals.severity === 'Critical' ? 'border-destructive/50 focus:border-destructive bg-destructive/5' : 
                          field.vitals.severity === 'Abnormal' ? 'border-warning/50 focus:border-warning bg-warning/5' : 
                          'border-transparent focus:border-primary focus:bg-card'
                        }`}
                      />
                      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest pointer-events-none">
                        {field.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <label className="text-[10px] font-bold text-foreground uppercase tracking-[0.15em]">{t('avpu')} Score</label>
                </div>
                <div className="grid grid-cols-4 gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
                  {['Alert', 'Voice', 'Pain', 'Unresp'].map((label, i) => (
                    <button
                      key={i}
                      onClick={() => setMews({...mews, avpu: i})}
                      className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-300 ${
                        mews.avpu === i 
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]' 
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        );
      }
      case 'SIRS': {
        const sirsScore = ScoringEngine.calculateSIRS(sirs);
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card p-8 rounded-3xl border border-border shadow-sm relative overflow-hidden"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-2xl shadow-inner">
                  <Activity className="text-primary" size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground tracking-tight">SIRS</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{t('inflammatoryResponse')}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 bg-muted/30 p-4 rounded-2xl border border-border/50">
                <div className="text-4xl font-black text-primary tracking-tighter">{sirsScore}</div>
                <div className="space-y-1">
                  <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${sirsScore >= 2 ? 'text-destructive' : 'text-emerald-500'}`}>
                    {sirsScore >= 2 ? t('positive') : t('negative')}
                  </div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Total Score
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-8 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('temperatureLabel')}</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={sirs.temp} 
                      onChange={e => setSirs({...sirs, temp: e.target.value === '' ? '' : Number(e.target.value)})}
                      className={`w-full p-5 bg-muted/30 rounded-2xl border-2 font-mono text-2xl font-bold outline-none transition-all pr-16 ${
                        sirs.temp !== '' && (sirs.temp < 36 || sirs.temp > 38) ? 'border-warning/50 focus:border-warning bg-warning/5' : 'border-transparent focus:border-primary focus:bg-card'
                      }`}
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest pointer-events-none">°C</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('wbcCountLabel')}</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={sirs.wbc} 
                      onChange={e => setSirs({...sirs, wbc: e.target.value === '' ? '' : Number(e.target.value)})}
                      className={`w-full p-5 bg-muted/30 rounded-2xl border-2 font-mono text-2xl font-bold outline-none transition-all pr-16 ${
                        sirs.wbc !== '' && (sirs.wbc < 4 || sirs.wbc > 12) ? 'border-warning/50 focus:border-warning bg-warning/5' : 'border-transparent focus:border-primary focus:bg-card'
                      }`}
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest pointer-events-none">10³/µL</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      }
      case 'qSOFA': {
        const qsofaScore = ScoringEngine.calculateQSOFA(qsofa);
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card p-8 rounded-3xl border border-border shadow-sm relative overflow-hidden"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-2xl shadow-inner">
                  <Zap className="text-primary" size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground tracking-tight">qSOFA</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{t('quickSepsisOrganFailure')}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 bg-muted/30 p-4 rounded-2xl border border-border/50">
                <div className="text-4xl font-black text-primary tracking-tighter">{qsofaScore}</div>
                <div className="space-y-1">
                  <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${qsofaScore >= 2 ? 'text-destructive' : 'text-emerald-500'}`}>
                    {qsofaScore >= 2 ? t('highRisk') : t('lowRisk')}
                  </div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Total Score
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4 relative z-10">
              {[
                { label: 'SBP ≤ 100 mmHg', key: 'lowBP', sub: 'Systolic Blood Pressure' },
                { label: 'Resp Rate ≥ 22/min', key: 'highRR', sub: 'Respiratory Frequency' },
                { label: t('alteredMentation'), key: 'alteredMentation', sub: 'GCS < 15' }
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-5 bg-muted/30 rounded-2xl border border-border/50 group transition-all hover:bg-muted/50">
                  <div className="space-y-0.5">
                    <span className="font-black text-foreground text-[11px] uppercase tracking-tight block">{item.label}</span>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{item.sub}</span>
                  </div>
                  <div className="flex gap-2 bg-muted p-1 rounded-xl border border-border/50">
                    {[false, true].map((val) => (
                      <button
                        key={val ? 'yes' : 'no'}
                        onClick={() => setQsofa({...qsofa, [item.key]: val})}
                        className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all duration-300 ${
                          qsofa[item.key as keyof QSOFAState] === val
                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.05]'
                            : 'text-muted-foreground hover:bg-accent'
                        }`}
                      >
                        {val ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );
      }
      case 'PEWS': {
        const pewsScore = ScoringEngine.calculatePEWS(pews);
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card p-8 rounded-3xl border border-border shadow-sm relative overflow-hidden"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-2xl shadow-inner">
                  <Baby className="text-primary" size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground tracking-tight">PEWS</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{t('pediatricEarlyWarning')}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 bg-muted/30 p-4 rounded-2xl border border-border/50">
                <div className="text-4xl font-black text-primary tracking-tighter">{pewsScore}</div>
                <div className="space-y-1">
                  <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${pewsScore >= 5 ? 'text-destructive' : 'text-emerald-500'}`}>
                    {pewsScore >= 5 ? t('critical') : t('stable')}
                  </div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Total Score
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8 relative z-10">
              <AnimatePresence>
                {isPewsCritical && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-destructive text-destructive-foreground p-4 rounded-2xl border border-destructive/20 shadow-lg shadow-destructive/20 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-xl">
                        <AlertTriangle size={20} />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t('criticalAlert')}</p>
                        <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest">{t('interventionRequired')}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 gap-8">
                {(['behavior', 'cardiovascular', 'respiratory'] as const).map((type) => (
                  <div key={type} className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      <label className="text-[10px] font-bold text-foreground uppercase tracking-[0.15em]">{t(type as any)} (0-3)</label>
                    </div>
                    <div className="grid grid-cols-4 gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
                      {[0, 1, 2, 3].map((val) => (
                        <button
                          key={val}
                          onClick={() => setPews({...pews, [type]: val})}
                          className={`py-4 rounded-xl text-xs font-black transition-all duration-300 ${
                            pews[type] === val 
                              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]' 
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { label: t('nebulizer'), key: 'nebulizer' },
                  { label: t('vomiting'), key: 'persistentVomiting' }
                ].map((item) => (
                  <div key={item.key} className="p-5 bg-muted/30 rounded-2xl border border-border/50 space-y-4">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">{item.label}</span>
                    <div className="flex gap-2 bg-muted p-1 rounded-xl border border-border/50">
                      {[false, true].map((val) => (
                        <button
                          key={val ? 'yes' : 'no'}
                          onClick={() => setPews({...pews, [item.key as keyof PEWSState]: val})}
                          className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all duration-300 ${
                            pews[item.key as keyof PEWSState] === val
                              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                              : 'text-muted-foreground hover:bg-accent'
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
          </motion.div>
        );
      }
      case 'Surgical': {
        const ariscatRisk = getAriscatRisk(ariscatScore);
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card p-8 rounded-3xl border border-border shadow-sm relative overflow-hidden"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-2xl shadow-inner">
                  <Scissors className="text-primary" size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground tracking-tight">{t('surgicalRisk')}</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">ARISCAT Score</p>
                </div>
              </div>
              <div className="flex items-center gap-6 bg-muted/30 p-4 rounded-2xl border border-border/50">
                <div className="text-4xl font-black text-primary tracking-tighter">{ariscatScore}</div>
                <div className="space-y-1">
                  <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${ariscatRisk.color}`}>
                    {ariscatRisk.label}
                  </div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Total Score
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">ASA Status</label>
                  <div className="grid grid-cols-5 gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
                    {[1, 2, 3, 4, 5].map(v => (
                      <button
                        key={v}
                        onClick={() => setSurgery({...surgery, asa: v})}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all duration-300 ${
                          surgery.asa === v 
                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.05]' 
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pre-op SpO2 (%)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={surgery.preOpSpO2} 
                      onChange={e => setSurgery({...surgery, preOpSpO2: e.target.value === '' ? '' : Number(e.target.value)})}
                      className="w-full p-5 bg-muted/30 rounded-2xl border-2 border-transparent font-mono text-2xl font-bold outline-none focus:border-primary focus:bg-card transition-all pr-16"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest pointer-events-none">%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">{t('surgicalSite')}</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: t('peripheral'), value: 'Peripheral' },
                    { label: t('upperAbdominal'), value: 'Upper Abdominal' },
                    { label: t('intrathoracic'), value: 'Intrathoracic' }
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setSurgery({...surgery, surgeryType: type.value})}
                      className={`p-4 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                        surgery.surgeryType === type.value
                          ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]'
                          : 'bg-muted/30 border-border/50 text-muted-foreground hover:border-primary/30'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { label: t('respiratoryInfection'), key: 'respInfection' },
                  { label: t('anemia'), key: 'preOpAnemia' }
                ].map((item) => (
                  <div key={item.key} className="p-5 bg-muted/30 rounded-2xl border border-border/50 space-y-4">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">{item.label}</span>
                    <div className="flex gap-2 bg-muted p-1 rounded-xl border border-border/50">
                      {[false, true].map((val) => (
                        <button
                          key={val ? 'yes' : 'no'}
                          onClick={() => setSurgery({...surgery, [item.key as keyof SurgicalState]: val})}
                          className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all duration-300 ${
                            surgery[item.key as keyof SurgicalState] === val
                              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                              : 'text-muted-foreground hover:bg-accent'
                          }`}
                        >
                          {val ? 'Yes' : 'No'}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">{t('duration')}</label>
                <div className="grid grid-cols-3 gap-3 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
                  {['<2h', '2-3h', '>3h'].map(d => (
                    <button 
                      key={d} 
                      onClick={() => setSurgery({...surgery, duration: d})}
                      className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-300 ${
                        surgery.duration === d 
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]' 
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        );
      }
      case 'PHQ-9': {
        const phq9Score = ScoringEngine.calculatePHQ9(phq9);
        const questions = [
          'Little interest or pleasure in doing things',
          'Feeling down, depressed, or hopeless',
          'Trouble falling or staying asleep, or sleeping too much',
          'Feeling tired or having little energy',
          'Poor appetite or overeating',
          'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
          'Trouble concentrating on things, such as reading the newspaper or watching television',
          'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
          'Thoughts that you would be better off dead or of hurting yourself in some way'
        ];
        const answeredCount = Object.values(phq9).filter(v => v !== -1).length;
        const progress = (answeredCount / questions.length) * 100;

        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card p-8 rounded-3xl border border-border shadow-sm relative overflow-hidden"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-2xl shadow-inner">
                  <Brain className="text-primary" size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground tracking-tight">PHQ-9</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Depression Severity</p>
                </div>
              </div>
              <div className="flex items-center gap-6 bg-muted/30 p-4 rounded-2xl border border-border/50">
                <div className="text-4xl font-black text-primary tracking-tighter">{phq9Score}</div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                    {t('totalScore')}
                  </div>
                  <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="bg-primary h-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar relative z-10">
              {questions.map((q, i) => (
                <div key={i} className="p-6 bg-muted/30 rounded-2xl border border-border/50 space-y-5 transition-all hover:bg-muted/50">
                  <div className="flex gap-4">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-[10px] font-black">{i + 1}</span>
                    <p className="text-xs font-bold text-foreground leading-relaxed">{q}</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['Not at all', 'Several days', 'More than half', 'Nearly every day'].map((label, val) => (
                      <button
                        key={val}
                        onClick={() => setPhq9({...phq9, [`q${i+1}`]: val})}
                        className={`p-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-tight transition-all duration-300 ${
                          phq9[`q${i+1}` as keyof PHQ9State] === val
                            ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-[1.05]'
                            : 'bg-card text-muted-foreground border-border/50 hover:border-primary/30'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );
      }
      case 'GAD-7': {
        const gad7Score = ScoringEngine.calculateGAD7(gad7);
        const questions = [
          'Feeling nervous, anxious or on edge',
          'Not being able to stop or control worrying',
          'Worrying too much about different things',
          'Trouble relaxing',
          'Being so restless that it is hard to sit still',
          'Becoming easily annoyed or irritable',
          'Feeling afraid as if something awful might happen'
        ];
        const answeredCount = Object.values(gad7).filter(v => v !== -1).length;
        const progress = (answeredCount / questions.length) * 100;

        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card p-8 rounded-3xl border border-border shadow-sm relative overflow-hidden"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-2xl shadow-inner">
                  <Brain className="text-primary" size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground tracking-tight">GAD-7</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Anxiety Severity</p>
                </div>
              </div>
              <div className="flex items-center gap-6 bg-muted/30 p-4 rounded-2xl border border-border/50">
                <div className="text-4xl font-black text-primary tracking-tighter">{gad7Score}</div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                    {t('totalScore')}
                  </div>
                  <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="bg-primary h-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar relative z-10">
              {questions.map((q, i) => (
                <div key={i} className="p-6 bg-muted/30 rounded-2xl border border-border/50 space-y-5 transition-all hover:bg-muted/50">
                  <div className="flex gap-4">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-[10px] font-black">{i + 1}</span>
                    <p className="text-xs font-bold text-foreground leading-relaxed">{q}</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['Not at all', 'Several days', 'More than half', 'Nearly every day'].map((label, val) => (
                      <button
                        key={val}
                        onClick={() => setGad7({...gad7, [`q${i+1}`]: val})}
                        className={`p-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-tight transition-all duration-300 ${
                          gad7[`q${i+1}` as keyof GAD7State] === val
                            ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-[1.05]'
                            : 'bg-card text-muted-foreground border-border/50 hover:border-primary/30'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );
      }
      case 'AMTS': {
        const amtsScore = ScoringEngine.calculateAMTS(amts);
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card p-8 rounded-3xl border border-border shadow-sm relative overflow-hidden"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-2xl shadow-inner">
                  <Brain className="text-primary" size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground tracking-tight">AMTS</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Cognitive Screen</p>
                </div>
              </div>
              <div className="flex items-center gap-6 bg-muted/30 p-4 rounded-2xl border border-border/50">
                <div className="text-4xl font-black text-primary tracking-tighter">{amtsScore}</div>
                <div className="space-y-1">
                  <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${amtsScore < 7 ? 'text-destructive' : 'text-emerald-500'}`}>
                    {amtsScore < 7 ? t('impaired') : t('normal')}
                  </div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Total Score
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3 relative z-10">
              {[
                { label: 'Age', key: 'age' },
                { label: 'Time (nearest hour)', key: 'time' },
                { label: 'Address (recall at end)', key: 'address' },
                { label: 'Year', key: 'year' },
                { label: 'Place (hospital/building)', key: 'place' },
                { label: 'Recognition of two persons', key: 'recognition' },
                { label: 'Date of Birth', key: 'dob' },
                { label: 'Monarch / President', key: 'monarch' },
                { label: 'Dates of WW2', key: 'ww2' },
                { label: 'Count backwards 20 to 1', key: 'countBackwards' }
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50 group transition-all hover:bg-muted/50">
                  <span className="font-black text-foreground text-[11px] uppercase tracking-tight">{item.label}</span>
                  <div className="flex gap-2 bg-muted p-1 rounded-xl border border-border/50">
                    {[false, true].map((val) => (
                      <button
                        key={val ? 'yes' : 'no'}
                        onClick={() => setAmts({...amts, [item.key as keyof AMTSState]: val})}
                        className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all duration-300 ${
                          amts[item.key as keyof AMTSState] === val
                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.05]'
                            : 'text-muted-foreground hover:bg-accent'
                        }`}
                      >
                        {val ? 'Correct' : 'Incorrect'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );
      }
      case 'Anthro':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card p-12 rounded-3xl border border-border shadow-sm text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
            <div className="relative z-10 space-y-6">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <Ruler size={40} className="text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground tracking-tight">{t('anthropometrics')}</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">{t('usePhysicalExamTab')}</p>
              </div>
              <div className="pt-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <Info size={14} />
                  BMI & WHR Calculations
                </div>
              </div>
            </div>
          </motion.div>
        );

      default:
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card p-16 rounded-3xl border border-border shadow-sm text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
            <div className="relative z-10 space-y-8">
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-20" />
                <div className="relative w-24 h-24 bg-muted rounded-3xl flex items-center justify-center shadow-inner">
                  <Calculator size={48} className="text-primary/40" />
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-foreground tracking-tight">Select Calculator</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">Choose a specialized clinical calculator from the toolbar above to begin your assessment.</p>
              </div>
              <div className="flex justify-center gap-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Real-time scoring
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Clinical alerts
                </div>
              </div>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {isAnyCritical && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-destructive text-destructive-foreground p-8 rounded-[2rem] border border-destructive/20 shadow-2xl shadow-destructive/30 flex items-center justify-between relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />
          <div className="flex items-center gap-6 relative z-10">
            <div className="p-4 bg-white/20 rounded-2xl shadow-inner animate-pulse">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-1">
              <h4 className="text-2xl font-black uppercase tracking-[0.1em] leading-tight">{t('criticalAlert')}</h4>
              <p className="text-xs font-bold opacity-80 uppercase tracking-widest">{t('interventionRequired')}</p>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end relative z-10">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Current Score</div>
            <div className="text-4xl font-black tracking-tighter leading-none">
              {ageGroup === 'Adult' ? `MEWS: ${ScoringEngine.calculateMEWS(mews)}` : `PEWS: ${ScoringEngine.calculatePEWS(pews)}`}
            </div>
          </div>
        </motion.div>
      )}

      <div className="max-w-3xl mx-auto">
        {renderActiveCalculator()}
      </div>
    </div>
  );
};

export default CombinedCalculators;
