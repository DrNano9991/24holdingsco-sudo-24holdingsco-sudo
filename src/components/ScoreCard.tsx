import React from 'react';
import { motion } from 'motion/react';

interface ScoreCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  score?: number | string;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ title, subtitle, icon, children, score }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="score-card flex flex-col h-full"
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          <div>
            <h3 className="font-bold text-foreground leading-none text-xs uppercase tracking-wider">{title}</h3>
            {subtitle && <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-1">{subtitle}</p>}
          </div>
        </div>
        {score !== undefined && (
          <div className="px-3 py-1 rounded-full bg-primary/10 text-primary font-mono font-bold text-sm border border-primary/20">
            {score}
          </div>
        )}
      </div>
      <div className="flex-1">
        {children}
      </div>
    </motion.div>
  );
};

export default ScoreCard;
