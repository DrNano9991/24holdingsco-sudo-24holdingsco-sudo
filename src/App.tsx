import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { 
  Activity, Brain, Wind, Stethoscope, ShieldCheck, Moon, Sun, Calculator, AlertCircle, Eye, Zap,
  Volume2, VolumeX, Info, X, Languages, Pill, Lock, Key
} from 'lucide-react';
import { GCSState, SIRSState, QSOFAState, MEWSState, LiverState, ExamState, SurgicalState, PatientData, SavedPatient, Task, MachineData } from './types';
import { BOTTOM_NAV_SECTIONS } from './constants';
import ScoreCard from './components/ScoreCard';
import { clinicalAI, SynthesisResult, SynthesisOptions } from './services/clinicalAI';
import { ScoringEngine } from './services/scoringEngine';
import { useLocalStorage } from './hooks/useLocalStorage';
import ScoreSummaryPanel from './components/ScoreSummaryPanel';
import { AgeGroup, PEWSState } from './types';
import { Save, FolderOpen, Trash2, UserPlus, CheckCircle2, AlertTriangle, CheckSquare, Check, Plus } from 'lucide-react';
import { useTranslation } from './contexts/TranslationContext';
import { logger } from './services/logger';
import { toast, Toaster } from 'react-hot-toast';

import ReactMarkdown from 'react-markdown';
import Screensaver from './components/Screensaver';
import PasswordLock from './components/PasswordLock';
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
  const [platform, setPlatform] = useState<'ios' | 'android'>('android');
  const [isSplashing, setIsSplashing] = useState(true);
  const [activeTab, setActiveTab] = useState('calculators');
  const [activeCalculator, setActiveCalculator] = useState<string>('MEWS');
  const [activeRibbonTab, setActiveRibbonTab] = useState<'Home' | 'View' | 'Settings'>('Home');
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
  const [isAuthorized, setIsAuthorized] = useState(() => {
    return sessionStorage.getItem('ai-medica-authorized') === 'true';
  });
  const [isGuestMode, setIsGuestMode] = useState(() => {
    return sessionStorage.getItem('ai-medica-guest-mode') === 'true';
  });
  const [guestLogs, setGuestLogs] = useLocalStorage<any[]>('ai-medica-guest-logs', []);
  const [showSecurityAlert, setShowSecurityAlert] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handlePasswordChange = () => {
    if (newPassword.length < 4) {
      setPasswordError('Password too short');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    localStorage.setItem('ai-medica-password', newPassword);
    setShowPasswordChange(false);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    alert('Password updated successfully');
  };

  const handleLogout = () => {
    setIsAuthorized(false);
    setIsGuestMode(false);
    sessionStorage.removeItem('ai-medica-authorized');
    sessionStorage.removeItem('ai-medica-guest-mode');
    speechService.notifyChange('Security', 'Session terminated. Application locked.');
  };

  const logGuestAction = (action: string) => {
    if (isGuestMode) {
      const newLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        action,
      };
      setGuestLogs(prev => [newLog, ...prev]);
    }
  };

  useEffect(() => {
    const handleGuestAction = (e: any) => {
      logGuestAction(e.detail);
    };
    window.addEventListener('guest-action', handleGuestAction);
    return () => window.removeEventListener('guest-action', handleGuestAction);
  }, [isGuestMode]);

  useEffect(() => {
    if (isAuthorized && !isGuestMode && guestLogs.length > 0) {
      setShowSecurityAlert(true);
    }
  }, [isAuthorized, isGuestMode, guestLogs]);

  const readLogs = () => {
    if (guestLogs.length === 0) {
      speechService.speak("No security logs found.");
      return;
    }
    const logText = guestLogs.map(log => 
      `At ${new Date(log.timestamp).toLocaleTimeString()}, guest performed: ${log.action}`
    ).join('. ');
    speechService.speak(`Security Alert. Guest activity detected. ${logText}`);
  };

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
  const [gcs, setGcsRaw] = useLocalStorage<GCSState>('ai-medica-gcs', { eye: 4, verbal: 5, motor: 6 });
  const [sirs, setSirsRaw] = useLocalStorage<SIRSState>('ai-medica-sirs', { temp: 37, heartRate: 80, respRate: 16, wbc: 8, bands: '' });
  const [qsofa, setQsofaRaw] = useLocalStorage<QSOFAState>('ai-medica-qsofa', { lowBP: false, highRR: false, alteredMentation: false });
  const [mews, setMewsRaw] = useLocalStorage<MEWSState>('ai-medica-mews', { sbp: 120, hr: 80, rr: 16, temp: 37, avpu: 0 });
  const [liver, setLiverRaw] = useLocalStorage<LiverState>('ai-medica-liver', { bilirubin: '', albumin: '', inr: '', creatinine: '', sodium: '', ascites: 1, encephalopathy: 1, dialysis: false });
  const [exam, setExamRaw] = useLocalStorage<ExamState>('ai-medica-exam', { jvp: '', capRefill: '', skinTurgor: 'Normal', mucosa: 'Moist', pulseGrade: 2, muscleStrength: 5 });
  const [surgery, setSurgeryRaw] = useLocalStorage<SurgicalState>('ai-medica-surgery', { asa: 1, age: '', preOpSpO2: '', respInfection: false, preOpAnemia: false, surgeryType: 'Peripheral', duration: '<2h' });
  const [curb65, setCurb65Raw] = useLocalStorage('ai-medica-curb65', { confusion: false, urea: false, rr: false, bp: false, age: false });
  const [wellsPE, setWellsPERaw] = useLocalStorage('ai-medica-wells-pe', { dvtSymptoms: false, peLikely: false, hr100: false, immobilization: false, priorDvtPe: false, hemoptysis: false, malignancy: false });
  const [chads, setChadsRaw] = useLocalStorage('ai-medica-chads', { chf: false, htn: false, age75: false, dm: false, stroke: false, vascular: false, age65: false, female: false });
  const [pews, setPewsRaw] = useLocalStorage<PEWSState>('ai-medica-pews', { behavior: 0, cardiovascular: 0, respiratory: 0, nebulizer: false, persistentVomiting: false });
  const [phq9, setPhq9Raw] = useLocalStorage('ai-medica-phq9', { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0 });
  const [gad7, setGad7Raw] = useLocalStorage('ai-medica-gad7', { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0 });
  const [amts, setAmtsRaw] = useLocalStorage('ai-medica-amts', { age: true, time: true, address: true, year: true, place: true, recognition: true, dob: true, monarch: true, ww2: true, countBackwards: true });
  const [tasks, setTasksRaw] = useLocalStorage<Task[]>('ai-medica-tasks', []);
  const [machineData, setMachineDataRaw] = useLocalStorage<MachineData[]>('ai-medica-machine-data', []);
  const [ageGroup, setAgeGroupRaw] = useLocalStorage<AgeGroup>('ai-medica-age-group', 'Adult');
  const [anthro, setAnthroRaw] = useLocalStorage<{ waist: number | ''; height: number | ''; hip: number | ''; weight: number | ''; }>('ai-medica-anthro', { waist: '', height: '', hip: '', weight: '' });
  const [notes, setNotesRaw] = useLocalStorage('ai-medica-notes', '');

  // Wrapped Setters for Logging
  const setGcs = (val: any) => { setGcsRaw(val); logGuestAction('Updated GCS score'); };
  const setSirs = (val: any) => { setSirsRaw(val); logGuestAction('Updated SIRS parameters'); };
  const setQsofa = (val: any) => { setQsofaRaw(val); logGuestAction('Updated qSOFA parameters'); };
  const setMews = (val: any) => { setMewsRaw(val); logGuestAction('Updated MEWS parameters'); };
  const setLiver = (val: any) => { setLiverRaw(val); logGuestAction('Updated Liver function data'); };
  const setExam = (val: any) => { setExamRaw(val); logGuestAction('Updated Physical Exam data'); };
  const setSurgery = (val: any) => { setSurgeryRaw(val); logGuestAction('Updated Surgical risk data'); };
  const setCurb65 = (val: any) => { setCurb65Raw(val); logGuestAction('Updated CURB-65 parameters'); };
  const setWellsPE = (val: any) => { setWellsPERaw(val); logGuestAction('Updated Wells PE parameters'); };
  const setChads = (val: any) => { setChadsRaw(val); logGuestAction('Updated CHADS-VASc parameters'); };
  const setPews = (val: any) => { setPewsRaw(val); logGuestAction('Updated PEWS parameters'); };
  const setPhq9 = (val: any) => { setPhq9Raw(val); logGuestAction('Updated PHQ-9 parameters'); };
  const setGad7 = (val: any) => { setGad7Raw(val); logGuestAction('Updated GAD-7 parameters'); };
  const setAmts = (val: any) => { setAmtsRaw(val); logGuestAction('Updated AMTS parameters'); };
  const setTasks = (val: Task[]) => { setTasksRaw(val); logGuestAction('Updated tasks'); };
  const setMachineData = (val: any) => { setMachineDataRaw(val); }; // Logged in onAddData
  const setAgeGroup = (val: any) => { setAgeGroupRaw(val); logGuestAction(`Changed age group to ${val}`); };
  const setAnthro = (val: any) => { setAnthroRaw(val); logGuestAction('Updated Anthropometrics'); };
  const setNotes = (val: any) => { setNotesRaw(val); logGuestAction('Modified clinical notes'); };

  // --- SAVED PATIENTS ---
    const [savedPatients, setSavedPatients] = useLocalStorage<SavedPatient[]>('ai-medica-saved-patients', []);
    const [patientName, setPatientName] = useState('');
    const [showSaveModal, setShowSaveModal] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus(null), 2000);
    });
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
      machineData,
      phq9,
      gad7,
      amts
    };
    
    try {
      const result = await clinicalAI.synthesize(primaryType, primaryValue, components, patientContext, synthesisOptions);
      setAiInsight(result);
      toast.success(t('synthesisComplete'));
      
      logGuestAction(`Performed clinical synthesis for ${primaryType} score of ${primaryValue}`);
      
      if (isSpeechEnabled) {
        let fullReport = `Clinical Synthesis for ${primaryType} score of ${primaryValue}. `;
        if (result.summary) fullReport += `Summary: ${result.summary}. `;
        if (result.actions && result.actions.length > 0) {
          fullReport += `Recommended Actions: ${result.actions}. `;
        }
        if (result.diagnostics && result.diagnostics.length > 0) {
          fullReport += `Diagnostic Workup: ${result.diagnostics}. `;
        }
        if (result.education && result.education.length > 0) {
          fullReport += `Patient Education: ${result.education}. `;
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

  const addTaskFromInsight = (text: string) => {
    if (!text || !text.trim()) return;
    
    // Split by bullet points, numbers, or double line breaks
    const lines = text.split(/\n\n|\n(?=[•\-\d\.\*])|(?<=\.)\s*\n/).filter(l => l.trim().length > 3);
    
    const newTasks: Task[] = lines.map(line => ({
      id: Math.random().toString(36).substr(2, 9),
      text: line.replace(/^[•\-\d\.\*\s]+/, '').trim(),
      completed: false,
      priority: 'medium' as const,
      createdAt: new Date().toISOString()
    })).filter(t => t.text.length > 0);

    if (newTasks.length > 0) {
      setTasks([...tasks, ...newTasks]);
      toast.success(`${newTasks.length} ${t('tasksAdded')}`);
      logGuestAction(`Added ${newTasks.length} tasks from AI insight`);
    }
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined } : t));
    logGuestAction('Toggled task completion');
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    logGuestAction('Deleted task');
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
      if (aiInsight.actions && typeof aiInsight.actions === 'string') {
        const actionLines = aiInsight.actions.split('\n')
          .filter(line => line.startsWith('    ') && line.trim().length > 0)
          .map(line => line.trim());
          
        actionLines.forEach((action: string) => {
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
      if (aiInsight.diagnostics && typeof aiInsight.diagnostics === 'string') {
        const diagLines = aiInsight.diagnostics.split('\n')
          .filter(line => line.startsWith('    ') && line.trim().length > 0)
          .map(line => line.trim());

        diagLines.forEach((diag: string) => {
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
    toast.success(t('patientSaved'));
    setPatientName('');
    setShowSaveModal(false);
    setShowSaveConfirm(false);
    
    logGuestAction(`Registered new patient: ${newPatient.name} (${newPatient.serialNumber})`);
    
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
      logGuestAction(`Deleted patient record: ${patient.name} (${patient.serialNumber})`);
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
                <div className="p-2 bg-slate-800">
                  <Activity className="text-white" size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('patientClassification')}</p>
                  <p className="text-lg font-bold text-slate-900">{t(ageGroup.toLowerCase() as any)}</p>
                </div>
              </div>
              <div className="flex gap-1 border border-border p-1 bg-slate-50">
                {(['Adult', 'Pediatric', 'Neonate'] as const).map((group) => (
                  <button
                    key={group}
                    onClick={() => handleAgeGroupChange(group)}
                    className={`px-4 py-1.5 text-xs font-bold border border-border transition-none ${
                      ageGroup === group 
                        ? 'bg-slate-400 text-white border-slate-500 z-10' 
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t(group.toLowerCase() as any)}
                  </button>
                ))}
              </div>
            </div>

            <ScoreSummaryPanel 
              gcs={gcs} mews={mews} sirs={sirs} qsofa={qsofa} curb65={curb65} pews={pews} surgery={surgery} anthro={anthro} 
              activeCalculator={activeCalculator}
              onSelect={setActiveCalculator}
            />
            
            <CombinedCalculators 
              ageGroup={ageGroup}
              gcs={gcs} setGcs={setGcs} 
              mews={mews} setMews={setMews} 
              sirs={sirs} setSirs={setSirs}
              qsofa={qsofa} setQsofa={setQsofa}
              pews={pews} setPews={setPews}
              phq9={phq9} setPhq9={setPhq9}
              gad7={gad7} setGad7={setGad7}
              amts={amts} setAmts={setAmts}
              surgery={surgery} setSurgery={setSurgery}
              activeCalculator={activeCalculator}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                gcs, sirs, qsofa, mews, liver, exam, surgery, curb65, chads, pews, ageGroup, notes, anthro, machineData,
                phq9, gad7, amts
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
              <button onClick={() => setActiveTab('calculators')} className="p-1.5 bg-white border border-border text-slate-600 hover:bg-slate-50 transition-none">
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
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-bold border border-border uppercase">{t(p.ageGroup.toLowerCase() as any)}</span>
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
      case 'tasks':
        return (
          <div className="space-y-6 transition-none animate-slide-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3 uppercase tracking-tight">
                <CheckSquare className="text-primary" /> {t('clinicalTasks')}
              </h2>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {tasks.filter(t => t.completed).length}/{tasks.length} {t('completed')}
              </div>
            </div>
            
            <div className="space-y-2">
              {tasks.map(task => (
                <div key={task.id} className={`p-4 border-2 transition-none flex items-start gap-4 ${task.completed ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-800 shadow-[4px_4px_0px_0px_rgba(30,41,59,1)]'}`}>
                  <button 
                    onClick={() => toggleTask(task.id)}
                    className={`mt-1 w-5 h-5 border-2 flex items-center justify-center transition-none ${task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-800 hover:bg-slate-50'}`}
                  >
                    {task.completed && <Check size={14} />}
                  </button>
                  <div className="flex-1">
                    <p className={`text-xs font-bold uppercase tracking-tight leading-relaxed ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {task.text}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                        {new Date(task.createdAt).toLocaleString()}
                      </span>
                      {task.completedAt && (
                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">
                          {t('completedAt')}: {new Date(task.completedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 transition-none"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              
              {tasks.length === 0 && (
                <div className="py-20 text-center bg-slate-50 border-2 border-dashed border-slate-200">
                  <CheckSquare size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('noTasks')}</p>
                  <p className="text-[8px] text-slate-300 uppercase tracking-widest mt-1">{t('tasksHint')}</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'diagnostics':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <MachineDataImport 
              machineData={machineData}
              onAddData={(data) => {
                setMachineData([data, ...machineData]);
                logGuestAction(`Added machine data: ${data.type} - ${data.interpretation || 'No interpretation'}`);
              }}
              onRemoveData={(id) => setMachineData(machineData.filter(d => d.id !== id))}
              onClearAll={() => setMachineData([])}
            />
          </Suspense>
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
                            <div className="flex items-center gap-1 border border-border bg-slate-50 p-1">
                               {(['diagnostic', 'therapeutic', 'educational'] as const).map(f => (
                                 <button
                                   key={f}
                                   onClick={() => setSynthesisOptions({ ...synthesisOptions, focus: f })}
                                   className={`px-3 py-1.5 text-[8px] font-bold uppercase tracking-tight border border-border transition-none ${synthesisOptions.focus === f ? 'bg-slate-400 text-white border-slate-500 z-10' : 'text-slate-400 hover:text-slate-600'}`}
                                 >
                                   {f}
                                 </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-1 border border-border bg-slate-50 p-1">
                               {(['concise', 'standard', 'detailed'] as const).map(d => (
                                 <button
                                   key={d}
                                   onClick={() => setSynthesisOptions({ ...synthesisOptions, depth: d })}
                                   className={`px-3 py-1.5 text-[8px] font-bold uppercase tracking-tight border border-border transition-none ${synthesisOptions.depth === d ? 'bg-slate-400 text-white border-slate-500 z-10' : 'text-slate-400 hover:text-slate-600'}`}
                                 >
                                   {d}
                                 </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-3">
                               <button 
                                 onClick={() => {
                                   if (!aiInsight) return;
                                   const text = `
Clinical Synthesis: ${aiInsight.riskLevel} Risk
Summary: ${aiInsight.summary}
Actions: ${aiInsight.actions}
Diagnostics: ${aiInsight.diagnostics}
                                   `.trim();
                                   handleCopyToClipboard(text);
                                 }}
                                 className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border-2 transition-all flex items-center gap-2 ${copyStatus === 'copied' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-800 border-slate-800 hover:bg-slate-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}
                               >
                                 <Save size={12} /> {copyStatus === 'copied' ? t('copied') : t('copyToClipboard')}
                               </button>
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
                      
                      <div className="flex gap-1 border border-border p-1 bg-slate-50 mb-4 overflow-x-auto scrollbar-hide">
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
                            className={`px-3 py-1.5 text-[10px] font-bold border border-border transition-none uppercase tracking-widest ${
                              consultTab === tab.id 
                                ? 'bg-slate-400 text-white border-slate-500 z-10' 
                                : 'bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      <div className="clinical-text text-slate-700 whitespace-pre-wrap leading-relaxed text-xs flex-1 overflow-y-auto custom-scrollbar">
                          {consultTab === 'summary' && (
                            <div className="p-4 bg-slate-50 border border-border max-w-none">
                              <div className="prose prose-slate prose-xs max-w-none text-slate-800">
                                <ReactMarkdown>{aiInsight.summary}</ReactMarkdown>
                              </div>
                            </div>
                          )}
                          {consultTab === 'actions' && (
                            <div className="p-4 bg-white border border-border">
                              <div className="flex justify-end mb-2">
                                <button 
                                  onClick={() => addTaskFromInsight(aiInsight.actions)}
                                  className="px-2 py-1 bg-slate-800 text-white text-[8px] font-bold uppercase tracking-widest border border-slate-800 hover:bg-slate-700 transition-none flex items-center gap-1"
                                >
                                  <Plus size={10} /> {t('addToTasks')}
                                </button>
                              </div>
                              <div className="prose prose-slate prose-xs max-w-none text-slate-800">
                                <ReactMarkdown>{aiInsight.actions}</ReactMarkdown>
                              </div>
                              {!aiInsight.actions && <p className="text-slate-400 italic p-6 text-center uppercase tracking-widest text-[9px]">{t('noActions')}</p>}
                            </div>
                          )}
                          {consultTab === 'diagnostics' && (
                            <div className="p-4 bg-white border border-border">
                              <div className="flex justify-end mb-2">
                                <button 
                                  onClick={() => addTaskFromInsight(aiInsight.diagnostics)}
                                  className="px-2 py-1 bg-slate-800 text-white text-[8px] font-bold uppercase tracking-widest border border-slate-800 hover:bg-slate-700 transition-none flex items-center gap-1"
                                >
                                  <Plus size={10} /> {t('addToTasks')}
                                </button>
                              </div>
                              <div className="prose prose-slate prose-xs max-w-none text-slate-800">
                                <ReactMarkdown>{aiInsight.diagnostics}</ReactMarkdown>
                              </div>
                              {!aiInsight.diagnostics && <p className="text-slate-400 italic p-6 text-center uppercase tracking-widest text-[9px]">{t('noDiagnostics')}</p>}
                            </div>
                          )}
                          {consultTab === 'education' && (
                            <div className="p-4 bg-white border border-border">
                              <div className="prose prose-slate prose-xs max-w-none text-slate-800">
                                <ReactMarkdown>{aiInsight.education}</ReactMarkdown>
                              </div>
                              {!aiInsight.education && <p className="text-slate-400 italic p-6 text-center uppercase tracking-widest text-[9px]">{t('noEducation')}</p>}
                            </div>
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
    <div className={platform}>
      {isInactive && <Screensaver onWake={() => setIsInactive(false)} />}
      
      {!isAuthorized && !isGuestMode && (
        <PasswordLock 
          onUnlock={() => {
            setIsAuthorized(true);
            setIsGuestMode(false);
            sessionStorage.setItem('ai-medica-authorized', 'true');
            sessionStorage.removeItem('ai-medica-guest-mode');
          }} 
          onBypass={() => {
            setIsAuthorized(true);
            setIsGuestMode(true);
            sessionStorage.setItem('ai-medica-authorized', 'true');
            sessionStorage.setItem('ai-medica-guest-mode', 'true');
            // Force reload to apply guest mode storage prefix
            window.location.reload();
          }}
        />
      )}

      {/* Security Alert */}
      {showSecurityAlert && (
        <div className="fixed top-4 right-4 z-[150] w-full max-w-sm bg-white border-4 border-red-600 p-4 shadow-[8px_8px_0px_0px_rgba(220,38,38,0.2)] animate-slide-in">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-600">
              <AlertTriangle className="text-white" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-red-600 uppercase tracking-tight">Security Alert</h3>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">Unauthorized Guest activity detected on this device.</p>
              <div className="flex gap-2 mt-3">
                <button 
                  onClick={() => {
                    readLogs();
                    setShowSecurityAlert(false);
                  }}
                  className="px-3 py-1.5 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-red-700 transition-all"
                >
                  Read Logs (AI)
                </button>
                <button 
                  onClick={() => {
                    setGuestLogs([]);
                    setShowSecurityAlert(false);
                  }}
                  className="px-3 py-1.5 bg-white text-red-600 border-2 border-red-600 text-[9px] font-black uppercase tracking-widest hover:bg-red-50 transition-all"
                >
                  Clear Logs
                </button>
              </div>
            </div>
            <button onClick={() => setShowSecurityAlert(false)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {showPasswordChange && (
        <div className="fixed inset-0 z-[150] bg-slate-900/40 flex items-center justify-center p-4 transition-none">
          <div className="bg-white border-4 border-slate-800 p-6 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(30,41,59,1)] transition-none">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-800">
                <Key className="text-white" size={20} />
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Update Password</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">New Password</label>
                <input 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-3 bg-slate-50 border-2 border-slate-200 font-bold text-sm outline-none focus:border-slate-800 transition-none"
                  placeholder="MIN 4 CHARACTERS"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Confirm Password</label>
                <input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-3 bg-slate-50 border-2 border-slate-200 font-bold text-sm outline-none focus:border-slate-800 transition-none"
                  placeholder="REPEAT PASSWORD"
                />
              </div>
              {passwordError && <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{passwordError}</p>}
              
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setShowPasswordChange(false)}
                  className="flex-1 py-3 bg-white text-slate-800 font-bold border-2 border-slate-200 uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-none"
                >
                  Cancel
                </button>
                <button 
                  onClick={handlePasswordChange}
                  className="flex-1 py-3 bg-slate-800 text-white font-bold border-2 border-slate-800 uppercase tracking-widest text-[10px] hover:bg-slate-700 transition-none"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 transition-none">
          <div className="bg-white border-4 border-slate-800 p-6 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(30,41,59,1)] transition-none">
            <h3 className="text-lg font-black text-slate-800 mb-4 uppercase tracking-tight">{t('savePatientRecord')}</h3>
            <input 
              type="text" 
              placeholder={t('enterPatientName')} 
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              className="w-full p-3 bg-slate-50 border-2 border-slate-200 font-bold text-slate-800 outline-none focus:border-slate-800 transition-none mb-4 text-sm"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowSaveModal(false)} className="flex-1 py-3 bg-white text-slate-600 font-bold border-2 border-slate-200 uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-none">{t('cancel')}</button>
              <button 
                onClick={() => {
                  if (!patientName) return;
                  setShowSaveConfirm(true);
                }} 
                className="flex-1 py-3 bg-slate-800 text-white font-bold border-2 border-slate-800 uppercase tracking-widest text-[10px] hover:bg-slate-700 transition-none"
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Confirmation Dialog */}
      {showSaveConfirm && (
        <div className="fixed inset-0 z-[160] bg-slate-900/60 flex items-center justify-center p-4 transition-none">
          <div className="bg-white border-4 border-red-600 p-6 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(220,38,38,0.2)] animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-600">
                <AlertTriangle className="text-white" size={20} />
              </div>
              <h3 className="text-lg font-black text-red-600 uppercase tracking-tight">{t('saveConfirmation')}</h3>
            </div>
            <p className="text-xs font-bold text-slate-600 uppercase leading-relaxed mb-6">
              {t('confirmSave')}
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowSaveConfirm(false)} 
                className="flex-1 py-3 bg-white text-slate-400 font-bold border-2 border-slate-200 uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-none"
              >
                {t('cancel')}
              </button>
              <button 
                onClick={savePatient} 
                className="flex-1 py-3 bg-red-600 text-white font-bold border-2 border-red-600 uppercase tracking-widest text-[10px] hover:bg-red-700 transition-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
              >
                {t('confirm')}
              </button>
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
              <div className="p-2 bg-slate-800">
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

        {/* Desktop Title Bar */}
        <div className="bg-slate-800 px-3 py-1.5 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <Activity className="text-emerald-400" size={14} />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">
              {t('appName')} - <span className="text-slate-400 font-medium">Clinical Workstation v2.5</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 mr-4">
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">
                  {isOnline ? t('cloudAiActive') : t('localAiActive')}
                </span>
              </div>
              {isGuestMode && (
                <span className="text-[8px] font-black uppercase tracking-widest text-red-400 animate-pulse">
                  Guest Mode
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600 cursor-pointer hover:brightness-110" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-600 cursor-pointer hover:brightness-110" />
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 border border-red-600 cursor-pointer hover:brightness-110" />
            </div>
          </div>
        </div>

        {/* Desktop Menu Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-2 py-0.5 flex items-center gap-1">
          {(['Home', 'View', 'Settings'] as const).map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveRibbonTab(tab)}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wide transition-all rounded-sm ${activeRibbonTab === tab ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              {tab}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 pr-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Desktop Toolbar (Unified Header) */}
        <header className="app-toolbar bg-white border-b border-slate-200 p-1.5 flex items-center gap-4 overflow-x-auto no-scrollbar">
          {activeRibbonTab === 'Home' && (
            <>
              <div className="toolbar-group flex items-center gap-1 pr-4 border-r border-slate-100">
                {[
                  ...BOTTOM_NAV_SECTIONS, 
                  { id: 'patients', name: t('records'), icon: <FolderOpen size={14} className="text-blue-400" /> }
                ].map((s) => (
                  <button 
                    key={s.id} 
                    onClick={() => setActiveTab(s.id)} 
                    className={`toolbar-button flex flex-col items-center justify-center min-w-[48px] p-1 rounded hover:bg-slate-100 transition-all ${activeTab === s.id ? 'bg-slate-800 text-white shadow-inner' : 'text-slate-700'}`}
                  >
                    {s.icon}
                    <span className="text-[7px] font-bold uppercase mt-0.5">{s.name}</span>
                  </button>
                ))}
                <button 
                  onClick={() => setActiveTab('prescription')} 
                  className={`toolbar-button flex flex-col items-center justify-center min-w-[48px] p-1 rounded hover:bg-slate-100 transition-all ${activeTab === 'prescription' ? 'bg-emerald-600 text-white shadow-inner' : 'text-slate-700'}`}
                >
                  <Calculator size={14} className={activeTab === 'prescription' ? 'text-white' : 'text-emerald-500'} />
                  <span className="text-[7px] font-bold uppercase mt-0.5">Synthesis</span>
                </button>
              </div>

              <div className="toolbar-group flex items-center gap-1 pr-4 border-r border-slate-100">
                <button onClick={() => setShowSaveModal(true)} className="toolbar-button flex flex-col items-center justify-center min-w-[48px] p-1 rounded hover:bg-slate-100 text-slate-700">
                  <Save size={14} className="text-blue-600" />
                  <span className="text-[7px] font-bold uppercase mt-0.5">{t('save')}</span>
                </button>
                <button onClick={() => setIsSpeechEnabled(!isSpeechEnabled)} className={`toolbar-button flex flex-col items-center justify-center min-w-[48px] p-1 rounded hover:bg-slate-100 transition-all ${isSpeechEnabled ? 'bg-slate-800 text-white' : 'text-slate-700'}`}>
                  {isSpeechEnabled ? <Volume2 size={14} className="text-emerald-400" /> : <VolumeX size={14} className="text-slate-400" />}
                  <span className="text-[7px] font-bold uppercase mt-0.5">Speech</span>
                </button>
                <button onClick={handleAboutPress} className="toolbar-button flex flex-col items-center justify-center min-w-[48px] p-1 rounded hover:bg-slate-100 text-slate-700">
                  <Info size={14} className="text-blue-500" />
                  <span className="text-[7px] font-black uppercase mt-0.5">About</span>
                </button>
              </div>
            </>
          )}

          {activeRibbonTab === 'View' && (
            <>
              <div className="toolbar-group flex items-center gap-1 pr-4 border-r border-slate-100">
                <button onClick={toggleNightMode} className={`toolbar-button flex flex-col items-center justify-center min-w-[48px] p-1 rounded hover:bg-slate-100 transition-all ${isNightMode ? 'bg-slate-800 text-white' : 'text-slate-700'}`}>
                  {isNightMode ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} className="text-slate-400" />}
                  <span className="text-[7px] font-bold uppercase mt-0.5">Night Mode</span>
                </button>
                <button onClick={toggleEyeComfort} className={`toolbar-button flex flex-col items-center justify-center min-w-[48px] p-1 rounded hover:bg-slate-100 transition-all ${isEyeComfort ? 'bg-emerald-500 text-white' : 'text-slate-700'}`}>
                  <Eye size={14} className={isEyeComfort ? 'text-white' : 'text-emerald-500'} />
                  <span className="text-[7px] font-bold uppercase mt-0.5">Comfort</span>
                </button>
              </div>
              <div className="toolbar-group flex items-center gap-1 pr-4 border-r border-slate-100">
                <button onClick={() => setIsSpeechEnabled(true)} className={`toolbar-button flex flex-col items-center justify-center min-w-[48px] p-1 rounded hover:bg-slate-100 transition-all ${isSpeechEnabled ? 'bg-slate-800 text-white' : 'text-slate-700'}`}>
                  <Volume2 size={14} className={isSpeechEnabled ? 'text-white' : 'text-blue-500'} />
                  <span className="text-[7px] font-bold uppercase mt-0.5">Voice On</span>
                </button>
                <button onClick={() => setIsSpeechEnabled(false)} className={`toolbar-button flex flex-col items-center justify-center min-w-[48px] p-1 rounded hover:bg-slate-100 transition-all ${!isSpeechEnabled ? 'bg-slate-800 text-white' : 'text-slate-700'}`}>
                  <VolumeX size={14} className={!isSpeechEnabled ? 'text-white' : 'text-slate-400'} />
                  <span className="text-[7px] font-bold uppercase mt-0.5">Voice Off</span>
                </button>
              </div>
            </>
          )}

          {activeRibbonTab === 'Settings' && (
            <>
              <div className="toolbar-group flex items-center gap-1 pr-4 border-r border-slate-100">
                <button onClick={() => setLanguage('en')} className={`toolbar-button flex flex-col items-center justify-center min-w-[48px] p-1 rounded hover:bg-slate-100 transition-all ${language === 'en' ? 'bg-slate-800 text-white' : 'text-slate-700'}`}>
                  <Languages size={14} className={language === 'en' ? 'text-white' : 'text-blue-500'} />
                  <span className="text-[7px] font-bold uppercase mt-0.5">English</span>
                </button>
                <button onClick={() => setLanguage('sw')} className={`toolbar-button flex flex-col items-center justify-center min-w-[48px] p-1 rounded hover:bg-slate-100 transition-all ${language === 'sw' ? 'bg-slate-800 text-white' : 'text-slate-700'}`}>
                  <Languages size={14} className={language === 'sw' ? 'text-white' : 'text-red-500'} />
                  <span className="text-[7px] font-bold uppercase mt-0.5">Swahili</span>
                </button>
              </div>
              <div className="toolbar-group flex items-center gap-1 pr-4 border-r border-slate-100">
                <button onClick={() => setShowPasswordChange(true)} className="toolbar-button flex flex-col items-center justify-center min-w-[48px] p-1 rounded hover:bg-slate-100 text-slate-700">
                  <Lock size={14} className="text-slate-800" />
                  <span className="text-[7px] font-bold uppercase mt-0.5">Security</span>
                </button>
                <button onClick={readLogs} className="toolbar-button flex flex-col items-center justify-center min-w-[48px] p-1 rounded hover:bg-slate-100 text-slate-700">
                  <ShieldCheck size={14} className="text-red-600" />
                  <span className="text-[7px] font-bold uppercase mt-0.5">Logs</span>
                </button>
                <button onClick={handleLogout} className="toolbar-button flex flex-col items-center justify-center min-w-[48px] p-1 rounded hover:bg-red-50 text-slate-700">
                  <X size={14} className="text-red-500" />
                  <span className="text-[7px] font-bold uppercase mt-0.5">Logout</span>
                </button>
                <button onClick={() => {
                  setSavedPatients([]);
                  logGuestAction('Cleared all patient records from the database');
                }} className="toolbar-button flex flex-col items-center justify-center min-w-[48px] p-1 rounded hover:bg-red-50 text-slate-700">
                  <Trash2 size={14} className="text-red-500" />
                  <span className="text-[7px] font-bold uppercase mt-0.5">Reset</span>
                </button>
              </div>
            </>
          )}
        </header>

      <main className="flex-1 overflow-y-auto bg-slate-50 p-4">
        <div className="bg-white border border-slate-200 shadow-sm rounded-md min-h-full p-6">
          {renderContent()}
        </div>
      </main>

      <Toaster position="top-right" />
    </div>
  );
};

export default App;
