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
}

const ScoreSummaryPanel: React.FC<Props> = ({ gcs, mews, sirs, qsofa, curb65, pews, surgery, anthro }) => {
  const gcsTotal = ScoringEngine.calculateGCS(gcs);
  const sirsCount = ScoringEngine.calculateSIRS(sirs);
  const qsofaCount = ScoringEngine.calculateQSOFA(qsofa);
  const mewsTotal = ScoringEngine.calculateMEWS(mews);
  const pewsTotal = ScoringEngine.calculatePEWS(pews);
  const ariscatScore = ScoringEngine.calculateARISCAT(surgery);
  const bmi = anthro ? ScoringEngine.calculateBMI(anthro.weight, anthro.height) : null;
  const whr = anthro ? ScoringEngine.calculateWHR(anthro.waist, anthro.hip) : null;

  const stats = [
    { label: 'GCS', value: gcsTotal, icon: <Brain size={14} />, color: 'indigo' },
    { label: 'MEWS', value: mewsTotal, icon: <Zap size={14} />, color: 'emerald' },
    { label: 'PEWS', value: pewsTotal, icon: <Baby size={14} />, color: 'pink' },
    { label: 'BMI', value: bmi || '--', icon: <Activity size={14} />, color: 'teal' },
    { label: 'WHR', value: whr || '--', icon: <Ruler size={14} />, color: 'orange' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white border border-border p-2 flex flex-col items-center justify-center text-center transition-none">
          <div className="text-slate-400 mb-1">{stat.icon}</div>
          <div className="text-lg font-bold text-slate-800 leading-none">{stat.value}</div>
          <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">{stat.label}</div>
          <div className={`w-2 h-2 border border-border mt-2 bg-gradient-to-br from-${stat.color}-400 to-${stat.color}-600`} />
        </div>
      ))}
    </div>
  );
};

export default ScoreSummaryPanel;
