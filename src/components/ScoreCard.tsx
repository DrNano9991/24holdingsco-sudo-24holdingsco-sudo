import React from 'react';

interface ScoreCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  score?: number | string;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ title, subtitle, icon, children, score }) => {
  return (
    <div className="score-card bg-white border border-border flex flex-col h-full transition-none">
      <div className="p-2 border-b border-border flex justify-between items-center bg-white">
        <div className="flex items-center gap-2">
          {icon && <div className="p-1 border border-border text-slate-400">{icon}</div>}
          <div>
            <h3 className="font-bold text-slate-800 leading-none text-[11px] uppercase tracking-tight">{title}</h3>
            {subtitle && <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {score !== undefined && (
          <div className="w-7 h-7 flex items-center justify-center border border-border font-bold text-sm bg-slate-50 text-slate-800">
            {score}
          </div>
        )}
      </div>
      <div className="p-3 flex-1">
        {children}
      </div>
    </div>
  );
};

export default ScoreCard;
