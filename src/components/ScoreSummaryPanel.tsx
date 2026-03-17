import React from 'react';
import { GCSState, MEWSState, SIRSState, QSOFAState } from '../types';
import { Brain, Activity, Zap, Wind } from 'lucide-react';

import { ScoringEngine } from '../services/scoringEngine';

interface Props {
  gcs: GCSState;
  mews: MEWSState;
  sirs: SIRSState;
  qsofa: QSOFAState;
  curb65: any;
}

const ScoreSummaryPanel: React.FC<Props> = ({ gcs, mews, sirs, qsofa, curb65 }) => {
  const gcsTotal = ScoringEngine.calculateGCS(gcs);
  const sirsCount = ScoringEngine.calculateSIRS(sirs);
  const qsofaCount = ScoringEngine.calculateQSOFA(qsofa);
  const curbCount = ScoringEngine.calculateCURB65(curb65);

  const stats = [
    { label: 'GCS', value: gcsTotal, icon: <Brain size={14} />, color: 'indigo' },
    { label: 'SIRS', value: sirsCount, icon: <Activity size={14} />, color: 'red' },
    { label: 'qSOFA', value: qsofaCount, icon: <Zap size={14} />, color: 'orange' },
    { label: 'CURB', value: curbCount, icon: <Wind size={14} />, color: 'blue' },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="material-card p-4 rounded-2xl flex flex-col items-center justify-center text-center group">
          <div className="text-slate-400 group-hover:text-white transition-colors mb-2">{stat.icon}</div>
          <div className="text-2xl font-black text-white leading-none">{stat.value}</div>
          <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2">{stat.label}</div>
          <div className={`w-1 h-1 rounded-full mt-2 bg-${stat.color}-500 shadow-[0_0_8px_rgba(0,0,0,0.5)]`} />
        </div>
      ))}
    </div>
  );
};

export default ScoreSummaryPanel;
