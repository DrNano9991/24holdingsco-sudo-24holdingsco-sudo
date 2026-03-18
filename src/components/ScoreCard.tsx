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
    <div className="material-card rounded-2xl overflow-hidden flex flex-col h-full group transition-all">
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
        <div className="flex items-center gap-3">
          {icon && <div className={`p-2 rounded-lg ${activeColor.split(' ')[0]} ${activeColor.split(' ')[1]}`}>{icon}</div>}
          <div>
            <h3 className="font-black text-slate-900 dark:text-white leading-none text-sm uppercase tracking-wider">{title}</h3>
            {subtitle && <p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-[0.2em] mt-1">{subtitle}</p>}
          </div>
        </div>
        {score !== undefined && (
          <div className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-lg shadow-lg border-2 ${activeColor} dark:text-white`}>
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
