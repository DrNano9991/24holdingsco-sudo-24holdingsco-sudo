import React from 'react';
import { User, Droplets, Brain, Ruler, Activity, Thermometer, ShieldCheck, Wind, Mic } from 'lucide-react';
import ScoreCard from './ScoreCard';
import { ExamState, LiverState, CHADS2VAScState, CURB65State } from '../types';
import { ScoringEngine } from '../services/scoringEngine';

interface PhysicalExamProps {
  exam: ExamState;
  setExam: (exam: ExamState) => void;
  liver: LiverState;
  setLiver: (liver: LiverState) => void;
  anthro: { waist: number | ''; height: number | ''; hip: number | ''; weight: number | ''; };
  setAnthro: (anthro: { waist: number | ''; height: number | ''; hip: number | ''; weight: number | ''; }) => void;
  chads: CHADS2VAScState;
  setChads: (chads: CHADS2VAScState) => void;
  curb65: CURB65State;
  setCurb65: (curb65: CURB65State) => void;
  wellsPE: any;
  setWellsPE: (wellsPE: any) => void;
  onVoiceCommand?: () => void;
}

const PhysicalExam: React.FC<PhysicalExamProps> = ({ 
  exam, setExam, 
  liver, setLiver,
  anthro, setAnthro,
  chads, setChads,
  curb65, setCurb65,
  wellsPE, setWellsPE,
  onVoiceCommand
}) => {
  const bmi = (anthro.weight && anthro.height) ? (Number(anthro.weight) / Math.pow(Number(anthro.height) / 100, 2)).toFixed(1) : null;
  const whr = (anthro.waist && anthro.hip) ? (Number(anthro.waist) / Number(anthro.hip)).toFixed(2) : null;

  return (
    <div className="space-y-6 transition-none">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3 uppercase tracking-tight">
          <User className="text-primary" /> Physical Examination & Clinical Scores
        </h2>
        {onVoiceCommand && (
          <button 
            onClick={onVoiceCommand}
            className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 border border-border rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
            title="Voice Input for Exam"
          >
            <Mic size={14} />
            <span>Voice Input</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* General & Hydration */}
        <ScoreCard title="Hydration & Perfusion" subtitle="General Assessment" icon={<Droplets size={20} />}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">JVP (mmHg)</label>
                <input 
                  type="number" 
                  value={exam.jvp} 
                  onChange={e => setExam({...exam, jvp: e.target.value === '' ? '' : Number(e.target.value)})}
                  className="w-full p-2 bg-white border border-border font-bold text-sm outline-none focus:border-primary"
                  placeholder="e.g. 7"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">Capillary Refill (s)</label>
                <input 
                  type="number" 
                  value={exam.capRefill} 
                  onChange={e => setExam({...exam, capRefill: e.target.value === '' ? '' : Number(e.target.value)})}
                  className="w-full p-2 bg-white border border-border font-bold text-sm outline-none focus:border-primary"
                  placeholder="e.g. 2"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">Skin Turgor</label>
                <select 
                  value={exam.skinTurgor} 
                  onChange={e => setExam({...exam, skinTurgor: e.target.value})}
                  className="w-full p-2 bg-white border border-border font-bold text-sm outline-none focus:border-primary"
                >
                  <option value="Normal">Normal</option>
                  <option value="Poor">Poor</option>
                  <option value="Very Poor">Very Poor</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">Mucosa</label>
                <select 
                  value={exam.mucosa} 
                  onChange={e => setExam({...exam, mucosa: e.target.value})}
                  className="w-full p-2 bg-white border border-border font-bold text-sm outline-none focus:border-primary"
                >
                  <option value="Moist">Moist</option>
                  <option value="Dry">Dry</option>
                  <option value="Parched">Parched</option>
                </select>
              </div>
            </div>
          </div>
        </ScoreCard>

        {/* Cardiovascular & Neuromuscular */}
        <ScoreCard title="Vascular & Motor" subtitle="Peripheral & Strength" icon={<Activity size={20} />}>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">Pulse Grade (0-3)</label>
              <div className="flex gap-1 p-1 bg-slate-50 border border-border">
                {[0, 1, 2, 3].map(v => (
                  <button 
                    key={v} 
                    onClick={() => setExam({...exam, pulseGrade: v})}
                    className={`flex-1 p-1.5 border border-border text-sm font-bold transition-none ${exam.pulseGrade === v ? 'bg-slate-400 text-white border-slate-500 z-10' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    {v}+
                  </button>
                ))}
              </div>
              <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                {exam.pulseGrade === 0 && 'Absent'}
                {exam.pulseGrade === 1 && 'Weak/Thready'}
                {exam.pulseGrade === 2 && 'Normal'}
                {exam.pulseGrade === 3 && 'Bounding'}
              </p>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">Muscle Strength (0-5)</label>
              <div className="flex gap-1 p-1 bg-slate-50 border border-border">
                {[0, 1, 2, 3, 4, 5].map(v => (
                  <button 
                    key={v} 
                    onClick={() => setExam({...exam, muscleStrength: v})}
                    className={`flex-1 p-1.5 border border-border text-xs font-bold transition-none ${exam.muscleStrength === v ? 'bg-slate-400 text-white border-slate-500 z-10' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                {exam.muscleStrength === 0 && 'No contraction'}
                {exam.muscleStrength === 1 && 'Trace contraction'}
                {exam.muscleStrength === 2 && 'Active motion (no gravity)'}
                {exam.muscleStrength === 3 && 'Active motion (gravity)'}
                {exam.muscleStrength === 4 && 'Active motion (resistance)'}
                {exam.muscleStrength === 5 && 'Normal strength'}
              </p>
            </div>
          </div>
        </ScoreCard>

        {/* Liver Specific Findings */}
        <ScoreCard title="Liver Findings" subtitle="Hepatic Assessment" icon={<Droplets size={20} />}>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">Ascites</label>
              <div className="flex gap-1 p-1 bg-slate-50 border border-border">
                {[
                  { value: 1, label: 'None' },
                  { value: 2, label: 'Mild' },
                  { value: 3, label: 'Severe' }
                ].map(opt => (
                  <button 
                    key={opt.value} 
                    onClick={() => setLiver({...liver, ascites: opt.value})}
                    className={`flex-1 p-1.5 border border-border text-[10px] font-bold transition-none ${liver.ascites === opt.value ? 'bg-slate-400 text-white border-slate-500 z-10' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">Encephalopathy</label>
              <div className="flex gap-1 p-1 bg-slate-50 border border-border">
                {[
                  { value: 1, label: 'None' },
                  { value: 2, label: 'Grade 1-2' },
                  { value: 3, label: 'Grade 3-4' }
                ].map(opt => (
                  <button 
                    key={opt.value} 
                    onClick={() => setLiver({...liver, encephalopathy: opt.value})}
                    className={`flex-1 p-1.5 border border-border text-[10px] font-bold transition-none ${liver.encephalopathy === opt.value ? 'bg-slate-400 text-white border-slate-500 z-10' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between p-2 bg-white border border-border">
              <label className="text-[10px] font-black text-slate-600 uppercase">Dialysis (≥2x/week)</label>
              <select 
                value={liver.dialysis ? 'yes' : 'no'} 
                onChange={e => setLiver({...liver, dialysis: e.target.value === 'yes'})}
                className="p-1 bg-white border border-border font-bold text-[10px] outline-none focus:border-primary"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
          </div>
        </ScoreCard>

        {/* Anthropometry */}
        <ScoreCard title="Anthropometry" subtitle="Body Measurements" icon={<Ruler size={20} />}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">Weight (kg)</label>
                <input 
                  type="number" 
                  value={anthro.weight} 
                  onChange={e => setAnthro({...anthro, weight: e.target.value === '' ? '' : Number(e.target.value)})}
                  className="w-full p-2 bg-white border border-border font-bold text-sm outline-none focus:border-primary"
                  placeholder="e.g. 70"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">Height (cm)</label>
                <input 
                  type="number" 
                  value={anthro.height} 
                  onChange={e => setAnthro({...anthro, height: e.target.value === '' ? '' : Number(e.target.value)})}
                  className="w-full p-2 bg-white border border-border font-bold text-sm outline-none focus:border-primary"
                  placeholder="e.g. 175"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">Waist (cm)</label>
                <input 
                  type="number" 
                  value={anthro.waist} 
                  onChange={e => setAnthro({...anthro, waist: e.target.value === '' ? '' : Number(e.target.value)})}
                  className="w-full p-2 bg-white border border-border font-bold text-sm outline-none focus:border-primary"
                  placeholder="e.g. 90"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">Hip (cm)</label>
                <input 
                  type="number" 
                  value={anthro.hip} 
                  onChange={e => setAnthro({...anthro, hip: e.target.value === '' ? '' : Number(e.target.value)})}
                  className="w-full p-2 bg-white border border-border font-bold text-sm outline-none focus:border-primary"
                  placeholder="e.g. 100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bmi && (
                <div className="p-2 bg-white border border-border">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">BMI (kg/m²)</p>
                  <p className="text-base font-bold text-slate-800">{bmi}</p>
                  <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                    {Number(bmi) < 18.5 ? 'Underweight' : Number(bmi) < 25 ? 'Normal' : Number(bmi) < 30 ? 'Overweight' : 'Obese'}
                  </p>
                </div>
              )}
              {whr && (
                <div className="p-2 bg-white border border-border">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Waist-to-Hip Ratio</p>
                  <p className="text-base font-bold text-slate-800">{whr}</p>
                  <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                    {Number(whr) > 0.9 ? 'Increased risk' : 'Healthy ratio'}
                  </p>
                </div>
              )}
            </div>

            {anthro.height && anthro.waist && (
              <div className="p-2 bg-white border border-border">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Waist-to-Height Ratio</p>
                <p className="text-base font-bold text-slate-800">{(Number(anthro.waist) / Number(anthro.height)).toFixed(2)}</p>
                <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                  {(Number(anthro.waist) / Number(anthro.height)) > 0.5 ? 'Increased cardiometabolic risk' : 'Healthy ratio'}
                </p>
              </div>
            )}
          </div>
        </ScoreCard>

        {/* Clinical Scores (Moved from Calculators) */}
        <ScoreCard title="CHA₂DS₂-VASc" subtitle="Stroke Risk in AF" icon={<ShieldCheck size={20} />} score={ScoringEngine.calculateCHADS2VASc(chads)}>
          <div className="grid grid-cols-1 gap-2">
            {[
              { key: 'chf', label: 'CHF / LV Dysfunction (1)' },
              { key: 'htn', label: 'Hypertension (1)' },
              { key: 'age75', label: 'Age ≥ 75 (2)' },
              { key: 'dm', label: 'Diabetes Mellitus (1)' },
              { key: 'stroke', label: 'Stroke/TIA/TE (2)' },
              { key: 'vascular', label: 'Vascular Disease (1)' },
              { key: 'age65', label: 'Age 65-74 (1)' },
              { key: 'female', label: 'Female Sex (1)' }
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors">
                <span className="font-medium text-foreground text-xs">{item.label}</span>
                <select 
                  value={chads[item.key as keyof typeof chads] ? 'yes' : 'no'} 
                  onChange={e => setChads({...chads, [item.key]: e.target.value === 'yes'})}
                  className="p-1.5 bg-card border border-border rounded-lg font-bold text-xs outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            ))}
          </div>
        </ScoreCard>

        <ScoreCard title="CURB-65" subtitle="Pneumonia Severity" icon={<Wind size={20} />} score={ScoringEngine.calculateCURB65(curb65)}>
          <div className="space-y-2">
            {Object.entries({ confusion: 'Confusion', urea: 'Urea > 7', rr: 'RR ≥ 30', bp: 'BP < 90/60', age: 'Age ≥ 65' }).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors">
                <span className="font-medium text-foreground text-xs">{label}</span>
                <select 
                  value={curb65[key as keyof typeof curb65] ? 'yes' : 'no'} 
                  onChange={e => setCurb65({...curb65, [key]: e.target.value === 'yes'})}
                  className="p-1.5 bg-card border border-border rounded-lg font-bold text-xs outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            ))}
          </div>
        </ScoreCard>

        <ScoreCard title="Wells PE" subtitle="Pulmonary Embolism" icon={<Wind size={20}/>} score={ScoringEngine.calculateWellsPE(wellsPE)}>
            <div className="space-y-2">
                {Object.entries({ 
                    dvtSymptoms: 'Clinical DVT Signs (3)', 
                    peLikely: 'PE is #1 Diagnosis (3)', 
                    hr100: 'HR > 100 bpm (1.5)',
                    immobilization: 'Immob/Surgery (1.5)',
                    priorDvtPe: 'Prior DVT/PE (1.5)',
                    hemoptysis: 'Hemoptysis (1)',
                    malignancy: 'Malignancy (1)'
                }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors">
                        <span className="font-medium text-foreground text-xs">{label}</span>
                        <select 
                          value={wellsPE[key as keyof typeof wellsPE] ? 'yes' : 'no'} 
                          onChange={e => setWellsPE({...wellsPE, [key]: e.target.value === 'yes'})}
                          className="p-1.5 bg-card border border-border rounded-lg font-bold text-xs outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                    </div>
                ))}
            </div>
        </ScoreCard>
      </div>
    </div>
  );
};

export default PhysicalExam;
