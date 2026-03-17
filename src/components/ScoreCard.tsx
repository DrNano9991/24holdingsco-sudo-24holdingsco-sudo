import React from 'react';

interface ScoreCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  score?: number | string;
  color?: string;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ title, subtitle, icon, children, score, color = "red" }) => {
  return (
    <div className="material-card rounded-2xl overflow-hidden flex flex-col h-full group">
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
        <div className="flex items-center gap-3">
          {icon && <div className="text-slate-300 group-hover:text-white transition-colors">{icon}</div>}
          <div>
            <h3 className="font-black text-slate-100 leading-none text-sm uppercase tracking-wider">{title}</h3>
            {subtitle && <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">{subtitle}</p>}
          </div>
        </div>
        {score !== undefined && (
          <div className="bg-slate-900/80 border border-white/10 text-white w-10 h-10 flex items-center justify-center rounded-xl font-black text-lg shadow-lg">
            {score}
          </div>
        )}
      </div>
      <div className="p-5 flex-1">
        {children}
      </div>
    </div>
  );
};

export default ScoreCard;
