export type AgeGroup = 'Adult' | 'Pediatric' | 'Neonate';
export type SynthesisFormat = 'Standard' | 'SBAR' | 'SOAP';
export type SynthesisDepth = 'Concise' | 'Standard' | 'Detailed';

export interface SynthesisOptions {
  depth: SynthesisDepth;
  focus: 'Diagnostic' | 'Therapeutic' | 'Educational' | 'Surgical' | 'Clinical' | 'Nursing';
  format: SynthesisFormat;
  includeDifferential?: boolean;
  includePrognosis?: boolean;
  includeHandover?: boolean;
}

export enum Type {
  TYPE_UNSPECIFIED = "TYPE_UNSPECIFIED",
  STRING = "STRING",
  NUMBER = "NUMBER",
  INTEGER = "INTEGER",
  BOOLEAN = "BOOLEAN",
  ARRAY = "ARRAY",
  OBJECT = "OBJECT",
  NULL = "NULL",
}

export interface SavedPatient {
  id: string;
  serialNumber: string;
  name: string;
  date: string;
  ageGroup: AgeGroup;
  data: PatientData;
  aiInsight?: any;
}

export interface PEWSState {
  behavior: number; // 0-3
  cardiovascular: number; // 0-3
  respiratory: number; // 0-3
  nebulizer: boolean;
  persistentVomiting: boolean;
}

export interface GCSState {
  eye: number;
  verbal: number;
  motor: number;
}

export interface SIRSState {
  temp: number | '';
  heartRate: number | '';
  respRate: number | '';
  wbc: number | '';
  bands: number | '';
}

export interface QSOFAState {
  lowBP: boolean;
  highRR: boolean;
  alteredMentation: boolean;
}

export interface MEWSState {
  sbp: number;
  hr: number;
  rr: number;
  temp: number;
  avpu: number; // 0=Alert, 1=Voice, 2=Pain, 3=Unresponsive
}

export interface LiverState {
  bilirubin: number | '';
  albumin: number | '';
  inr: number | '';
  creatinine: number | '';
  sodium: number | '';
  ascites: number; // 1=None, 2=Mild, 3=Severe
  encephalopathy: number; // 1=None, 2=Grade 1-2, 3=Grade 3-4
  dialysis: boolean;
}

export interface ExamState {
  jvp: number | '';
  capRefill: number | '';
  skinTurgor: string; // "Normal", "Poor", "Very Poor"
  mucosa: string; // "Moist", "Dry", "Parched"
  pulseGrade: number; // 0-3
  muscleStrength: number; // 0-5
}

export interface SurgicalState {
  asa: number;
  age: number | '';
  preOpSpO2: number | '';
  respInfection: boolean;
  preOpAnemia: boolean;
  surgeryType: string;
  duration: string;
}

export interface CURB65State {
  confusion: boolean;
  urea: boolean;
  rr: boolean;
  bp: boolean;
  age: boolean;
}

export interface CHADS2VAScState {
  chf: boolean;
  htn: boolean;
  age75: boolean;
  dm: boolean;
  stroke: boolean;
  vascular: boolean;
  age65: boolean;
  female: boolean;
}

export interface MachineData {
  id: string;
  type: 'CBC' | 'GeneXpert' | 'Truenat' | 'X-ray' | 'Glucometer' | 'PulseOx' | 'ECG' | 'Other';
  timestamp: string;
  rawContent: string; // Base64 for images, text for others
  mimeType?: string;
  interpretation?: string;
  metadata?: Record<string, any>;
  deviceName?: string;
}

export interface PHQ9State {
  q1: number; // 0-3
  q2: number;
  q3: number;
  q4: number;
  q5: number;
  q6: number;
  q7: number;
  q8: number;
  q9: number;
}

export interface GAD7State {
  q1: number; // 0-3
  q2: number;
  q3: number;
  q4: number;
  q5: number;
  q6: number;
  q7: number;
}

export interface AMTSState {
  age: boolean;
  time: boolean;
  address: boolean;
  year: boolean;
  place: boolean;
  recognition: boolean;
  dob: boolean;
  monarch: boolean; // or president
  ww2: boolean;
  countBackwards: boolean;
}

export interface PatientData {
  gcs: GCSState;
  sirs: SIRSState;
  qsofa: QSOFAState;
  mews: MEWSState;
  liver: LiverState;
  exam: ExamState;
  surgery: SurgicalState;
  curb65: CURB65State;
  chads: CHADS2VAScState;
  pews: PEWSState;
  phq9: PHQ9State;
  gad7: GAD7State;
  amts: AMTSState;
  ageGroup: AgeGroup;
  notes: string;
  anthro?: { waist: number | ''; height: number | ''; hip: number | ''; weight: number | ''; };
  machineData?: MachineData[];
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  patientId?: string;
  patientName?: string;
  createdAt: string;
  completedAt?: string;
}
