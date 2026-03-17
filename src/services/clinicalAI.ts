import { PatientData } from '../types';
import { ScoringEngine } from './scoringEngine';

export interface SynthesisResult {
  summary: string;
  actions: string[];
  diagnostics: string[];
  education: string[];
  documentation: string;
}

class ClinicalAI {
  synthesize(data: PatientData): SynthesisResult {
    const actions: string[] = [];
    const diagnostics: string[] = [];
    const education: string[] = [];
    
    // Calculate GCS
    const gcsTotal = data.gcs.eye + data.gcs.verbal + data.gcs.motor;
    
    // Calculate SIRS
    let sirsCount = 0;
    if (data.sirs.temp !== '' && (data.sirs.temp > 38 || data.sirs.temp < 36)) sirsCount++;
    if (data.sirs.heartRate !== '' && data.sirs.heartRate > 90) sirsCount++;
    if (data.sirs.respRate !== '' && data.sirs.respRate > 20) sirsCount++;
    if (data.sirs.wbc !== '' && (data.sirs.wbc > 12 || data.sirs.wbc < 4)) sirsCount++;

    // Calculate qSOFA
    let qsofaCount = 0;
    if (data.qsofa.lowBP) qsofaCount++;
    if (data.qsofa.highRR) qsofaCount++;
    if (data.qsofa.alteredMentation) qsofaCount++;

    // Logic for actions
    if (gcsTotal < 8) {
      actions.push("Protect airway - Consider intubation (GCS < 8)");
    }
    
    if (qsofaCount >= 2 || sirsCount >= 2) {
      actions.push("Initiate Sepsis Protocol");
      actions.push("Administer IV fluids (30mL/kg)");
      actions.push("Start broad-spectrum antibiotics within 1 hour");
      diagnostics.push("Blood cultures x2 (before antibiotics)");
      diagnostics.push("Serum Lactate level");
      diagnostics.push("Procalcitonin");
    }

    if (data.curb65.confusion || data.curb65.urea || data.curb65.rr || data.curb65.bp || data.curb65.age) {
      const curbScore = [data.curb65.confusion, data.curb65.urea, data.curb65.rr, data.curb65.bp, data.curb65.age].filter(Boolean).length;
      if (curbScore >= 2) {
        actions.push(`Pneumonia management: CURB-65 score ${curbScore} - Consider admission`);
      }
    }

    // Wells PE Logic
    const wellsScore = ScoringEngine.calculateWellsPE((data as any).wellsPE || {});
    if (wellsScore >= 4) {
      actions.push(`High probability of PE (Wells ${wellsScore}) - Consider CTPA or V/Q scan`);
      diagnostics.push("CT Pulmonary Angiogram (CTPA)");
    } else if (wellsScore >= 2) {
      diagnostics.push("D-dimer assay (Wells moderate probability)");
    }

    // CHADS2-VASc Logic
    const chadsScore = ScoringEngine.calculateCHADS2VASc((data as any).chads || {});
    if (chadsScore >= 2) {
      actions.push(`High stroke risk (CHA₂DS₂-VASc ${chadsScore}) - Anticoagulation recommended if AF present`);
    }

    const summary = `Patient presents with a GCS of ${gcsTotal}. ${
      qsofaCount >= 2 ? "High risk for sepsis (qSOFA positive)." : 
      sirsCount >= 2 ? "SIRS criteria met, evaluate for infection." : "Vitals are currently stable."
    } ${wellsScore >= 4 ? "PE suspicion is high." : ""} ${data.notes ? `Clinical context: ${data.notes}` : ""}`;

    const documentation = `ASSESSMENT AND PLAN
Subjective: Patient data reviewed.
Objective: GCS ${gcsTotal}, SIRS ${sirsCount}, qSOFA ${qsofaCount}.
Assessment: ${qsofaCount >= 2 ? "Sepsis suspected" : "Clinical monitoring"}.
Plan: ${actions.join(", ")}.`;

    return {
      summary,
      actions,
      diagnostics,
      education: ["Signs of clinical deterioration", "Importance of fluid resuscitation"],
      documentation
    };
  }
}

export const clinicalAI = new ClinicalAI();
