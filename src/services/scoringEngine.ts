import { GCSState, SIRSState, QSOFAState, MEWSState, LiverState, SurgicalState, PEWSState, AgeGroup, CHADS2VAScState } from '../types';

export class ScoringEngine {
  static calculateGCS(state: GCSState): number {
    return state.eye + state.verbal + state.motor;
  }

  static calculateSIRS(state: SIRSState): number {
    let count = 0;
    const temp = Number(state.temp);
    const hr = Number(state.heartRate);
    const rr = Number(state.respRate);
    const wbc = Number(state.wbc);
    const bands = Number(state.bands);

    if (state.temp !== '' && (temp > 38 || temp < 36)) count++;
    if (state.heartRate !== '' && hr > 90) count++;
    if (state.respRate !== '' && rr > 20) count++;
    if (state.wbc !== '' && (wbc > 12 || wbc < 4)) count++;
    else if (state.bands !== '' && bands > 10) count++;
    
    return count;
  }

  static calculateQSOFA(state: QSOFAState): number {
    let count = 0;
    if (state.lowBP) count++;
    if (state.highRR) count++;
    if (state.alteredMentation) count++;
    return count;
  }

  static calculateCURB65(state: any): number {
    return Object.values(state).filter(Boolean).length;
  }

  static calculateWellsPE(state: any): number {
    let score = 0;
    if (state.dvtSymptoms) score += 3;
    if (state.peLikely) score += 3;
    if (state.hr100) score += 1.5;
    if (state.immobilization) score += 1.5;
    if (state.priorDvtPe) score += 1.5;
    if (state.hemoptysis) score += 1;
    if (state.malignancy) score += 1;
    return score;
  }

  static calculateCHADS2VASc(state: CHADS2VAScState): number {
    let score = 0;
    if (state.chf) score += 1;
    if (state.htn) score += 1;
    if (state.age75) score += 2;
    if (state.dm) score += 1;
    if (state.stroke) score += 2;
    if (state.vascular) score += 1;
    if (state.age65) score += 1;
    if (state.female) score += 1;
    return score;
  }

  static calculateMEWS(state: MEWSState): number {
    let score = 0;
    
    // SBP
    if (state.sbp <= 70) score += 3;
    else if (state.sbp <= 80) score += 2;
    else if (state.sbp <= 100) score += 1;
    else if (state.sbp >= 200) score += 2;
    
    // HR
    if (state.hr <= 40) score += 2;
    else if (state.hr <= 50) score += 1;
    else if (state.hr >= 130) score += 3;
    else if (state.hr >= 111) score += 2;
    else if (state.hr >= 101) score += 1;
    
    // RR
    if (state.rr <= 8) score += 2;
    else if (state.rr >= 30) score += 3;
    else if (state.rr >= 21) score += 2;
    else if (state.rr >= 15) score += 1;
    
    // Temp
    if (state.temp < 35) score += 2;
    else if (state.temp >= 38.5) score += 2;
    
    // AVPU
    score += state.avpu;
    
    return score;
  }

  static calculatePEWS(state: PEWSState): number {
    let score = state.behavior + state.cardiovascular + state.respiratory;
    if (state.nebulizer) score += 2;
    if (state.persistentVomiting) score += 2;
    return score;
  }

  static classifyVitals(ageGroup: AgeGroup, hr: number, rr: number, sbp: number) {
    const ranges = {
      Neonate: { 
        hr: { normal: [100, 180], low: 100, high: 180 }, 
        rr: { normal: [40, 60], low: 40, high: 60 }, 
        sbp: { normal: [60, 90], low: 60, high: 90 } 
      },
      Pediatric: { 
        hr: { normal: [70, 120], low: 70, high: 120 }, 
        rr: { normal: [20, 30], low: 20, high: 30 }, 
        sbp: { normal: [80, 110], low: 80, high: 110 } 
      },
      Adult: { 
        hr: { normal: [60, 100], low: 60, high: 100 }, 
        rr: { normal: [12, 20], low: 12, high: 20 }, 
        sbp: { normal: [90, 140], low: 90, high: 140 } 
      }
    };

    const r = ranges[ageGroup];
    return {
      hr: {
        status: hr < r.hr.low ? 'Bradycardia' : hr > r.hr.high ? 'Tachycardia' : 'Normal',
        severity: (hr < r.hr.low - 20 || hr > r.hr.high + 40) ? 'Critical' : (hr < r.hr.low || hr > r.hr.high) ? 'Abnormal' : 'Normal'
      },
      rr: {
        status: rr < r.rr.low ? 'Bradypnea' : rr > r.rr.high ? 'Tachypnea' : 'Normal',
        severity: (rr < r.rr.low - 5 || rr > r.rr.high + 15) ? 'Critical' : (rr < r.rr.low || rr > r.rr.high) ? 'Abnormal' : 'Normal'
      },
      sbp: {
        status: sbp < r.sbp.low ? 'Hypotension' : sbp > r.sbp.high ? 'Hypertension' : 'Normal',
        severity: (sbp < r.sbp.low - 20 || sbp > r.sbp.high + 40) ? 'Critical' : (sbp < r.sbp.low || sbp > r.sbp.high) ? 'Abnormal' : 'Normal'
      }
    };
  }

  static calculateARISCAT(state: SurgicalState): number {
    let score = 0;
    
    // Age
    const age = Number(state.age);
    if (age >= 80) score += 16;
    else if (age >= 51) score += 3;
    
    // Pre-op SpO2
    const spo2 = Number(state.preOpSpO2);
    if (spo2 <= 90) score += 24;
    else if (spo2 <= 95) score += 8;
    
    // Respiratory Infection in last month
    if (state.respInfection) score += 17;
    
    // Pre-op Anemia (Hb <= 10g/dL)
    if (state.preOpAnemia) score += 11;
    
    // Surgical Incision
    if (state.surgeryType === 'Upper Abdominal') score += 15;
    else if (state.surgeryType === 'Intrathoracic') score += 24;
    
    // Duration of surgery
    if (state.duration === '2-3h') score += 8;
    else if (state.duration === '>3h') score += 16;
    
    return score;
  }
}
