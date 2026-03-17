import React, { useState, useEffect } from 'react';
import { 
  Activity, Brain, Wind, Stethoscope, Loader2, ShieldCheck, Moon, Sun, Calculator, AlertCircle, Eye, Zap
} from 'lucide-react';
import { GCSState, SIRSState, QSOFAState, MEWSState, LiverState, ExamState, SurgicalState, PatientData } from './types';
import { BOTTOM_NAV_SECTIONS } from './constants';
import ScoreCard from './components/ScoreCard';
import CombinedCalculators from './components/CombinedCalculators';
import { clinicalAI, SynthesisResult } from './services/clinicalAI';
import { ScoringEngine } from './services/scoringEngine';
import { useLocalStorage } from './hooks/useLocalStorage';
import TaskList from './components/TaskList';
import ScoreSummaryPanel from './components/ScoreSummaryPanel';

const getPlatform = (): 'ios' | 'android' => {
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'android'; 
};

const App: React.FC = () => {
  const [platform, setPlatform] = useState<'ios' | 'android'>('android');
  const [isSplashing, setIsSplashing] = useState(true);
  const [activeTab, setActiveTab] = useState('calculators');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiInsight, setAiInsight] = useState<SynthesisResult | null>(null);
  const [consultTab, setConsultTab] = useState<'summary' | 'actions' | 'diagnostics' | 'education' | 'documentation'>('summary');

  // --- UI MODES ---
  const [isNightMode, setIsNightMode] = useLocalStorage('ai-medica-night-mode', false);
  const [isEyeComfort, setIsEyeComfort] = useLocalStorage('ai-medica-eye-comfort', false);

  // --- COMPREHENSIVE STATE (PERSISTED) ---
  const [gcs, setGcs] = useLocalStorage<GCSState>('ai-medica-gcs', { eye: 4, verbal: 5, motor: 6 });
  const [sirs, setSirs] = useLocalStorage<SIRSState>('ai-medica-sirs', { temp: 37, heartRate: 80, respRate: 16, wbc: 8, bands: '' });
  const [qsofa, setQsofa] = useLocalStorage<QSOFAState>('ai-medica-qsofa', { lowBP: false, highRR: false, alteredMentation: false });
  const [mews, setMews] = useLocalStorage<MEWSState>('ai-medica-mews', { sbp: 120, hr: 80, rr: 16, temp: 37, avpu: 0 });
  const [liver, setLiver] = useLocalStorage<LiverState>('ai-medica-liver', { bilirubin: '', albumin: '', inr: '', creatinine: '', sodium: '', ascites: 1, encephalopathy: 1, dialysis: false });
  const [exam, setExam] = useLocalStorage<ExamState>('ai-medica-exam', { jvp: '', capRefill: '', skinTurgor: 'Normal', mucosa: 'Moist', pulseGrade: 2, muscleStrength: 5 });
  const [surgery, setSurgery] = useLocalStorage<SurgicalState>('ai-medica-surgery', { asa: 1, age: '', preOpSpO2: '', respInfection: false, preOpAnemia: false, surgeryType: 'Peripheral', duration: '<2h' });
  const [curb65, setCurb65] = useLocalStorage('ai-medica-curb65', { confusion: false, urea: false, rr: false, bp: false, age: false });
  const [wellsPE, setWellsPE] = useLocalStorage('ai-medica-wells-pe', { dvtSymptoms: false, peLikely: false, hr100: false, immobilization: false, priorDvtPe: false, hemoptysis: false, malignancy: false });
  const [chads, setChads] = useLocalStorage('ai-medica-chads', { chf: false, htn: false, age75: false, dm: false, stroke: false, vascular: false, age65: false, female: false });
  const [anthro, setAnthro] = useLocalStorage<{ waist: number | ''; height: number | ''; }>('ai-medica-anthro', { waist: '', height: '' });
  const [notes, setNotes] = useLocalStorage('ai-medica-notes', '');

  // --- VALIDATION HELPERS ---
  const validateRange = (val: number | '', min: number, max: number) => {
    if (val === '') return true;
    return val >= min && val <= max;
  };

  // --- PLATFORM & UI EFFECTS ---
  useEffect(() => {
    const detectedPlatform = getPlatform();
    setPlatform(detectedPlatform);
    document.body.classList.add(detectedPlatform);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('eye-comfort', isEyeComfort);
    document.body.classList.toggle('night-mode', isNightMode);
  }, [isEyeComfort, isNightMode]);

  // --- BACKGROUND ANIMATION ---
  useEffect(() => {
    const canvas = document.getElementById('dna-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationFrameId: number;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    const chars = "ACTG01".split("");
    const baseSpeed = 0.025;
    let time = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      time += baseSpeed;
      const centerX = width / 2;
      const step = 18;
      for (let y = 0; y < height; y += step) {
        const freq = 0.015;
        const loopVariance = 1.2 + Math.sin(time * 0.4 + y * 0.003) * 0.6;
        const maxGap = 200 * loopVariance;
        const strands = [
          { phase: 0, color: 'rgba(217, 0, 0, opacity)'},
          { phase: (2 * Math.PI) / 3, color: 'rgba(200, 200, 200, opacity)'},
          { phase: (4 * Math.PI) / 3, color: 'rgba(100, 200, 220, opacity)'}
        ];
        strands.forEach((s, idx) => {
          const angle = time + y * freq + s.phase;
          const x = centerX + Math.sin(angle) * maxGap;
          const depth = Math.cos(angle); 
          const alpha = 0.15 + (depth + 1) * 0.15;
          const fontSize = 8 + (depth + 1) * 4;
          ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
          ctx.fillStyle = s.color.replace('opacity', alpha.toString());
          ctx.fillText(chars[(Math.floor(time * 10) + idx + Math.floor(y/step)) % chars.length], x, y);
        });
      }
      animationFrameId = requestAnimationFrame(render);
    };
    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);
    render();
    return () => { cancelAnimationFrame(animationFrameId); window.removeEventListener('resize', handleResize); };
  }, []);

  const handleConsult = async () => {
    setIsGenerating(true);
    setAiInsight(null);
    const fullData: PatientData = { gcs, sirs, qsofa, mews, liver, exam, surgery, curb65, anthro, notes, wellsPE, chads } as any;
    
    setTimeout(() => {
      const result = clinicalAI.synthesize(fullData);
      setAiInsight(result);
      setIsGenerating(false);
    }, 1500);
  };
  
  useEffect(() => {
    if (activeTab === 'summary' && !aiInsight && !isGenerating) {
      handleConsult();
    }
  }, [activeTab]);


  useEffect(() => {
    const timer = setTimeout(() => setIsSplashing(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (isSplashing) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white">
        <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center shadow-2xl mb-5 animate-pulse-beat">
          <Activity className="text-white" size={40} />
        </div>
        <h1 className="text-3xl font-black tracking-tighter text-slate-900">
            AI <span className="text-red-600">MEDICA</span>
        </h1>
        <p className="text-xs font-bold text-slate-400 mt-1.5 uppercase tracking-widest">Clinical Intelligence</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'calculators':
        return (
          <div className="space-y-6">
            <ScoreSummaryPanel gcs={gcs} mews={mews} sirs={sirs} qsofa={qsofa} curb65={curb65} />
            <CombinedCalculators gcs={gcs} setGcs={setGcs} mews={mews} setMews={setMews} sirs={sirs} setSirs={setSirs} />
          </div>
        );
      case 'vitals':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ScoreCard title="CURB-65" subtitle="Pneumonia Severity" icon={<Wind size={20} />} score={ScoringEngine.calculateCURB65(curb65)}>
              <div className="space-y-3">
                {Object.entries({ confusion: 'Confusion', urea: 'Urea > 7', rr: 'RR ≥ 30', bp: 'BP < 90/60', age: 'Age ≥ 65' }).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 cursor-pointer hover:bg-slate-100 transition-all border border-slate-100">
                    <span className="font-bold text-slate-800 text-sm">{label}</span>
                    <input type="checkbox" checked={curb65[key as keyof typeof curb65]} onChange={e => setCurb65({...curb65, [key]: e.target.checked})} className="h-5 w-5 rounded border-slate-300 text-red-600 focus:ring-red-500" />
                  </label>
                ))}
              </div>
            </ScoreCard>
            <ScoreCard title="qSOFA" subtitle="Quick Sepsis Organ Failure" icon={<Zap size={20}/>} score={ScoringEngine.calculateQSOFA(qsofa)}>
                <div className="space-y-3">
                    <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 cursor-pointer hover:bg-slate-100 transition-all border border-slate-100">
                        <span className="font-bold text-slate-800 text-sm">SBP ≤ 100 mmHg</span>
                        <input type="checkbox" checked={qsofa.lowBP} onChange={e => setQsofa({...qsofa, lowBP: e.target.checked})} className="h-5 w-5 rounded border-slate-300 text-red-600 focus:ring-red-500" />
                    </label>
                    <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 cursor-pointer hover:bg-slate-100 transition-all border border-slate-100">
                        <span className="font-bold text-slate-800 text-sm">Resp Rate ≥ 22/min</span>
                        <input type="checkbox" checked={qsofa.highRR} onChange={e => setQsofa({...qsofa, highRR: e.target.checked})} className="h-5 w-5 rounded border-slate-300 text-red-600 focus:ring-red-500" />
                    </label>
                    <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 cursor-pointer hover:bg-slate-100 transition-all border border-slate-100">
                        <span className="font-bold text-slate-800 text-sm">Altered Mentation (GCS {"<"} 15)</span>
                        <input type="checkbox" checked={qsofa.alteredMentation} onChange={e => setQsofa({...qsofa, alteredMentation: e.target.checked})} className="h-5 w-5 rounded border-slate-300 text-red-600 focus:ring-red-500" />
                    </label>
                </div>
            </ScoreCard>
            <ScoreCard title="Wells PE" subtitle="Pulmonary Embolism" icon={<Wind size={20}/>} score={ScoringEngine.calculateWellsPE(wellsPE)} color="blue">
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
                        <label key={key} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 cursor-pointer hover:bg-slate-100 transition-all border border-slate-100">
                            <span className="font-bold text-slate-800 text-[11px]">{label}</span>
                            <input type="checkbox" checked={wellsPE[key as keyof typeof wellsPE]} onChange={e => setWellsPE({...wellsPE, [key]: e.target.checked})} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        </label>
                    ))}
                </div>
            </ScoreCard>
            <ScoreCard title="CHA₂DS₂-VASc" subtitle="Stroke Risk in AF" icon={<Activity size={20}/>} score={ScoringEngine.calculateCHADS2VASc(chads)} color="emerald">
                <div className="space-y-2">
                    {Object.entries({ 
                        chf: 'CHF/LVD (1)', 
                        htn: 'Hypertension (1)', 
                        age75: 'Age ≥ 75 (2)',
                        dm: 'Diabetes (1)',
                        stroke: 'Stroke/TIA/TE (2)',
                        vascular: 'Vascular Disease (1)',
                        age65: 'Age 65-74 (1)',
                        female: 'Female Sex (1)'
                    }).map(([key, label]) => (
                        <label key={key} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 cursor-pointer hover:bg-slate-100 transition-all border border-slate-100">
                            <span className="font-bold text-slate-800 text-[11px]">{label}</span>
                            <input type="checkbox" checked={chads[key as keyof typeof chads]} onChange={e => setChads({...chads, [key]: e.target.checked})} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                        </label>
                    ))}
                </div>
            </ScoreCard>
          </div>
        );
      case 'exam': return <div className="text-center p-10 material-card rounded-2xl"><h2 className="font-bold">Physical Exam Section Coming Soon</h2></div>;
      case 'tasks': return <TaskList />;
      case 'summary':
        return (
            <div className="space-y-4">
              <div className="material-card rounded-2xl p-6 min-h-[60vh] relative overflow-hidden">
                 {isGenerating ? (
                   <div className="flex flex-col items-center justify-center h-full py-20 space-y-6">
                      <div className="relative">
                         <div className="w-16 h-16 rounded-full border-4 border-slate-200 border-t-red-600 animate-spin"></div>
                         <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-900" size={28} />
                      </div>
                      <div className="text-center">
                         <p className="text-xl font-black text-slate-900 tracking-tight">Synthesizing Evidence</p>
                         <p className="text-slate-500 animate-pulse mt-1 font-bold uppercase text-[9px] tracking-[0.2em]">Ai Medica Engine Active</p>
                      </div>
                   </div>
                 ) : aiInsight ? (
                   <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
                         <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5 m-0">
                            <Stethoscope className="text-red-600" size={24} /> Clinical Synthesis
                         </h2>
                         <button onClick={handleConsult} className="text-xs font-bold text-slate-500 hover:text-red-600 transition-all">Regenerate</button>
                      </div>
                      
                      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                        {[
                          { id: 'summary', label: 'Summary' },
                          { id: 'actions', label: 'Actions' },
                          { id: 'diagnostics', label: 'Workup' },
                          { id: 'education', label: 'Education' },
                          { id: 'documentation', label: 'Notes' }
                        ].map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => setConsultTab(tab.id as any)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-full whitespace-nowrap transition-all ${
                              consultTab === tab.id 
                                ? 'bg-slate-900 text-white' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      <div className="clinical-text text-slate-200 whitespace-pre-wrap leading-relaxed text-sm flex-1 overflow-y-auto custom-scrollbar">
                         {consultTab === 'summary' && (
                           <div className="p-5 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
                             <p className="font-medium tracking-tight">{aiInsight.summary}</p>
                           </div>
                         )}
                         {consultTab === 'actions' && (
                           <ul className="space-y-3">
                             {aiInsight.actions.map((action, i) => (
                               <li key={i} className="flex items-start gap-4 p-4 bg-red-500/10 text-red-200 rounded-2xl border border-red-500/20 group">
                                 <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.6)] group-hover:scale-125 transition-transform" />
                                 <span className="font-bold tracking-tight">{action}</span>
                               </li>
                             ))}
                             {aiInsight.actions.length === 0 && <p className="text-slate-500 italic p-6 text-center uppercase tracking-widest text-[10px]">No immediate actions required</p>}
                           </ul>
                         )}
                         {consultTab === 'diagnostics' && (
                           <ul className="space-y-3">
                             {aiInsight.diagnostics.map((diag, i) => (
                               <li key={i} className="flex items-start gap-4 p-4 bg-blue-500/10 text-blue-200 rounded-2xl border border-blue-500/20 group">
                                 <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.6)] group-hover:scale-125 transition-transform" />
                                 <span className="font-bold tracking-tight">{diag}</span>
                               </li>
                             ))}
                             {aiInsight.diagnostics.length === 0 && <p className="text-slate-500 italic p-6 text-center uppercase tracking-widest text-[10px]">No specific diagnostics recommended</p>}
                           </ul>
                         )}
                         {consultTab === 'education' && (
                           <ul className="space-y-3">
                             {aiInsight.education.map((edu, i) => (
                               <li key={i} className="flex items-start gap-4 p-4 bg-emerald-500/10 text-emerald-200 rounded-2xl border border-emerald-500/20 group">
                                 <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.6)] group-hover:scale-125 transition-transform" />
                                 <span className="font-bold tracking-tight">{edu}</span>
                               </li>
                             ))}
                             {aiInsight.education.length === 0 && <p className="text-slate-500 italic p-6 text-center uppercase tracking-widest text-[10px]">No specific education points</p>}
                           </ul>
                         )}
                         {consultTab === 'documentation' && (
                           <div className="p-5 bg-black/40 text-slate-300 rounded-2xl font-mono text-[11px] border border-white/5 leading-relaxed">
                             {aiInsight.documentation}
                           </div>
                         )}
                      </div>
                   </div>
                 ) : (
                   <div className="flex flex-col items-center justify-center h-full text-center">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">No Data for Analysis</h3>
                      <p className="text-slate-500 max-w-xs mt-2 text-sm">Please fill out scoring tools to generate a clinical summary.</p>
                   </div>
                 )}
              </div>
              <div className="material-card p-4 rounded-2xl">
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="Add case notes here..." 
                  className="w-full h-24 bg-slate-100/60 border-2 border-slate-200 rounded-xl p-3 text-slate-900 outline-none focus:ring-2 ring-red-400 transition-all font-semibold text-sm"
                />
              </div>
            </div>
        );
      default: return null;
    }
  };

  return (
    <div className={platform}>
      <header className="app-header sticky top-0 z-40 bg-white" style={{ paddingTop: 'var(--safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative flex justify-between items-center h-16">
            <div className="flex items-center gap-2 header-title-container">
              {platform === 'android' && 
                <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
                  <Activity className="text-white" size={18} />
                </div>
              }
              <h1 className="header-title text-slate-900">
                {platform === 'ios' ? 'AI Medica' : <>Ai Medica <span className="text-red-600">UG</span></>}
              </h1>
            </div>
            <div className="flex items-center gap-2 header-actions">
              <button onClick={() => setIsNightMode(!isNightMode)} className="p-2 rounded-full hover:bg-slate-200/80 transition-all text-slate-600">
                {isNightMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button onClick={() => setIsEyeComfort(!isEyeComfort)} className={`p-2 rounded-full transition-all ${isEyeComfort ? 'bg-orange-100 text-orange-600' : 'text-slate-600 hover:bg-slate-200/80'}`}>
                <ShieldCheck size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 pb-28">
        {renderContent()}
      </main>

      <nav className="bottom-nav">
        <div className="flex justify-around items-center h-16 max-w-7xl mx-auto">
          {BOTTOM_NAV_SECTIONS.map((s) => (
            <button key={s.id} onClick={() => setActiveTab(s.id)} className={`bottom-nav-button flex flex-col items-center justify-center gap-1 w-full h-full transition-all ${activeTab === s.id ? 'active text-red-600' : 'text-slate-500 hover:bg-slate-100/50'}`}>
              {s.icon}
              <span className="font-bold">{s.name}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default App;
