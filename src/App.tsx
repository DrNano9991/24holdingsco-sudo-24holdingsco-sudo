import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { 
  Activity, Brain, Wind, Stethoscope, ShieldCheck, Moon, Sun, Calculator, AlertCircle, Eye, Zap,
  Volume2, VolumeX, Info, X, Languages
} from 'lucide-react';
import { GCSState, SIRSState, QSOFAState, MEWSState, LiverState, ExamState, SurgicalState, PatientData, SavedPatient, Task } from './types';
import { BOTTOM_NAV_SECTIONS } from './constants';
import ScoreCard from './components/ScoreCard';
import MedicalBackground from './components/MedicalBackground';
import { clinicalAI, SynthesisResult, SynthesisOptions } from './services/clinicalAI';
import { ScoringEngine } from './services/scoringEngine';
import { useLocalStorage } from './hooks/useLocalStorage';
import ScoreSummaryPanel from './components/ScoreSummaryPanel';
import { AgeGroup, PEWSState } from './types';
import { Save, FolderOpen, Trash2, UserPlus, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useTranslation } from './contexts/TranslationContext';
import { logger } from './services/logger';

import ReactMarkdown from 'react-markdown';
import Screensaver from './components/Screensaver';
import { speechService } from './services/speechService';

// Lazy loaded components
const CombinedCalculators = lazy(() => import('./components/CombinedCalculators'));
const PhysicalExam = lazy(() => import('./components/PhysicalExam'));
const TaskList = lazy(() => import('./components/TaskList'));

const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center py-20 animate-pulse">
    <div className="w-12 h-12 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Clinical Module...</p>
  </div>
);

const getPlatform = (): 'ios' | 'android' => {
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'android'; 
};

const App: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();
  const [platform, setPlatform] = useState<'ios' | 'android'>('android');
  const [isSplashing, setIsSplashing] = useState(true);
  const [activeTab, setActiveTab] = useState('calculators');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiInsight, setAiInsight] = useState<SynthesisResult | null>(null);
  const [synthesisOptions, setSynthesisOptions] = useState<SynthesisOptions>({
    depth: 'standard',
    focus: 'diagnostic',
    includeHandover: true
  });
  const [consultTab, setConsultTab] = useState<'summary' | 'actions' | 'diagnostics' | 'education' | 'documentation'>('summary');

  // --- INACTIVITY LOGIC ---
  const [isInactive, setIsInactive] = useState(false);
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

  const resetInactivityTimer = () => {
    setIsInactive(false);
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      setIsInactive(true);
    }, 120000); // 2 minutes
  };

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetInactivityTimer));
    resetInactivityTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, resetInactivityTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, []);

  // --- UI MODES ---
  const [isNightMode, setIsNightMode] = useLocalStorage('ai-medica-night-mode', false);
  const [isEyeComfort, setIsEyeComfort] = useLocalStorage('ai-medica-eye-comfort', false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useLocalStorage('ai-medica-speech-enabled', true);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
  const [pews, setPews] = useLocalStorage<PEWSState>('ai-medica-pews', { behavior: 0, cardiovascular: 0, respiratory: 0, nebulizer: false, persistentVomiting: false });
  const [ageGroup, setAgeGroup] = useLocalStorage<AgeGroup>('ai-medica-age-group', 'Adult');
  const [anthro, setAnthro] = useLocalStorage<{ waist: number | ''; height: number | ''; hip: number | ''; weight: number | ''; }>('ai-medica-anthro', { waist: '', height: '', hip: '', weight: '' });
  const [notes, setNotes] = useLocalStorage('ai-medica-notes', '');

  // --- SAVED PATIENTS ---
  const [savedPatients, setSavedPatients] = useLocalStorage<SavedPatient[]>('ai-medica-saved-patients', []);
  const [tasks, setTasks] = useLocalStorage<Task[]>('ai-medica-tasks', []);
  const [patientName, setPatientName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  // --- PLATFORM & UI EFFECTS ---
  useEffect(() => {
    const detectedPlatform = getPlatform();
    setPlatform(detectedPlatform);
    document.body.classList.add(detectedPlatform);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('eye-comfort', isEyeComfort);
    document.body.classList.toggle('night-mode', isNightMode);
    document.documentElement.classList.toggle('dark', isNightMode);
    
    // Notify on mode change if it was a user action (not initial load)
    // We can use a ref to skip initial load if needed, but simple is fine for now
  }, [isEyeComfort, isNightMode]);

  const toggleNightMode = () => {
    const next = !isNightMode;
    setIsNightMode(next);
    speechService.notifyChange('Display Mode', `Night mode ${next ? 'enabled' : 'disabled'}.`);
  };

  const toggleEyeComfort = () => {
    const next = !isEyeComfort;
    setIsEyeComfort(next);
    speechService.notifyChange('Display Mode', `Eye comfort filter ${next ? 'activated' : 'deactivated'}.`);
  };

  const handleAgeGroupChange = (group: AgeGroup) => {
    setAgeGroup(group);
    speechService.notifyChange('Patient Classification', `Patient type changed to ${group}.`);
  };

  useEffect(() => {
    speechService.setEnabled(isSpeechEnabled);
  }, [isSpeechEnabled]);

  const aboutText = `This app is a product of Competence based learning and co-curricular activities of King Ceasor University School of Medicine developed by Arinda Andrew Besigye MBChB 3.1. I have been inspired by The King's (King Ceasor The Great) visualization and whole perception of Technology. With Commentary advisory from His Classmates. Clinical Disclaimer: This tool is only a clinical scoring calculator. It is intended solely for aiding decision making among well-trained and licensed clinical practitioners. It does not make final interventional decision commands and should not replace professional clinical judgment.`;

  const handleAboutPress = () => {
    setShowAboutModal(true);
    if (isSpeechEnabled) {
      speechService.speak(aboutText);
    }
  };

  const closeAboutModal = () => {
    setShowAboutModal(false);
    speechService.stop();
  };

  const handleConsult = async () => {
    setIsGenerating(true);
    setAiInsight(null);
    
    const mewsScore = ScoringEngine.calculateMEWS(mews);
    const gcsScore = ScoringEngine.calculateGCS(gcs);
    const sirsScore = ScoringEngine.calculateSIRS(sirs);
    const qsofaScore = ScoringEngine.calculateQSOFA(qsofa);
    const pewsScore = ScoringEngine.calculatePEWS(pews);
    
    let primaryType = 'MEWS';
    let primaryValue = mewsScore;
    let components: any = mews;

    if (ageGroup !== 'Adult') {
      primaryType = 'PEWS';
      primaryValue = pewsScore;
      components = pews;
    } else if (gcsScore < 15) {
      primaryType = 'GCS';
      primaryValue = gcsScore;
      components = gcs;
    } else if (qsofaScore >= 2) {
      primaryType = 'qSOFA';
      primaryValue = qsofaScore;
      components = qsofa;
    } else if (sirsScore >= 2) {
      primaryType = 'SIRS';
      primaryValue = sirsScore;
      components = sirs;
    }

    const patientContext = {
      notes,
      ageGroup,
      comorbidities: '',
      medications: '',
      exam,
      liver,
      anthro,
      surgery
    };
    
    try {
      const result = await clinicalAI.synthesize(primaryType, primaryValue, components, patientContext, synthesisOptions);
      setAiInsight(result);
      if (isSpeechEnabled && result.summary) {
        speechService.speak(result.summary);
      }
      logger.info('Clinical synthesis completed', { primaryType, primaryValue });
    } catch (e) {
      logger.error('Clinical synthesis failed', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const savePatient = () => {
    if (!patientName) return;
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const serialNumber = `MED-${dateStr}-${randomId}`;
    
    const newPatient: SavedPatient = {
      id: Date.now().toString(),
      serialNumber,
      name: patientName,
      date: now.toISOString(),
      ageGroup,
      data: {
        ageGroup, gcs, mews, sirs, qsofa, pews, notes,
        liver, exam, surgery, curb65, wellsPE, chads, anthro
      } as any,
      aiInsight: aiInsight
    };
    
    // Create tasks from AI insights
    const newTasks: Task[] = [];
    if (aiInsight) {
      if (aiInsight.actions) {
        aiInsight.actions.forEach((action: string) => {
          newTasks.push({
            id: `task-${Date.now()}-${Math.random()}`,
            text: `Action: ${action}`,
            completed: false,
            priority: 'medium',
            patientId: newPatient.id,
            patientName: newPatient.name,
            createdAt: now.toISOString()
          });
        });
      }
      if (aiInsight.diagnostics) {
        aiInsight.diagnostics.forEach((diag: string) => {
          newTasks.push({
            id: `task-${Date.now()}-${Math.random()}`,
            text: `Investigation: ${diag}`,
            completed: false,
            priority: 'high',
            patientId: newPatient.id,
            patientName: newPatient.name,
            createdAt: now.toISOString()
          });
        });
      }
    }

    setSavedPatients([newPatient, ...savedPatients]);
    setTasks([...newTasks, ...tasks]);
    setPatientName('');
    setShowSaveModal(false);
    
    const speechMsg = `Patient ${newPatient.name} has been successfully registered with serial number ${serialNumber.split('').join(' ')}. ${newTasks.length} clinical tasks have been added to your list based on AI recommendations.`;
    speechService.notifyChange('Patient Registration', speechMsg);
  };

  const loadPatient = (p: SavedPatient) => {
    setAgeGroup(p.ageGroup);
    setGcs(p.data.gcs);
    setMews(p.data.mews);
    setSirs(p.data.sirs);
    setQsofa(p.data.qsofa);
    setPews(p.data.pews);
    setNotes(p.data.notes);
    // Load others if needed
    setActiveTab('calculators');
    speechService.notifyChange('Database Access', `Loading clinical data for patient ${p.name}.`);
  };

  const deletePatient = (id: string) => {
    const patient = savedPatients.find(p => p.id === id);
    if (patient) {
      speechService.notifyChange('Database Update', `Patient record for ${patient.name} has been removed.`);
    }
    setSavedPatients(savedPatients.filter(p => p.id !== id));
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

  // --- PERIODIC CLINICAL UPDATES ---
  useEffect(() => {
    if (isSplashing) return;

    const speakUpdate = () => {
      if (!isSpeechEnabled) return;

      const now = new Date();
      const hour = now.getHours();
      let greeting = "Good morning";
      if (hour >= 12 && hour < 17) greeting = "Good afternoon";
      if (hour >= 17) greeting = "Good evening";

      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Get tasks from localStorage
      const storedTasks = localStorage.getItem('ai-medica-tasks');
      const tasks = storedTasks ? JSON.parse(storedTasks) : [];
      const ongoing = tasks.filter((t: any) => !t.completed).length;
      const completed = tasks.filter((t: any) => t.completed).length;

      let taskStatus = "";
      if (tasks.length > 0) {
        taskStatus = ` You have ${ongoing} ongoing clinical tasks and ${completed} completed tasks in your list.`;
      } else {
        taskStatus = " Your task list is currently empty.";
      }

      const message = `${greeting}. The current time is ${timeStr}.${taskStatus} How can I assist you with your clinical rounds today?`;
      speechService.speak(message);
    };

    // Speak once after splash
    const initialTimer = setTimeout(speakUpdate, 2000);

    // Then every 15 minutes
    const interval = setInterval(speakUpdate, 15 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [isSplashing, isSpeechEnabled]);

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
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-600 rounded-lg">
                  <Activity className="text-white" size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{t('patientClassification')}</p>
                  <p className="text-lg font-black text-slate-900">{t(ageGroup.toLowerCase() as any)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {(['Adult', 'Pediatric', 'Neonate'] as const).map((group) => (
                  <button
                    key={group}
                    onClick={() => handleAgeGroupChange(group)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      ageGroup === group 
                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t(group.toLowerCase() as any)}
                  </button>
                ))}
              </div>
            </div>

            <ScoreSummaryPanel gcs={gcs} mews={mews} sirs={sirs} qsofa={qsofa} curb65={curb65} pews={pews} surgery={surgery} anthro={anthro} />
            
            <CombinedCalculators 
              ageGroup={ageGroup}
              gcs={gcs} setGcs={setGcs} 
              mews={mews} setMews={setMews} 
              sirs={sirs} setSirs={setSirs}
              qsofa={qsofa} setQsofa={setQsofa}
              pews={pews} setPews={setPews}
              surgery={surgery} setSurgery={setSurgery}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ScoreCard title="CHA₂DS₂-VASc" subtitle="Stroke Risk in AF" icon={<ShieldCheck size={20} />} score={ScoringEngine.calculateCHADS2VASc(chads)} color="emerald">
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
                    <label key={item.key} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all border border-slate-200">
                      <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">{item.label}</span>
                      <input 
                        type="checkbox" 
                        checked={chads[item.key as keyof typeof chads]} 
                        onChange={e => setChads({...chads, [item.key]: e.target.checked})} 
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 bg-white" 
                      />
                    </label>
                  ))}
                </div>
              </ScoreCard>

              <ScoreCard title="CURB-65" subtitle="Pneumonia Severity" icon={<Wind size={20} />} score={ScoringEngine.calculateCURB65(curb65)}>
                <div className="space-y-3">
                  {Object.entries({ confusion: 'Confusion', urea: 'Urea > 7', rr: 'RR ≥ 30', bp: 'BP < 90/60', age: 'Age ≥ 65' }).map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all border border-slate-200">
                      <span className="font-bold text-slate-700 text-sm">{label}</span>
                      <input type="checkbox" checked={curb65[key as keyof typeof curb65]} onChange={e => setCurb65({...curb65, [key]: e.target.checked})} className="h-5 w-5 rounded border-slate-300 text-red-600 focus:ring-red-500 bg-white" />
                    </label>
                  ))}
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
                          <label key={key} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all border border-slate-200">
                              <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">{label}</span>
                              <input type="checkbox" checked={wellsPE[key as keyof typeof wellsPE]} onChange={e => setWellsPE({...wellsPE, [key]: e.target.checked})} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white" />
                          </label>
                      ))}
                  </div>
              </ScoreCard>
            </div>
          </div>
        );
      case 'exam':
        return (
          <PhysicalExam 
            exam={exam} setExam={setExam}
            liver={liver} setLiver={setLiver}
            anthro={anthro} setAnthro={setAnthro}
          />
        );
      case 'patients':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <FolderOpen className="text-red-600" /> {t('savedPatients')}
              </h2>
              <button onClick={() => setActiveTab('calculators')} className="p-3 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition-all">
                <UserPlus size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedPatients.map(p => (
                <div key={p.id} className="material-card p-5 rounded-3xl border border-slate-200 hover:border-red-200 transition-all group bg-white">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{p.name}</h3>
                      <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">{p.serialNumber}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{new Date(p.date).toLocaleString()}</p>
                    </div>
                    <span className="px-2 py-1 bg-red-50 text-red-600 text-[9px] font-black rounded-lg uppercase border border-red-100">{t(p.ageGroup.toLowerCase() as any)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => loadPatient(p)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-black rounded-xl transition-all"
                    >
                      {t('loadData')}
                    </button>
                    <button 
                      onClick={() => deletePatient(p.id)}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {savedPatients.length === 0 && (
                <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <FolderOpen size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 font-bold">{t('noSavedPatients')}</p>
                </div>
              )}
            </div>
          </div>
        );
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
                         <p className="text-xl font-black text-slate-900 tracking-tight">{t('synthesizing')}</p>
                         <p className="text-slate-500 animate-pulse mt-1 font-bold uppercase text-[9px] tracking-[0.2em]">{t('engineActive')}</p>
                      </div>
                   </div>
                 ) : aiInsight ? (
                   <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
                         <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5 m-0">
                            <Stethoscope className="text-red-600" size={24} /> {t('clinicalSynthesis')}
                            {aiInsight.riskLevel && (
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                aiInsight.riskLevel === 'Critical' ? 'bg-red-600 text-white animate-pulse' :
                                aiInsight.riskLevel === 'High' ? 'bg-red-100 text-red-600' :
                                aiInsight.riskLevel === 'Moderate' ? 'bg-orange-100 text-orange-600' :
                                'bg-emerald-100 text-emerald-600'
                              }`}>
                                {aiInsight.riskLevel} {t('riskLevel')}
                              </span>
                            )}
                         </h2>
                         <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                               {(['diagnostic', 'therapeutic', 'educational'] as const).map(f => (
                                 <button
                                   key={f}
                                   onClick={() => setSynthesisOptions({ ...synthesisOptions, focus: f })}
                                   className={`px-2 py-1 text-[8px] font-black uppercase tracking-tighter rounded-md transition-all ${synthesisOptions.focus === f ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                 >
                                   {f}
                                 </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                               {(['concise', 'standard', 'detailed'] as const).map(d => (
                                 <button
                                   key={d}
                                   onClick={() => setSynthesisOptions({ ...synthesisOptions, depth: d })}
                                   className={`px-2 py-1 text-[8px] font-black uppercase tracking-tighter rounded-md transition-all ${synthesisOptions.depth === d ? 'bg-white shadow-sm text-red-600' : 'text-slate-400 hover:text-slate-600'}`}
                                 >
                                   {d}
                                 </button>
                                ))}
                            </div>
                            <button onClick={handleConsult} className="text-xs font-bold text-slate-500 hover:text-red-600 transition-all">{t('regenerate')}</button>
                         </div>
                      </div>
                      
                      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                        {[
                          { id: 'summary', label: t('summary') },
                          { id: 'actions', label: t('actions') },
                          { id: 'diagnostics', label: t('workup') },
                          { id: 'education', label: t('education') },
                          { id: 'documentation', label: t('documentation') }
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

                      <div className="clinical-text text-slate-700 whitespace-pre-wrap leading-relaxed text-sm flex-1 overflow-y-auto custom-scrollbar">
                         {consultTab === 'summary' && (
                           <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner prose prose-sm max-w-none prose-slate">
                             <ReactMarkdown>{aiInsight.summary}</ReactMarkdown>
                           </div>
                         )}
                         {consultTab === 'actions' && (
                           <ul className="space-y-3">
                             {aiInsight.actions.map((action, i) => (
                               <li key={i} className="flex items-start gap-4 p-4 bg-red-500/10 text-red-900 rounded-2xl border border-red-500/20 group">
                                 <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.6)] group-hover:scale-125 transition-transform" />
                                 <span className="font-bold tracking-tight">{action}</span>
                               </li>
                             ))}
                             {aiInsight.actions.length === 0 && <p className="text-slate-500 italic p-6 text-center uppercase tracking-widest text-[10px]">{t('noActions')}</p>}
                           </ul>
                         )}
                         {consultTab === 'diagnostics' && (
                           <ul className="space-y-3">
                             {aiInsight.diagnostics.map((diag, i) => (
                               <li key={i} className="flex items-start gap-4 p-4 bg-blue-500/10 text-blue-900 rounded-2xl border border-blue-500/20 group">
                                 <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.6)] group-hover:scale-125 transition-transform" />
                                 <span className="font-bold tracking-tight">{diag}</span>
                               </li>
                             ))}
                             {aiInsight.diagnostics.length === 0 && <p className="text-slate-500 italic p-6 text-center uppercase tracking-widest text-[10px]">{t('noDiagnostics')}</p>}
                           </ul>
                         )}
                         {consultTab === 'education' && (
                           <ul className="space-y-3">
                             {aiInsight.education.map((edu, i) => (
                               <li key={i} className="flex items-start gap-4 p-4 bg-emerald-500/10 text-emerald-900 rounded-2xl border border-emerald-500/20 group">
                                 <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.6)] group-hover:scale-125 transition-transform" />
                                 <span className="font-bold tracking-tight">{edu}</span>
                               </li>
                             ))}
                             {aiInsight.education.length === 0 && <p className="text-slate-500 italic p-6 text-center uppercase tracking-widest text-[10px]">{t('noEducation')}</p>}
                           </ul>
                         )}
                         {consultTab === 'documentation' && (
                           <div className="p-5 bg-slate-900 text-slate-100 rounded-2xl font-mono text-[11px] border border-white/5 leading-relaxed">
                             {aiInsight.documentation}
                           </div>
                         )}
                      </div>
                   </div>
                 ) : (
                   <div className="flex flex-col items-center justify-center h-full text-center">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('noDataForAnalysis')}</h3>
                      <p className="text-slate-500 max-w-xs mt-2 text-sm">{t('fillScoringTools')}</p>
                   </div>
                 )}
              </div>
              <div className="material-card p-4 rounded-2xl">
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder={t('addCaseNotes')} 
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
      {isInactive && <Screensaver />}
      <MedicalBackground isEyeComfort={isEyeComfort} />
      
      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-300">
            <h3 className="text-xl font-black text-slate-900 mb-4">{t('savePatientRecord')}</h3>
            <input 
              type="text" 
              placeholder={t('enterPatientName')} 
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              className="w-full p-4 bg-slate-100 border-2 border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:border-red-500 transition-all mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowSaveModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-black rounded-2xl">{t('cancel')}</button>
              <button onClick={savePatient} className="flex-1 py-3 bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-600/20">{t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* About Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />
            <button 
              onClick={closeAboutModal}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-all"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-600/20">
                <Activity className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 leading-none">{t('appName')}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">{t('tagline')}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="prose prose-slate">
                <div className="mb-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Project Attribution</p>
                  <p className="text-xs text-slate-600 leading-relaxed italic">
                    This application is a practical expression of the Competence-Based Medical Education at King Ceasor University, where learning is defined by the ability to solve real-world health challenges. Developed by Arinda Andrew Besigye (MBChB 3.1), the tool is a tribute to the technological foresight of HM King Ceasor Augustus Mulenga, whose vision for innovation empowers students to bridge the gap between medicine and digital transformation.
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-widest">Refined through the collaborative insights and clinical peer review of the MBChB 3.1 class.</p>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-orange-600 mb-2">
                  <AlertTriangle size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Clinical Disclaimer</span>
                </div>
                <p className="text-[11px] text-orange-800 font-medium leading-relaxed">
                  This tool is designed to support, not dictate, clinical excellence. It functions strictly as a decision-support calculator for licensed practitioners. It is not an interventional authority and must always be used in conjunction with professional clinical judgment and patient-centered care.
                </p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => speechService.stop()}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all"
                >
                  {t('stopReading')}
                </button>
                <button 
                  onClick={closeAboutModal}
                  className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] transition-all"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="app-header sticky top-0 z-40 bg-white/80 backdrop-blur-md" style={{ paddingTop: 'var(--safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative flex justify-between items-center h-16">
            <div className="flex items-center gap-2 header-title-container">
              {platform === 'android' && 
                <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
                  <Activity className="text-white" size={18} />
                </div>
              }
              <h1 className="header-title text-slate-900 whitespace-nowrap">
                {platform === 'ios' ? 'AI Medica' : <>{t('appName')} <span className="text-red-600">UG</span></>}
              </h1>
            </div>

            {/* Compact Header Navigation */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200/50 mx-4 overflow-hidden">
              {[...BOTTOM_NAV_SECTIONS, { id: 'patients', name: t('records'), icon: <FolderOpen size={14} /> }].map((s) => (
                <button 
                  key={s.id} 
                  onClick={() => setActiveTab(s.id)} 
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === s.id ? 'bg-white shadow-sm text-red-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {s.icon}
                  <span className="font-bold text-[9px] uppercase tracking-wider">{s.name}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 header-actions">
              <button 
                onClick={() => setLanguage(language === 'en' ? 'sw' : 'en')}
                className="p-2 rounded-full hover:bg-slate-200/80 transition-all text-slate-600 flex items-center gap-1"
                title={t('switchLanguage')}
              >
                <Languages size={20} />
                <span className="text-[10px] font-black uppercase">{language}</span>
              </button>
              <div className={`hidden sm:flex items-center gap-2 px-3 py-1 ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-orange-500/10 border-orange-500/20'} border rounded-full`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-orange-500'} animate-pulse`} />
                <span className={`text-[9px] font-black ${isOnline ? 'text-emerald-600' : 'text-orange-600'} uppercase tracking-widest`}>
                  {isOnline ? t('cloudAiActive') : t('localAiActive')}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{t('autoSaveActive')}</span>
              </div>
              <button 
                onClick={() => setShowSaveModal(true)} 
                className="p-2 rounded-full hover:bg-slate-200/80 transition-all text-slate-600" 
                title={t('savePatient')}
              >
                <Save size={20} />
              </button>
              <button onClick={handleAboutPress} className="p-2 rounded-full hover:bg-slate-200/80 transition-all text-slate-600" title={t('about')}>
                <Info size={20} />
              </button>
              <button onClick={() => setIsSpeechEnabled(!isSpeechEnabled)} className={`p-2 rounded-full transition-all ${isSpeechEnabled ? 'text-red-600 bg-red-50' : 'text-slate-600 hover:bg-slate-200/80'}`} title={isSpeechEnabled ? t('disableSpeech') : t('enableSpeech')}>
                {isSpeechEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
              <button onClick={toggleNightMode} className="p-2 rounded-full hover:bg-slate-200/80 transition-all text-slate-600">
                {isNightMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button onClick={toggleEyeComfort} className={`p-2 rounded-full transition-all ${isEyeComfort ? 'bg-orange-100 text-orange-600' : 'text-slate-600 hover:bg-slate-200/80'}`}>
                <Eye size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {renderContent()}
      </main>

      {/* Mobile Bottom Nav - Only visible on small screens */}
      <nav className="bottom-nav lg:hidden">
        <div className="flex justify-around items-center h-16 max-w-7xl mx-auto">
          {[...BOTTOM_NAV_SECTIONS, { id: 'patients', name: t('records'), icon: <FolderOpen size={20} /> }].map((s) => (
            <button key={s.id} onClick={() => setActiveTab(s.id)} className={`bottom-nav-button flex flex-col items-center justify-center gap-1 w-full h-full transition-all ${activeTab === s.id ? 'active text-red-600' : 'text-slate-500 hover:bg-slate-100/50'}`}>
              {s.icon}
              <span className="font-bold text-[10px]">{s.name}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default App;
