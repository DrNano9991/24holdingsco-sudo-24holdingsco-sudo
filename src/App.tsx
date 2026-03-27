import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { 
  Activity, Brain, Wind, Stethoscope, ShieldCheck, Moon, Sun, Calculator, AlertCircle, Eye, Zap,
  Volume2, VolumeX, Info, X, Languages, Pill, Lock, Key, Clock, Database, Mic, ChevronUp, ChevronDown
} from 'lucide-react';
import { GCSState, SIRSState, QSOFAState, MEWSState, LiverState, ExamState, SurgicalState, PatientData, SavedPatient, Task, MachineData, SynthesisOptions } from './types';
import { BOTTOM_NAV_SECTIONS } from './constants';
import ScoreCard from './components/ScoreCard';
import { clinicalAI, SynthesisResult } from './services/clinicalAI';
import { ScoringEngine } from './services/scoringEngine';
import { useLocalStorage } from './hooks/useLocalStorage';
import ScoreSummaryPanel from './components/ScoreSummaryPanel';
import { AgeGroup, PEWSState } from './types';
import { Save, FolderOpen, Trash2, UserPlus, CheckCircle2, AlertTriangle, CheckSquare, Check, Plus } from 'lucide-react';
import { useTranslation } from './contexts/TranslationContext';
import { logger } from './services/logger';
import { toast, Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

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
const ECGAnimation = lazy(() => import('./components/ECGAnimation'));

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
  const [synthesisOptions, setSynthesisOptions] = useLocalStorage<SynthesisOptions>('ai-medica-synthesis-options', {
    depth: 'Detailed',
    focus: 'Clinical',
    format: 'Standard',
    includeDifferential: true,
    includePrognosis: true,
    includeHandover: true
  });
  const [isListening, setIsListening] = useState(false);
  const [differentialExpanded, setDifferentialExpanded] = useState(false);

  const parseDifferential = (text: string) => {
    const sectionMatch = text.match(/DIFFERENTIAL DIAGNOSES\n([\s\S]*?)(?=\n\n\n|$)/i);
    if (!sectionMatch) return null;
    return sectionMatch[1].trim().split('\n').map(line => line.replace(/^\d+\s+/, '').trim()).filter(Boolean);
  };

  const handleVoiceCommand = () => {
    const recognition = speechService.createRecognition({
      onStart: () => {
        setIsListening(true);
        toast('Listening for commands...', { icon: '🎙️' });
      },
      onResult: (transcript) => {
        const command = speechService.parseCommand(transcript) as { type: string; value?: any; field?: string } | null;
        if (!command) {
          toast.error(`Command not recognized: "${transcript}"`);
          return;
        }

        switch (command.type) {
          case 'NAVIGATE':
            setActiveTab(command.value);
            toast.success(`Navigating to ${command.value}`);
            break;
          case 'SET_DEPTH':
            setSynthesisOptions(prev => ({ ...prev, depth: command.value }));
            toast.success(`Depth set to ${command.value}`);
            break;
          case 'SET_FOCUS':
            setSynthesisOptions(prev => ({ ...prev, focus: command.value }));
            toast.success(`Focus set to ${command.value}`);
            break;
          case 'SET_FORMAT':
            setSynthesisOptions(prev => ({ ...prev, format: command.value }));
            toast.success(`Format set to ${command.value}`);
            break;
          case 'ADD_TASK':
            const newTask: Task = {
              id: Math.random().toString(36).substr(2, 9),
              text: command.value,
              completed: false,
              priority: 'medium',
              createdAt: new Date().toISOString()
            };
            setTasks([...tasks, newTask]);
            toast.success(`Task added: ${command.value}`);
            break;
          case 'SET_WEIGHT':
            setAnthro({ ...anthro, weight: command.value });
            toast.success(`Weight set to ${command.value}kg`);
            break;
          case 'SET_PATIENT_NAME':
            setPatientName(command.value);
            toast.success(`Patient name set to ${command.value}`);
            break;
          case 'SET_EXAM':
            setExam({ ...exam, [command.field]: command.value });
            toast.success(`${command.field} set to ${command.value}`);
            break;
          case 'GENERATE_INSIGHT':
            handleConsult();
            break;
          case 'STOP_SPEECH':
            speechService.stop();
            toast.success('Speech stopped');
            break;
          case 'TOGGLE_NIGHT_MODE':
            toggleNightMode();
            break;
          case 'TOGGLE_EYE_COMFORT':
            toggleEyeComfort();
            break;
          default:
            toast.error('Command type not handled');
        }
      },
      onError: () => {
        setIsListening(false);
        toast.error('Voice recognition error');
      },
      onEnd: () => {
        setIsListening(false);
      }
    });

    if (recognition) {
      recognition.start();
    } else {
      toast.error('Voice commands not supported in this browser');
    }
  };
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
  const [ecgRhythm, setEcgRhythm] = useState<'normal' | 'vtach' | 'atach' | 'vfib' | 'asystole'>('normal');

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
      amts,
      chads,
      curb65,
      wellsPE
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
      speechService.speak(`${newTasks.length} tasks added to your clinical list.`);
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

  const renderContent = () => {
    switch (activeTab) {
      case 'calculators':
        return (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">{t('calculators')}</h2>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Clinical Scoring & Risk Assessment</p>
                </div>
                <button 
                  onClick={handleVoiceCommand}
                  className="p-2 bg-muted text-muted-foreground hover:bg-accent border border-border rounded-xl transition-all"
                  title="Voice Input"
                >
                  <Mic size={18} />
                </button>
              </div>
              <div className="flex bg-muted p-1 rounded-xl border border-border">
                {(['Adult', 'Pediatric', 'Neonate'] as const).map((group) => (
                  <button
                    key={group}
                    onClick={() => handleAgeGroupChange(group)}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                      ageGroup === group 
                        ? 'bg-primary text-primary-foreground shadow-md' 
                        : 'text-muted-foreground hover:bg-accent'
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Scores moved to Physical Exam */}
            </div>
          </div>
        );
      case 'prescription':
        return (
          <div className="space-y-8">
            <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
              <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
                <Pill className="text-primary" /> {t('prescription')}
              </h2>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Dosing & Administration</p>
            </div>
            <Suspense fallback={<LoadingFallback />}>
              <PrescriptionCalculator 
                patientData={{
                  gcs, sirs, qsofa, mews, liver, exam, surgery, curb65, chads, pews, ageGroup, notes, anthro, machineData,
                  phq9, gad7, amts
                }}
                ageGroup={ageGroup}
                onVoiceCommand={handleVoiceCommand}
              />
            </Suspense>
          </div>
        );
      case 'exam':
        return (
          <div className="space-y-8">
            <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
              <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
                <Activity className="text-primary" /> {t('physicalExam')}
              </h2>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Clinical Findings & Anthropometry</p>
            </div>
            <PhysicalExam 
              exam={exam} setExam={setExam}
              liver={liver} setLiver={setLiver}
              anthro={anthro} setAnthro={setAnthro}
              chads={chads} setChads={setChads}
              curb65={curb65} setCurb65={setCurb65}
              wellsPE={wellsPE} setWellsPE={setWellsPE}
              onVoiceCommand={handleVoiceCommand}
            />
          </div>
        );
      case 'patients':
        return (
          <div className="space-y-8">
            <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-border shadow-sm">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
                    <FolderOpen className="text-primary" /> {t('savedPatients')}
                  </h2>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Clinical History & Records</p>
                </div>
                <button 
                  onClick={handleVoiceCommand}
                  className="p-2 bg-muted text-muted-foreground hover:bg-accent border border-border rounded-xl transition-all"
                  title="Voice Input"
                >
                  <Mic size={18} />
                </button>
              </div>
              <button 
                onClick={() => setActiveTab('calculators')} 
                className="p-3 bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all"
              >
                <UserPlus size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedPatients.map(p => (
                <motion.div 
                  key={p.id} 
                  whileHover={{ y: -4 }}
                  className="bg-card p-5 rounded-2xl border border-border hover:border-primary/50 transition-all group shadow-sm hover:shadow-md"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-foreground leading-tight">{p.name}</h3>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">{p.serialNumber}</p>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-1">{new Date(p.date).toLocaleString()}</p>
                    </div>
                    <span className="px-2 py-1 bg-muted text-muted-foreground text-[9px] font-bold rounded-lg border border-border uppercase">{t(p.ageGroup.toLowerCase() as any)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => loadPatient(p)}
                      className="flex-1 py-2.5 bg-muted hover:bg-accent text-foreground text-[10px] font-bold rounded-xl border border-border transition-all uppercase tracking-widest"
                    >
                      {t('loadData')}
                    </button>
                    <button 
                      onClick={() => deletePatient(p.id)}
                      className="p-2.5 bg-destructive/10 hover:bg-destructive text-destructive hover:text-destructive-foreground rounded-xl border border-destructive/20 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
              {savedPatients.length === 0 && (
                <div className="col-span-full py-20 text-center bg-muted/30 rounded-3xl border-2 border-dashed border-border">
                  <FolderOpen size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">{t('noSavedPatients')}</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'tasks':
        return (
          <Suspense fallback={<div className="flex items-center justify-center p-20"><Activity className="animate-pulse text-primary" /></div>}>
            <TaskList 
              tasks={tasks} 
              setTasks={setTasks} 
              patients={savedPatients} 
            />
          </Suspense>
        );
      case 'diagnostics':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Monitoring Section */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white border-4 border-slate-800 p-4 shadow-[8px_8px_0px_0px_rgba(30,41,59,1)]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Activity className="text-primary" size={20} />
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Real-Time Telemetry</h3>
                    </div>
                    <div className="flex gap-1">
                      {(['normal', 'vtach', 'atach', 'vfib', 'asystole'] as const).map(r => (
                        <button
                          key={r}
                          onClick={() => setEcgRhythm(r)}
                          className={`px-2 py-1 text-[8px] font-black uppercase tracking-tighter border-2 transition-all ${
                            ecgRhythm === r 
                              ? 'bg-primary text-white border-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                              : 'bg-white text-slate-500 border-slate-200 hover:border-primary'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Suspense fallback={<LoadingFallback />}>
                    <ECGAnimation rhythm={ecgRhythm} onRhythmChange={(r) => setEcgRhythm(r as any)} />
                  </Suspense>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    {[
                      { label: 'SpO2', value: '98', unit: '%', color: 'text-blue-600', trend: 'stable' },
                      { label: 'Pulse', value: ecgRhythm === 'asystole' ? '0' : ecgRhythm === 'vtach' ? '160' : '72', unit: 'bpm', color: 'text-emerald-600', trend: 'up' },
                      { label: 'NIBP', value: '120/80', unit: 'mmHg', color: 'text-slate-700', trend: 'stable' },
                      { label: 'Temp', value: '36.8', unit: '°C', color: 'text-orange-600', trend: 'stable' }
                    ].map((stat, i) => (
                      <div key={i} className="p-3 bg-slate-50 border-2 border-slate-200 rounded-lg">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className={`text-xl font-black ${stat.color}`}>{stat.value}</span>
                          <span className="text-[10px] font-bold text-slate-400">{stat.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border-4 border-slate-800 p-4 shadow-[8px_8px_0px_0px_rgba(30,41,59,1)]">
                  <div className="flex items-center gap-2 mb-4">
                    <Database className="text-primary" size={20} />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Diagnostic Data Import</h3>
                  </div>
                  <Suspense fallback={<LoadingFallback />}>
                    <MachineDataImport 
                      machineData={machineData}
                      onAddData={(data) => {
                        setMachineData([data, ...machineData]);
                        logGuestAction(`Added machine data: ${data.type} - ${data.interpretation || 'No interpretation'}`);
                        toast.success(`Imported ${data.type} data`);
                      }}
                      onRemoveData={(id) => setMachineData(machineData.filter(d => d.id !== id))}
                      onClearAll={() => setMachineData([])}
                    />
                  </Suspense>
                </div>
              </div>

              {/* Diagnostic History & Analysis */}
              <div className="space-y-4">
                <div className="bg-white border-4 border-slate-800 p-4 shadow-[8px_8px_0px_0px_rgba(30,41,59,1)] h-full min-h-[400px]">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Device History</h3>
                  {machineData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                        <Database className="text-slate-300" size={24} />
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No device data imported yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {machineData.map((data, idx) => (
                        <div key={idx} className="p-3 border-2 border-slate-200 rounded-lg hover:border-primary transition-colors group">
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-0.5 bg-slate-100 text-[8px] font-black uppercase rounded">{data.type}</span>
                            <span className="text-[8px] font-bold text-slate-400">{new Date(data.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-600 line-clamp-2 mb-2">{data.interpretation || 'Awaiting AI analysis...'}</p>
                          <button 
                            onClick={() => {
                              setMachineData(machineData.filter((_, i) => i !== idx));
                              toast.success('Record removed');
                            }}
                            className="text-[8px] font-black text-red-500 uppercase opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Delete Record
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
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
                             <button 
                               onClick={handleVoiceCommand}
                               className="ml-2 p-1.5 bg-slate-50 text-slate-400 hover:text-slate-600 border border-border transition-all"
                               title="Voice Input"
                             >
                               <Mic size={14} />
                             </button>
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
                               {(['Diagnostic', 'Therapeutic', 'Educational'] as const).map(f => (
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
                               {(['Concise', 'Standard', 'Detailed'] as const).map(d => (
                                 <button
                                   key={d}
                                   onClick={() => setSynthesisOptions({ ...synthesisOptions, depth: d })}
                                   className={`px-3 py-1.5 text-[8px] font-bold uppercase tracking-tight border border-border transition-none ${synthesisOptions.depth === d ? 'bg-slate-400 text-white border-slate-500 z-10' : 'text-slate-400 hover:text-slate-600'}`}
                                 >
                                   {d}
                                 </button>
                                ))}
                            </div>
                             <div className="flex items-center gap-1 border border-border bg-slate-50 p-1">
                                {(['Standard', 'SBAR', 'SOAP'] as const).map(fmt => (
                                  <button
                                    key={fmt}
                                    onClick={() => setSynthesisOptions({ ...synthesisOptions, format: fmt })}
                                    className={`px-3 py-1.5 text-[8px] font-bold uppercase tracking-tight border border-border transition-none ${synthesisOptions.format === fmt ? 'bg-slate-400 text-white border-slate-500 z-10' : 'text-slate-400 hover:text-slate-600'}`}
                                  >
                                    {fmt}
                                  </button>
                                 ))}
                             </div>
                             <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 border border-border">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={synthesisOptions.includeDifferential} 
                                    onChange={e => setSynthesisOptions({...synthesisOptions, includeDifferential: e.target.checked})}
                                    className="w-3 h-3 accent-primary"
                                  />
                                  <span className="text-[8px] font-bold uppercase text-slate-600">Differential</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={synthesisOptions.includePrognosis} 
                                    onChange={e => setSynthesisOptions({...synthesisOptions, includePrognosis: e.target.checked})}
                                    className="w-3 h-3 accent-primary"
                                  />
                                  <span className="text-[8px] font-bold uppercase text-slate-600">Prognosis</span>
                                </label>
                             </div>
                            <div className="flex flex-wrap items-center gap-3">
                               <button 
                                 onClick={handleVoiceCommand}
                                 className={`p-1.5 border-2 transition-all flex items-center justify-center ${isListening ? 'bg-red-600 text-white border-red-600 animate-pulse' : 'bg-white text-slate-800 border-slate-800 hover:bg-slate-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}
                                 title="Voice Commands"
                               >
                                 <Mic size={14} />
                               </button>
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
                            <div className="flex flex-col gap-4">
                              {aiInsight.summary.includes('DIFFERENTIAL DIAGNOSES') && (
                                <div className="bg-amber-50 border-2 border-amber-200 p-3 shadow-[4px_4px_0px_0px_rgba(251,191,36,0.1)]">
                                  <button 
                                    onClick={() => setDifferentialExpanded(!differentialExpanded)}
                                    className="w-full flex justify-between items-center text-[10px] font-black text-amber-800 uppercase tracking-widest"
                                  >
                                    <div className="flex items-center gap-2">
                                      <AlertCircle size={14} />
                                      <span>Differential Diagnoses</span>
                                    </div>
                                    {differentialExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  </button>
                                  {differentialExpanded && (
                                    <div className="mt-3 grid grid-cols-1 gap-2">
                                      {parseDifferential(aiInsight.summary)?.map((diff, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-2 bg-white border border-amber-200 text-[10px] font-bold text-slate-700 uppercase tracking-tight">
                                          <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                                          {diff}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="p-4 bg-slate-50 border border-border max-w-none">
                                <div className="prose prose-slate prose-xs max-w-none text-slate-800">
                                  <ReactMarkdown>{aiInsight.summary}</ReactMarkdown>
                                </div>
                              </div>
                            </div>
                          )}
                          {consultTab === 'actions' && (
                            <div className="p-4 bg-white border border-border">
                              <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-center bg-slate-50 p-3 border border-border rounded-lg">
                                  <div>
                                    <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Suggested Tasks</h4>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">AI-generated clinical recommendations</p>
                                  </div>
                                  <button 
                                    onClick={() => addTaskFromInsight(aiInsight.actions)}
                                    className="px-3 py-1.5 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest border border-slate-800 hover:bg-slate-700 transition-all flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                  >
                                    <Plus size={12} /> {t('addAllSuggestions')}
                                  </button>
                                </div>
                                <div className="prose prose-slate prose-xs max-w-none text-slate-800">
                                  <ReactMarkdown>{aiInsight.actions}</ReactMarkdown>
                                </div>
                                {!aiInsight.actions && <p className="text-slate-400 italic p-6 text-center uppercase tracking-widest text-[9px]">{t('noActions')}</p>}
                              </div>
                            </div>
                          )}
                          {consultTab === 'diagnostics' && (
                            <div className="p-4 bg-white border border-border">
                              <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-center bg-slate-50 p-3 border border-border rounded-lg">
                                  <div>
                                    <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Diagnostic Workup</h4>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Recommended investigations</p>
                                  </div>
                                  <button 
                                    onClick={() => addTaskFromInsight(aiInsight.diagnostics)}
                                    className="px-3 py-1.5 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest border border-slate-800 hover:bg-slate-700 transition-all flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                  >
                                    <Plus size={12} /> {t('addWorkupToTasks')}
                                  </button>
                                </div>
                                <div className="prose prose-slate prose-xs max-w-none text-slate-800">
                                  <ReactMarkdown>{aiInsight.diagnostics}</ReactMarkdown>
                                </div>
                                {!aiInsight.diagnostics && <p className="text-slate-400 italic p-6 text-center uppercase tracking-widest text-[9px]">{t('noDiagnostics')}</p>}
                              </div>
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
              <div className="bg-white p-3 border border-border transition-none relative">
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder={t('addCaseNotes')} 
                  className="w-full h-20 bg-white border border-border p-3 text-slate-800 outline-none focus:bg-slate-50 transition-none font-medium text-xs pr-10"
                />
                <button 
                  onClick={() => {
                    const recognition = speechService.createRecognition({
                      onStart: () => toast('Listening for notes...', { icon: '🎙️' }),
                      onResult: (transcript) => {
                        setNotes(notes ? notes + ' ' + transcript : transcript);
                        toast.success('Notes updated');
                      },
                      onError: () => toast.error('Voice recognition error')
                    });
                    if (recognition) {
                      recognition.start();
                    } else {
                      toast.error('Voice recognition not supported');
                    }
                  }}
                  className="absolute right-5 bottom-5 p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 border border-border transition-none"
                  title="Voice Input for Notes"
                >
                  <Mic size={14} />
                </button>
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

      <AnimatePresence>
        {isSplashing && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="w-24 h-24 bg-primary/20 rounded-3xl flex items-center justify-center mb-8 border border-primary/30"
            >
              <Activity size={48} className="text-primary animate-pulse" />
            </motion.div>
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-4xl font-bold text-white tracking-tighter mb-2"
            >
              AI Medica <span className="text-primary">UG</span>
            </motion.h1>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-slate-400 text-sm font-medium uppercase tracking-[0.3em]"
            >
              Clinical Decision Support
            </motion.p>
            <div className="mt-12 w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="w-full h-full bg-primary shadow-[0_0_15px_rgba(37,99,235,0.5)]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isInactive && (
        <Screensaver onWake={() => setIsInactive(false)} />
      )}

      {/* Modern Header */}
      <header className="glass-panel sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground leading-none">AI Medica <span className="text-primary">UG</span></h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Clinical Engine v2.5</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 px-3 py-1.5 bg-muted rounded-full border border-border">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {isOnline ? t('online') : t('offline')}
            </span>
          </div>
          
          <button 
            onClick={() => setIsNightMode(!isNightMode)}
            className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            {isNightMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <button 
            onClick={() => setLanguage(language === 'en' ? 'sw' : 'en')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border hover:bg-accent transition-colors"
          >
            <Languages size={14} className="text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{language.toUpperCase()}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar Navigation (Desktop) */}
        <nav className="hidden md:flex flex-col w-20 bg-card border-r border-border p-3 gap-4">
          {[
            { id: 'calculators', icon: <Calculator size={20} />, label: t('calculators') },
            { id: 'exam', icon: <Stethoscope size={20} />, label: t('exam') },
            { id: 'diagnostics', icon: <Activity size={20} />, label: t('diagnostics') },
            { id: 'summary', icon: <Brain size={20} />, label: 'Synthesis' },
            { id: 'prescription', icon: <Pill size={20} />, label: 'Dosing' },
            { id: 'tasks', icon: <CheckSquare size={20} />, label: t('tasks') },
            { id: 'patients', icon: <FolderOpen size={20} />, label: t('records') },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {item.icon}
              <span className="text-[8px] font-bold uppercase tracking-wider">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Content View */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          <div className="max-w-6xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden glass-panel border-t border-border px-2 py-2 flex items-center justify-around">
        {[
          { id: 'calculators', icon: <Calculator size={20} />, label: t('calculators') },
          { id: 'exam', icon: <Stethoscope size={20} />, label: t('exam') },
          { id: 'diagnostics', icon: <Activity size={20} />, label: t('diagnostics') },
          { id: 'summary', icon: <Brain size={20} />, label: 'AI' },
          { id: 'prescription', icon: <Pill size={20} />, label: 'Dosing' },
          { id: 'tasks', icon: <CheckSquare size={20} />, label: t('tasks') },
          { id: 'patients', icon: <FolderOpen size={20} />, label: t('records') },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
              activeTab === item.id 
                ? 'text-primary' 
                : 'text-muted-foreground'
            }`}
          >
            <div className={`p-1.5 rounded-lg ${activeTab === item.id ? 'bg-primary/10' : ''}`}>
              {item.icon}
            </div>
            <span className="text-[8px] font-bold uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Floating Global Voice Command Button */}
      {isAuthorized && (
        <button
          onClick={handleVoiceCommand}
          className={`fixed bottom-24 right-6 z-[100] w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-95 ${
            isListening 
              ? 'bg-red-600 text-white animate-pulse ring-4 ring-red-200' 
              : 'bg-slate-800 text-white border-2 border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
          }`}
          title="Global Voice Command"
        >
          <Mic size={24} />
        </button>
      )}

      <Toaster position="top-right" />
    </div>
  );
};

export default App;
