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

export interface PatientData {
  gcs: GCSState;
  sirs: SIRSState;
  qsofa: QSOFAState;
  mews: MEWSState;
  liver: LiverState;
  exam: ExamState;
  surgery: SurgicalState;
  curb65: {
    confusion: boolean;
    urea: boolean;
    rr: boolean;
    bp: boolean;
    age: boolean;
  };
  anthro: {
    waist: number | '';
    height: number | '';
  };
  notes: string;
}
