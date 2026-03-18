import React from 'react';
import { User, Droplets, Brain, Ruler, Activity, Thermometer } from 'lucide-react';
import ScoreCard from './ScoreCard';
import { ExamState, LiverState } from '../types';

interface PhysicalExamProps {
  exam: ExamState;
  setExam: (exam: ExamState) => void;
  liver: LiverState;
  setLiver: (liver: LiverState) => void;
  anthro: { waist: number | ''; height: number | ''; hip: number | ''; weight: number | ''; };
  setAnthro: (anthro: { waist: number | ''; height: number | ''; hip: number | ''; weight: number | ''; }) => void;
}

const PhysicalExam: React.FC<PhysicalExamProps> = ({ 
  exam, setExam, 
  liver, setLiver,
  anthro, setAnthro 
}) => {
  const bmi = (anthro.weight && anthro.height) ? (Number(anthro.weight) / Math.pow(Number(anthro.height) / 100, 2)).toFixed(1) : null;
  const whr = (anthro.waist && anthro.hip) ? (Number(anthro.waist) / Number(anthro.hip)).toFixed(2) : null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
          <User className="text-red-600" /> Physical Examination
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* General & Hydration */}
        <ScoreCard title="Hydration & Perfusion" subtitle="General Assessment" icon={<Droplets size={20} />} color="blue">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">JVP (mmHg)</label>
                <input 
                  type="number" 
                  value={exam.jvp} 
                  onChange={e => setExam({...exam, jvp: e.target.value === '' ? '' : Number(e.target.value)})}
                  className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-400 transition-all"
                  placeholder="e.g. 7"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">Capillary Refill (s)</label>
                <input 
                  type="number" 
                  value={exam.capRefill} 
                  onChange={e => setExam({...exam, capRefill: e.target.value === '' ? '' : Number(e.target.value)})}
                  className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-400 transition-all"
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
                  className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-400 transition-all"
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
                  className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-400 transition-all"
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
        <ScoreCard title="Vascular & Motor" subtitle="Peripheral & Strength" icon={<Activity size={20} />} color="slate">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">Pulse Grade (0-3)</label>
              <div className="flex gap-1">
                {[0, 1, 2, 3].map(v => (
                  <button 
                    key={v} 
                    onClick={() => setExam({...exam, pulseGrade: v})}
                    className={`flex-1 p-3 rounded-xl border-2 text-sm font-black transition-all ${exam.pulseGrade === v ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
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
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4, 5].map(v => (
                  <button 
                    key={v} 
                    onClick={() => setExam({...exam, muscleStrength: v})}
                    className={`flex-1 p-2 rounded-xl border-2 text-xs font-black transition-all ${exam.muscleStrength === v ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
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
        <ScoreCard title="Liver Findings" subtitle="Hepatic Assessment" icon={<Droplets size={20} />} color="orange">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">Ascites</label>
              <div className="flex gap-1">
                {[
                  { value: 1, label: 'None' },
                  { value: 2, label: 'Mild' },
                  { value: 3, label: 'Severe' }
                ].map(opt => (
                  <button 
                    key={opt.value} 
                    onClick={() => setLiver({...liver, ascites: opt.value})}
                    className={`flex-1 p-3 rounded-xl border-2 text-[10px] font-black transition-all ${liver.ascites === opt.value ? 'border-orange-600 bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">Encephalopathy</label>
              <div className="flex gap-1">
                {[
                  { value: 1, label: 'None' },
                  { value: 2, label: 'Grade 1-2' },
                  { value: 3, label: 'Grade 3-4' }
                ].map(opt => (
                  <button 
                    key={opt.value} 
                    onClick={() => setLiver({...liver, encephalopathy: opt.value})}
                    className={`flex-1 p-3 rounded-xl border-2 text-[10px] font-black transition-all ${liver.encephalopathy === opt.value ? 'border-orange-600 bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ScoreCard>

        {/* Anthropometry */}
        <ScoreCard title="Anthropometry" subtitle="Body Measurements" icon={<Ruler size={20} />} color="emerald">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">Weight (kg)</label>
                <input 
                  type="number" 
                  value={anthro.weight} 
                  onChange={e => setAnthro({...anthro, weight: e.target.value === '' ? '' : Number(e.target.value)})}
                  className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-400 transition-all"
                  placeholder="e.g. 70"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">Height (cm)</label>
                <input 
                  type="number" 
                  value={anthro.height} 
                  onChange={e => setAnthro({...anthro, height: e.target.value === '' ? '' : Number(e.target.value)})}
                  className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-400 transition-all"
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
                  className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-400 transition-all"
                  placeholder="e.g. 90"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">Hip (cm)</label>
                <input 
                  type="number" 
                  value={anthro.hip} 
                  onChange={e => setAnthro({...anthro, hip: e.target.value === '' ? '' : Number(e.target.value)})}
                  className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-400 transition-all"
                  placeholder="e.g. 100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bmi && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">BMI (kg/m²)</p>
                  <p className="text-lg font-black text-emerald-900">{bmi}</p>
                  <p className="text-[9px] font-bold text-emerald-500 mt-1">
                    {Number(bmi) < 18.5 ? 'Underweight' : Number(bmi) < 25 ? 'Normal' : Number(bmi) < 30 ? 'Overweight' : 'Obese'}
                  </p>
                </div>
              )}
              {whr && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Waist-to-Hip Ratio</p>
                  <p className="text-lg font-black text-emerald-900">{whr}</p>
                  <p className="text-[9px] font-bold text-emerald-500 mt-1">
                    {Number(whr) > 0.9 ? 'Increased risk' : 'Healthy ratio'}
                  </p>
                </div>
              )}
            </div>

            {anthro.height && anthro.waist && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Waist-to-Height Ratio</p>
                <p className="text-lg font-black text-emerald-900">{(Number(anthro.waist) / Number(anthro.height)).toFixed(2)}</p>
                <p className="text-[9px] font-bold text-emerald-500 mt-1">
                  {(Number(anthro.waist) / Number(anthro.height)) > 0.5 ? 'Increased cardiometabolic risk' : 'Healthy ratio'}
                </p>
              </div>
            )}
          </div>
        </ScoreCard>
      </div>
    </div>
  );
};

export default PhysicalExam;
