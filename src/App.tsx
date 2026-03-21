import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { 
  Activity, Brain, Wind, Stethoscope, ShieldCheck, Moon, Sun, Calculator, AlertCircle, Eye, Zap,
  Volume2, VolumeX, Info, X, Languages, Pill, LogOut
} from 'lucide-react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import AuthPage from './components/AuthPage';
import Background from './components/Background';
import { GCSState, SIRSState, QSOFAState, MEWSState, LiverState, ExamState, SurgicalState, PatientData, SavedPatient, Task, MachineData } from './types';
import { BOTTOM_NAV_SECTIONS } from './constants';
import ScoreCard from './components/ScoreCard';
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
const MachineDataImport = lazy(() => import('./components/MachineDataImport'));
const PrescriptionCalculator = lazy(() => import('./components/PrescriptionCalculator'));

const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center py-20 transition-none">
    <div className="w-10 h-10 border-2 border-slate-200 border-t-primary animate-spin mb-4"></div>
    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Loading Clinical Module...</p>
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
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [platform, setPlatform] = useState<'ios' | 'android'>('android');
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const [isSplashing, setIsSplashing] = useState(true);
  const [activeTab, setActiveTab] = useState('calculators');
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(['calculators']));
  const [activeRibbonTab, setActiveRibbonTab] = useState<'Home' | 'View' | 'Settings'>('Home');

  useEffect(() => {
    setVisitedTabs(prev => new Set(prev).add(activeTab));
  }, [activeTab]);
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
  const [machineData, setMachineData] = useLocalStorage<MachineData[]>('ai-medica-machine-data', []);
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
      surgery,
      machineData
    };
    
    try {
      const result = await clinicalAI.synthesize(primaryType, primaryValue, components, patientContext, synthesisOptions);
      setAiInsight(result);
      
      if (isSpeechEnabled) {
        let fullReport = `Clinical Synthesis for ${primaryType} score of ${primaryValue}. `;
        if (result.summary) fullReport += `Summary: ${result.summary}. `;
        if (result.actions && result.actions.length > 0) {
          fullReport += `Recommended Actions: ${result.actions.join('. ')}. `;
        }
        if (result.diagnostics && result.diagnostics.length > 0) {
          fullReport += `Diagnostic Workup: ${result.diagnostics.join('. ')}. `;
        }
        if (result.education && result.education.length > 0) {
          fullReport += `Patient Education: ${result.education.join('. ')}. `;
        }
        speechService.speak(fullReport, result.riskLevel === 'Critical' ? 'critical' : result.riskLevel === 'High' ? 'high' : 'normal');
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
        liver, exam, surgery, curb65, wellsPE, chads, anthro, machineData
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
    if (p.data.machineData) setMachineData(p.data.machineData);
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

  if (authLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Background />
        <AuthPage />
      </>
    );
  }

  if (isSplashing) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white transition-none">
        <div className="w-16 h-16 bg-slate-800 flex items-center justify-center shadow-none mb-5">
          <Activity className="text-white" size={32} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 uppercase">
            AI <span className="text-primary">MEDICA</span>
        </h1>
        <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Clinical Intelligence</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'calculators':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary">
                  <Activity className="text-white" size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('patientClassification')}</p>
                  <p className="text-lg font-bold text-slate-900">{t(ageGroup.toLowerCase() as any)}</p>
                </div>
              </div>
              <div className="flex gap-0 border border-border">
                {(['Adult', 'Pediatric', 'Neonate'] as const).map((group) => (
                  <button
                    key={group}
                    onClick={() => handleAgeGroupChange(group)}
                    className={`px-4 py-2 text-xs font-bold border-r border-border last:border-r-0 transition-all ${
                      ageGroup === group 
                        ? 'active z-10' 
                        : 'bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-50'
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
                    <div key={item.key} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200">
                      <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">{item.label}</span>
                      <select 
                        value={chads[item.key as keyof typeof chads] ? 'yes' : 'no'} 
                        onChange={e => setChads({...chads, [item.key]: e.target.value === 'yes'})}
                        className="p-1 bg-white border border-border font-bold text-xs outline-none focus:border-emerald-600"
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                  ))}
                </div>
              </ScoreCard>

              <ScoreCard title="CURB-65" subtitle="Pneumonia Severity" icon={<Wind size={20} />} score={ScoringEngine.calculateCURB65(curb65)}>
                <div className="space-y-3">
                  {Object.entries({ confusion: 'Confusion', urea: 'Urea > 7', rr: 'RR ≥ 30', bp: 'BP < 90/60', age: 'Age ≥ 65' }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200">
                      <span className="font-bold text-slate-700 text-sm">{label}</span>
                      <select 
                        value={curb65[key as keyof typeof curb65] ? 'yes' : 'no'} 
                        onChange={e => setCurb65({...curb65, [key]: e.target.value === 'yes'})}
                        className="p-1 bg-white border border-border font-bold text-xs outline-none focus:border-red-600"
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
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
                          <div key={key} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200">
                              <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">{label}</span>
                              <select 
                                value={wellsPE[key as keyof typeof wellsPE] ? 'yes' : 'no'} 
                                onChange={e => setWellsPE({...wellsPE, [key]: e.target.value === 'yes'})}
                                className="p-1 bg-white border border-border font-bold text-xs outline-none focus:border-blue-600"
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
      case 'prescription':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <PrescriptionCalculator 
              patientData={{
                gcs, sirs, qsofa, mews, liver, exam, surgery, curb65, chads, pews, ageGroup, notes, anthro, machineData
              }}
              ageGroup={ageGroup}
            />
          </Suspense>
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
          <div className="space-y-6 transition-none">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3 uppercase tracking-tight">
                <FolderOpen className="text-primary" /> {t('savedPatients')}
              </h2>
              <button onClick={() => setActiveTab('calculators')} className="p-2 bg-white border border-border text-slate-600 hover:bg-slate-50 transition-none">
                <UserPlus size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedPatients.map(p => (
                <div key={p.id} className="bg-white p-4 border border-border hover:border-primary transition-none group">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-800 uppercase tracking-tight">{p.name}</h3>
                      <p className="text-[9px] font-bold text-primary uppercase tracking-widest mb-1">{p.serialNumber}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(p.date).toLocaleString()}</p>
                    </div>
                    <span className="px-1.5 py-0.5 bg-primary-light text-primary text-[8px] font-bold border border-primary-light uppercase">{t(p.ageGroup.toLowerCase() as any)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => loadPatient(p)}
                      className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold border border-border transition-none uppercase tracking-widest"
                    >
                      {t('loadData')}
                    </button>
                    <button 
                      onClick={() => deletePatient(p.id)}
                      className="p-1.5 bg-white hover:bg-red-50 text-red-600 border border-border hover:border-red-200 transition-none"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {savedPatients.length === 0 && (
                <div className="col-span-full py-16 text-center bg-slate-50 border border-dashed border-border">
                  <FolderOpen size={40} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('noSavedPatients')}</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'tasks': return <TaskList />;
      case 'diagnostics':
        return (
          <MachineDataImport 
            machineData={machineData}
            onAddData={(data) => setMachineData([data, ...machineData])}
            onRemoveData={(id) => setMachineData(machineData.filter(d => d.id !== id))}
          />
        );
      case 'summary':
        return (
            <div className="space-y-4 transition-none">
              <div className="bg-white border border-border p-4 min-h-[60vh] relative overflow-hidden transition-none">
                 {isGenerating ? (
                   <div className="flex flex-col items-center justify-center h-full py-20 space-y-4">
                      <div className="relative">
                         <div className="w-12 h-12 border-2 border-slate-200 border-t-primary animate-spin"></div>
                         <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-800" size={20} />
                      </div>
                      <div className="text-center">
                         <p className="text-lg font-bold text-slate-800 tracking-tight uppercase">{t('synthesizing')}</p>
                         <p className="text-slate-400 mt-1 font-bold uppercase text-[8px] tracking-[0.2em]">{t('engineActive')}</p>
                      </div>
                   </div>
                 ) : aiInsight ? (
                   <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                         <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2.5 m-0 uppercase tracking-tight">
                            <Stethoscope className="text-primary" size={20} /> {t('clinicalSynthesis')}
                            {aiInsight.riskLevel && (
                              <span className={`px-1.5 py-0.5 border border-border text-[8px] font-bold uppercase tracking-widest ${
                                aiInsight.riskLevel === 'Critical' ? 'bg-red-600 text-white' :
                                aiInsight.riskLevel === 'High' ? 'bg-red-50 text-red-600 border-red-100' :
                                aiInsight.riskLevel === 'Moderate' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                'bg-emerald-50 text-emerald-600 border-emerald-100'
                              }`}>
                                {aiInsight.riskLevel} {t('riskLevel')}
                              </span>
                            )}
                         </h2>
                         <div className="flex items-center gap-3">
                            <div className="flex items-center gap-0 border border-border bg-slate-50">
                               {(['diagnostic', 'therapeutic', 'educational'] as const).map(f => (
                                 <button
                                   key={f}
                                   onClick={() => setSynthesisOptions({ ...synthesisOptions, focus: f })}
                                   className={`px-2 py-1 text-[8px] font-bold uppercase tracking-tight border-r border-border last:border-r-0 transition-none ${synthesisOptions.focus === f ? 'bg-primary-light text-primary outline-1 outline-primary z-10' : 'text-slate-400 hover:text-slate-600'}`}
                                 >
                                   {f}
                                 </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-0 border border-border bg-slate-50">
                               {(['concise', 'standard', 'detailed'] as const).map(d => (
                                 <button
                                   key={d}
                                   onClick={() => setSynthesisOptions({ ...synthesisOptions, depth: d })}
                                   className={`px-2 py-1 text-[8px] font-bold uppercase tracking-tight border-r border-border last:border-r-0 transition-none ${synthesisOptions.depth === d ? 'bg-primary-light text-primary outline-1 outline-primary z-10' : 'text-slate-400 hover:text-slate-600'}`}
                                 >
                                   {d}
                                 </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-3">
                               <button onClick={handleConsult} className="text-[9px] font-bold uppercase tracking-widest text-slate-500 hover:text-primary transition-none flex items-center gap-1.5">
                                 <Activity size={10} /> {t('regenerate')}
                               </button>
                               <button 
                                 onClick={() => speechService.stop()} 
                                 className="text-[9px] font-bold uppercase tracking-widest text-slate-500 hover:text-primary transition-none flex items-center gap-1.5"
                               >
                                 <VolumeX size={10} /> {t('stopReading')}
                               </button>
                             </div>
                         </div>
                      </div>
                      
                      <div className="flex gap-0 border border-border mb-4 overflow-x-auto scrollbar-hide">
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
                            className={`px-3 py-1.5 text-[10px] font-bold border-r border-border last:border-r-0 transition-all uppercase tracking-widest ${
                              consultTab === tab.id 
                                ? 'active z-10' 
                                : 'bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      <div className="clinical-text text-slate-700 whitespace-pre-wrap leading-relaxed text-xs flex-1 overflow-y-auto custom-scrollbar">
                          {consultTab === 'summary' && (
                            <div className="p-4 bg-slate-50 border border-border max-w-none">
                              <div className="whitespace-pre-wrap font-medium text-slate-800">{aiInsight.summary}</div>
                            </div>
                          )}
                         {consultTab === 'actions' && (
                           <ul className="space-y-2">
                             {aiInsight.actions.map((action, i) => (
                               <li key={i} className="flex items-start gap-3 p-3 bg-white border border-border group">
                                 <div className="w-1.5 h-1.5 bg-red-600 mt-1.5 flex-shrink-0" />
                                 <span className="font-bold tracking-tight text-slate-800">{action}</span>
                               </li>
                             ))}
                             {aiInsight.actions.length === 0 && <p className="text-slate-400 italic p-6 text-center uppercase tracking-widest text-[9px]">{t('noActions')}</p>}
                           </ul>
                         )}
                         {consultTab === 'diagnostics' && (
                           <ul className="space-y-2">
                             {aiInsight.diagnostics.map((diag, i) => (
                               <li key={i} className="flex items-start gap-3 p-3 bg-white border border-border group">
                                 <div className="w-1.5 h-1.5 bg-blue-600 mt-1.5 flex-shrink-0" />
                                 <span className="font-bold tracking-tight text-slate-800">{diag}</span>
                               </li>
                             ))}
                             {aiInsight.diagnostics.length === 0 && <p className="text-slate-400 italic p-6 text-center uppercase tracking-widest text-[9px]">{t('noDiagnostics')}</p>}
                           </ul>
                         )}
                         {consultTab === 'education' && (
                           <ul className="space-y-2">
                             {aiInsight.education.map((edu, i) => (
                               <li key={i} className="flex items-start gap-3 p-3 bg-white border border-border group">
                                 <div className="w-1.5 h-1.5 bg-emerald-600 mt-1.5 flex-shrink-0" />
                                 <span className="font-bold tracking-tight text-slate-800">{edu}</span>
                               </li>
                             ))}
                             {aiInsight.education.length === 0 && <p className="text-slate-400 italic p-6 text-center uppercase tracking-widest text-[9px]">{t('noEducation')}</p>}
                           </ul>
                         )}
                         {consultTab === 'documentation' && (
                           <div className="p-4 bg-slate-800 text-slate-100 font-mono text-[10px] border border-slate-700 leading-relaxed">
                             {aiInsight.documentation}
                           </div>
                         )}
                      </div>
                   </div>
                 ) : (
                   <div className="flex flex-col items-center justify-center h-full text-center">
                      <h3 className="text-lg font-bold text-slate-800 tracking-tight uppercase">{t('noDataForAnalysis')}</h3>
                      <p className="text-slate-400 max-w-xs mt-2 text-xs uppercase tracking-tight">{t('fillScoringTools')}</p>
                   </div>
                 )}
              </div>
              <div className="bg-white p-3 border border-border transition-none">
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder={t('addCaseNotes')} 
                  className="w-full h-20 bg-white border border-border p-3 text-slate-800 outline-none focus:bg-slate-50 transition-none font-medium text-xs"
                />
              </div>
            </div>
        );
      default: return null;
    }
  };

  return (
    <div className={`${platform} relative min-h-screen`}>
      <Background />
      {isInactive && <Screensaver />}
      
      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 transition-none">
          <div className="bg-white border border-border p-6 w-full max-w-sm shadow-none transition-none">
            <h3 className="text-lg font-bold text-slate-800 mb-4 uppercase tracking-tight">{t('savePatientRecord')}</h3>
            <input 
              type="text" 
              placeholder={t('enterPatientName')} 
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              className="w-full p-3 bg-white border border-border font-bold text-slate-800 outline-none focus:bg-slate-50 transition-none mb-4 text-sm"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowSaveModal(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 font-bold border border-border uppercase tracking-widest text-[10px]">{t('cancel')}</button>
              <button onClick={savePatient} className="flex-1 py-2 bg-primary text-white font-bold border border-primary uppercase tracking-widest text-[10px]">{t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* About Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 transition-none">
          <div className="bg-white border border-border p-6 w-full max-w-lg shadow-none transition-none relative">
            <button 
              onClick={closeAboutModal}
              className="absolute top-3 right-3 p-1.5 border border-transparent hover:border-border text-slate-400 transition-none"
            >
              <X size={16} />
            </button>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="p-2 bg-primary">
                <Activity className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 leading-none uppercase tracking-tight">{t('appName')}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t('tagline')}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="prose prose-slate max-w-none">
                <div className="mb-4">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Project Attribution</p>
                  <p className="text-xs text-slate-600 leading-relaxed italic">
                    This application is a practical expression of the Competence-Based Medical Education at King Ceasor University, where learning is defined by the ability to solve real-world health challenges. Developed by Arinda Andrew Besigye (MBChB 3.1), the tool is a tribute to the technological foresight of HM King Ceasor Augustus Mulenga, whose vision for innovation empowers students to bridge the gap between medicine and digital transformation.
                  </p>
                  <p className="text-[9px] font-bold text-slate-500 mt-2 uppercase tracking-widest">Refined through the collaborative insights and clinical peer review of the MBChB 3.1 class.</p>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 p-4">
                <div className="flex items-center gap-2 text-orange-600 mb-2">
                  <AlertTriangle size={14} />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Clinical Disclaimer</span>
                </div>
                <p className="text-[10px] text-orange-800 font-medium leading-relaxed">
                  This tool is designed to support, not dictate, clinical excellence. It functions strictly as a decision-support calculator for licensed practitioners. It is not an interventional authority and must always be used in conjunction with professional clinical judgment and patient-centered care.
                </p>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => speechService.stop()}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold border border-border uppercase tracking-widest text-[10px]"
                >
                  {t('stopReading')}
                </button>
                <button 
                  onClick={closeAboutModal}
                  className="flex-1 py-3 bg-slate-800 text-white font-bold border border-slate-900 uppercase tracking-widest text-[10px]"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="app-header sticky top-0 z-40 bg-white border-b border-border">
        <div className="header-top px-4 py-2 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 flex items-center justify-center bg-primary">
              <Activity className="text-white" size={14} />
            </div>
            <h1 className="text-sm font-bold text-slate-800 uppercase tracking-tight">
              {t('appName')}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2 py-0.5 border border-border bg-slate-50">
              <div className={`w-1.5 h-1.5 ${isOnline ? 'bg-success' : 'bg-warning'}`} />
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">
                {isOnline ? t('cloudAiActive') : t('localAiActive')}
              </span>
            </div>
            <button 
              onClick={() => setLanguage(language === 'en' ? 'sw' : 'en')}
              className="flex items-center gap-1 px-2 py-0.5 border border-border bg-white hover:bg-slate-50 transition-none"
            >
              <Languages size={12} className="text-slate-400" />
              <span className="text-[8px] font-bold uppercase text-slate-600">{language}</span>
            </button>
            <button onClick={toggleNightMode} className="p-1 border border-border bg-white hover:bg-slate-50 transition-none">
              {isNightMode ? <Sun size={14} className="text-slate-400" /> : <Moon size={14} className="text-slate-400" />}
            </button>
          </div>
        </div>

        <div className="ribbon-tabs px-4 flex gap-0.5 mt-0.5">
          {(['Home', 'View', 'Settings'] as const).map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveRibbonTab(tab)}
              className={`ribbon-tab px-4 py-1 text-[10px] font-bold uppercase tracking-widest border-t border-x border-border -mb-[1px] z-10 transition-none ${activeRibbonTab === tab ? 'bg-white border-b-white' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="ribbon-content px-4 py-2 flex gap-6 bg-white border-t border-border min-h-[84px]">
          {activeRibbonTab === 'Home' && (
            <>
              <div className="ribbon-group flex flex-col items-center gap-1 pr-6 border-r border-slate-100">
                <div className="flex gap-0.5">
                  {[
                    ...BOTTOM_NAV_SECTIONS, 
                    { id: 'prescription', name: 'Prescription', icon: <Pill size={20} className="text-emerald-500" /> },
                    { id: 'patients', name: t('records'), icon: <FolderOpen size={20} className="text-blue-400" /> }
                  ].map((s) => (
                    <button 
                      key={s.id} 
                      onClick={() => setActiveTab(s.id)} 
                      className={`ribbon-button flex flex-col items-center justify-center min-w-[56px] p-1 border border-transparent hover:bg-primary-light hover:border-primary transition-none ${activeTab === s.id ? 'bg-primary-light border-primary' : ''}`}
                    >
                      <div className="ribbon-button-icon mb-1">{s.icon}</div>
                      <span className="ribbon-button-label text-[9px] font-bold text-slate-700 uppercase tracking-tighter">{s.name}</span>
                    </button>
                  ))}
                </div>
                <div className="text-[8px] text-slate-400 uppercase font-bold tracking-widest">Navigation</div>
              </div>

              <div className="ribbon-group flex flex-col items-center gap-1 pr-6 border-r border-slate-100">
                <div className="flex gap-0.5">
                  <button onClick={() => setShowSaveModal(true)} className="ribbon-button flex flex-col items-center justify-center min-w-[56px] p-1 border border-transparent hover:bg-primary-light hover:border-primary transition-none">
                    <div className="ribbon-button-icon mb-1"><Save size={20} className="text-blue-600" /></div>
                    <span className="ribbon-button-label text-[9px] font-bold text-slate-700 uppercase tracking-tighter">{t('save')}</span>
                  </button>
                  <button onClick={() => setIsSpeechEnabled(!isSpeechEnabled)} className={`ribbon-button flex flex-col items-center justify-center min-w-[56px] p-1 border border-transparent hover:bg-primary-light hover:border-primary transition-none ${isSpeechEnabled ? 'bg-primary-light border-primary' : ''}`}>
                    <div className="ribbon-button-icon mb-1">{isSpeechEnabled ? <Volume2 size={20} className="text-red-600" /> : <VolumeX size={20} className="text-slate-400" />}</div>
                    <span className="ribbon-button-label text-[9px] font-bold text-slate-700 uppercase tracking-tighter">Speech</span>
                  </button>
                  <button onClick={handleAboutPress} className="ribbon-button flex flex-col items-center justify-center min-w-[56px] p-1 border border-transparent hover:bg-primary-light hover:border-primary transition-none">
                    <div className="ribbon-button-icon mb-1"><Info size={20} className="text-blue-500" /></div>
                    <span className="ribbon-button-label text-[9px] font-bold text-slate-700 uppercase tracking-tighter">About</span>
                  </button>
                </div>
                <div className="text-[8px] text-slate-400 uppercase font-bold tracking-widest">Actions</div>
              </div>
            </>
          )}

          {activeRibbonTab === 'View' && (
            <>
              <div className="ribbon-group flex flex-col items-center gap-1 pr-6 border-r border-slate-100">
                <div className="flex gap-0.5">
                  <button onClick={toggleNightMode} className={`ribbon-button flex flex-col items-center justify-center min-w-[56px] p-1 border border-transparent hover:bg-primary-light hover:border-primary transition-none ${isNightMode ? 'bg-primary-light border-primary' : ''}`}>
                    <div className="ribbon-button-icon mb-1">{isNightMode ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-slate-400" />}</div>
                    <span className="ribbon-button-label text-[9px] font-bold text-slate-700 uppercase tracking-tighter">Night Mode</span>
                  </button>
                  <button className="ribbon-button flex flex-col items-center justify-center min-w-[56px] p-1 border border-transparent hover:bg-primary-light hover:border-primary transition-none">
                    <div className="ribbon-button-icon mb-1"><Eye size={20} className="text-emerald-500" /></div>
                    <span className="ribbon-button-label text-[9px] font-bold text-slate-700 uppercase tracking-tighter">Comfort</span>
                  </button>
                </div>
                <div className="text-[8px] text-slate-400 uppercase font-bold tracking-widest">Display</div>
              </div>
              <div className="ribbon-group flex flex-col items-center gap-1 pr-6 border-r border-slate-100">
                <div className="flex gap-0.5">
                  <button onClick={() => setIsSpeechEnabled(true)} className={`ribbon-button flex flex-col items-center justify-center min-w-[56px] p-1 border border-transparent hover:bg-primary-light hover:border-primary transition-none ${isSpeechEnabled ? 'bg-primary-light border-primary' : ''}`}>
                    <div className="ribbon-button-icon mb-1"><Volume2 size={20} className="text-blue-500" /></div>
                    <span className="ribbon-button-label text-[9px] font-bold text-slate-700 uppercase tracking-tighter">On</span>
                  </button>
                  <button onClick={() => setIsSpeechEnabled(false)} className={`ribbon-button flex flex-col items-center justify-center min-w-[56px] p-1 border border-transparent hover:bg-primary-light hover:border-primary transition-none ${!isSpeechEnabled ? 'bg-primary-light border-primary' : ''}`}>
                    <div className="ribbon-button-icon mb-1"><VolumeX size={20} className="text-slate-400" /></div>
                    <span className="ribbon-button-label text-[9px] font-bold text-slate-700 uppercase tracking-tighter">Off</span>
                  </button>
                </div>
                <div className="text-[8px] text-slate-400 uppercase font-bold tracking-widest">Audio Feedback</div>
              </div>
            </>
          )}

          {activeRibbonTab === 'Settings' && (
            <>
              <div className="ribbon-group flex flex-col items-center gap-1 pr-6 border-r border-slate-100">
                <div className="flex gap-0.5">
                  <button onClick={() => setLanguage('en')} className={`ribbon-button flex flex-col items-center justify-center min-w-[56px] p-1 border border-transparent hover:bg-primary-light hover:border-primary transition-none ${language === 'en' ? 'bg-primary-light border-primary' : ''}`}>
                    <div className="ribbon-button-icon mb-1"><Languages size={20} className="text-blue-500" /></div>
                    <span className="ribbon-button-label text-[9px] font-bold text-slate-700 uppercase tracking-tighter">English</span>
                  </button>
                  <button onClick={() => setLanguage('sw')} className={`ribbon-button flex flex-col items-center justify-center min-w-[56px] p-1 border border-transparent hover:bg-primary-light hover:border-primary transition-none ${language === 'sw' ? 'bg-primary-light border-primary' : ''}`}>
                    <div className="ribbon-button-icon mb-1"><Languages size={20} className="text-red-500" /></div>
                    <span className="ribbon-button-label text-[9px] font-bold text-slate-700 uppercase tracking-tighter">Swahili</span>
                  </button>
                </div>
                <div className="text-[8px] text-slate-400 uppercase font-bold tracking-widest">Language</div>
              </div>
              <div className="ribbon-group flex flex-col items-center gap-1 pr-6 border-r border-slate-100">
                <div className="flex gap-0.5">
                  <button onClick={() => setSavedPatients([])} className="ribbon-button flex flex-col items-center justify-center min-w-[56px] p-1 border border-transparent hover:bg-red-50 hover:border-red-500 transition-none">
                    <div className="ribbon-button-icon mb-1"><Trash2 size={20} className="text-red-500" /></div>
                    <span className="ribbon-button-label text-[9px] font-bold text-slate-700 uppercase tracking-tighter">Clear All</span>
                  </button>
                  <button onClick={handleLogout} className="ribbon-button flex flex-col items-center justify-center min-w-[56px] p-1 border border-transparent hover:bg-red-50 hover:border-red-500 transition-none">
                    <div className="ribbon-button-icon mb-1"><LogOut size={20} className="text-red-600" /></div>
                    <span className="ribbon-button-label text-[9px] font-bold text-slate-700 uppercase tracking-tighter">Sign Out</span>
                  </button>
                </div>
                <div className="text-[8px] text-slate-400 uppercase font-bold tracking-widest">System</div>
              </div>
            </>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {renderContent()}
      </main>

      {/* Mobile Bottom Nav - Only visible on small screens */}
      <nav className="bottom-nav lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-border z-40">
        <div className="flex justify-around items-center h-14 max-w-7xl mx-auto">
          {[...BOTTOM_NAV_SECTIONS, { id: 'patients', name: t('records'), icon: <FolderOpen size={18} /> }].map((s) => (
            <button 
              key={s.id} 
              onClick={() => setActiveTab(s.id)} 
              className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-all relative ${
                activeTab === s.id 
                  ? 'active' 
                  : visitedTabs.has(s.id)
                    ? 'visited opacity-80'
                    : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <div className={`transition-transform ${activeTab === s.id ? 'scale-110' : 'scale-100'}`}>
                {s.icon}
              </div>
              <span className="font-bold text-[9px] uppercase tracking-tighter">{s.name}</span>
              {activeTab === s.id && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default App;
