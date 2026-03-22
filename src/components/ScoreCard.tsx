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
  const colorClasses: Record<string, string> = {
    red: 'bg-red-600/10 text-red-600 border-red-600/20',
    amber: 'bg-amber-600/10 text-amber-600 border-amber-600/20',
    pink: 'bg-pink-600/10 text-pink-600 border-pink-600/20',
    blue: 'bg-blue-600/10 text-blue-600 border-blue-600/20',
    emerald: 'bg-emerald-600/10 text-emerald-600 border-emerald-600/20',
    slate: 'bg-slate-600/10 text-slate-600 border-slate-600/20',
    indigo: 'bg-indigo-600/10 text-indigo-600 border-indigo-600/20',
    orange: 'bg-orange-600/10 text-orange-600 border-orange-600/20',
  };

  const activeColor = colorClasses[color] || colorClasses.red;

  return (
    <div className="score-card bg-white border border-border flex flex-col h-full transition-none">
      <div className="p-2 border-b border-border flex justify-between items-center bg-[#F3F3F3]">
        <div className="flex items-center gap-2">
          {icon && <div className={`p-1 border border-border ${activeColor.split(' ')[0]} ${activeColor.split(' ')[1]}`}>{icon}</div>}
          <div>
            <h3 className="font-bold text-slate-800 leading-none text-[11px] uppercase tracking-tight">{title}</h3>
            {subtitle && <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {score !== undefined && (
          <div className={`w-7 h-7 flex items-center justify-center border border-border font-bold text-sm ${activeColor}`}>
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
