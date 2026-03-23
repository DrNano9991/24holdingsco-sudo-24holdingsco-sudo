import React from 'react';
import { GCSState, MEWSState, SIRSState, QSOFAState, CURB65State, PEWSState, SurgicalState } from '../types';
import { Brain, Activity, Zap, Baby, Scissors, Ruler } from 'lucide-react';

import { ScoringEngine } from '../services/scoringEngine';

interface Props {
  gcs: GCSState;
  mews: MEWSState;
  sirs: SIRSState;
  qsofa: QSOFAState;
  curb65: CURB65State;
  pews: PEWSState;
  surgery: SurgicalState;
  anthro?: { waist: number | ''; height: number | ''; hip: number | ''; weight: number | ''; };
  activeCalculator?: string;
  onSelect?: (calculator: string) => void;
}

const ScoreSummaryPanel: React.FC<Props> = ({ 
  gcs, mews, sirs, qsofa, curb65, pews, surgery, anthro, 
  activeCalculator, onSelect 
}) => {
  const gcsTotal = ScoringEngine.calculateGCS(gcs);
  const sirsCount = ScoringEngine.calculateSIRS(sirs);
  const qsofaCount = ScoringEngine.calculateQSOFA(qsofa);
  const mewsTotal = ScoringEngine.calculateMEWS(mews);
  const pewsTotal = ScoringEngine.calculatePEWS(pews);
  const ariscatScore = ScoringEngine.calculateARISCAT(surgery);
  const bmi = anthro ? ScoringEngine.calculateBMI(anthro.weight, anthro.height) : null;
  const whr = anthro ? ScoringEngine.calculateWHR(anthro.waist, anthro.hip) : null;

  const stats = [
    { id: 'GCS', label: 'GCS', value: gcsTotal, icon: <Brain size={16} />, color: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', iconBg: 'bg-indigo-100' },
    { id: 'MEWS', label: 'MEWS', value: mewsTotal, icon: <Zap size={16} />, color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', iconBg: 'bg-emerald-100' },
    { id: 'PEWS', label: 'PEWS', value: pewsTotal, icon: <Baby size={16} />, color: 'pink', bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200', iconBg: 'bg-pink-100' },
    { id: 'SIRS', label: 'SIRS', value: sirsCount, icon: <Activity size={16} />, color: 'amber', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', iconBg: 'bg-amber-100' },
    { id: 'qSOFA', label: 'qSOFA', value: qsofaCount, icon: <Zap size={16} />, color: 'rose', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', iconBg: 'bg-rose-100' },
    { id: 'Surgical', label: 'Surgical', value: ariscatScore, icon: <Scissors size={16} />, color: 'slate', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', iconBg: 'bg-slate-100' },
    { id: 'Anthro', label: 'BMI', value: bmi || '--', icon: <Ruler size={16} />, color: 'teal', bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', iconBg: 'bg-teal-100' },
  ];

  const getStatStyles = (stat: typeof stats[0]) => {
    const isActive = activeCalculator === stat.id;
    
    const colorMap: Record<string, string> = {
      indigo: isActive ? 'ring-indigo-500 border-indigo-500 shadow-md' : 'border-slate-200',
      emerald: isActive ? 'ring-emerald-500 border-emerald-500 shadow-md' : 'border-slate-200',
      pink: isActive ? 'ring-pink-500 border-pink-500 shadow-md' : 'border-slate-200',
      amber: isActive ? 'ring-amber-500 border-amber-500 shadow-md' : 'border-slate-200',
      rose: isActive ? 'ring-rose-500 border-rose-500 shadow-md' : 'border-slate-200',
      slate: isActive ? 'ring-slate-500 border-slate-500 shadow-md' : 'border-slate-200',
      teal: isActive ? 'ring-teal-500 border-teal-500 shadow-md' : 'border-slate-200',
    };

    const barColorMap: Record<string, string> = {
      indigo: 'bg-indigo-500',
      emerald: 'bg-emerald-500',
      pink: 'bg-pink-500',
      amber: 'bg-amber-500',
      rose: 'bg-rose-500',
      slate: 'bg-slate-500',
      teal: 'bg-teal-500',
    };

    return {
      container: `bg-white border p-2 flex flex-col items-center justify-center text-center transition-all relative overflow-hidden group ${
        isActive ? 'ring-2 ring-offset-1 z-10' : 'hover:border-slate-300 hover:shadow-sm'
      } ${colorMap[stat.color]}`,
      bar: barColorMap[stat.color]
    };
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
      {stats.map((stat) => {
        const styles = getStatStyles(stat);
        return (
          <button 
            key={stat.id} 
            onClick={() => onSelect?.(stat.id)}
            className={styles.container}
          >
            <div className={`absolute top-0 right-0 w-8 h-8 ${stat.bg} -mr-4 -mt-4 rounded-full opacity-50 transition-transform group-hover:scale-110`} />
            <div className={`${stat.iconBg} ${stat.text} p-1.5 rounded-full mb-1 z-10`}>{stat.icon}</div>
            <div className={`text-xl font-black ${stat.text} leading-none tracking-tighter z-10`}>{stat.value}</div>
            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 z-10">{stat.label}</div>
            {activeCalculator === stat.id && (
              <div className={`absolute bottom-0 left-0 right-0 h-1 ${styles.bar}`} />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ScoreSummaryPanel;
