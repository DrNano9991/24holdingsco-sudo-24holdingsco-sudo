export type AgeGroup = 'Adult' | 'Pediatric' | 'Neonate';

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
  name: string;
  date: string;
  ageGroup: AgeGroup;
  data: PatientData;
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
  ageGroup: AgeGroup;
  notes: string;
}
