import { GCSState, SIRSState, QSOFAState, MEWSState, LiverState, SurgicalState } from '../types';

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

  static calculateCHADS2VASc(state: any): number {
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
}
