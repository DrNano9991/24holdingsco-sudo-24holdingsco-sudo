import { PatientData, MEWSState, SIRSState, QSOFAState, GCSState, Type } from '../types';
import { ScoringEngine } from './scoringEngine';
import { GoogleGenAI } from "@google/genai";

export interface SynthesisResult {
  summary: string;
  actions: string[];
  diagnostics: string[];
  education: string[];
  documentation: string;
}

export class ClinicalSynthesizer {
  private ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  /**
   * Synthesizes clinical data into actionable insights using Gemini.
   */
  async synthesize(
    scoreType: string,
    value: number,
    components: any,
    patientData: any
  ): Promise<SynthesisResult> {
    // Check online status before attempting API call
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log("Offline mode detected. Using Local AI synthesis.");
      return this.localFallback(scoreType, value, components, patientData);
    }

    try {
      const prompt = `
        You are a senior clinical consultant and medical educator. Analyze the following patient data and provide a high-fidelity clinical synthesis.
        
        PATIENT CONTEXT:
        - Age Group: ${patientData.ageGroup}
        - Clinical Notes: ${patientData.notes || "No additional context provided."}
        
        PRIMARY SCORING DATA:
        - Score System: ${scoreType}
        - Calculated Value: ${value}
        - Detailed Components: ${JSON.stringify(components)}
        
        VITAL SIGNS CLASSIFICATION (Reference Ranges):
        ${JSON.stringify(ScoringEngine.classifyVitals(patientData.ageGroup, components.hr || 0, components.rr || 0, components.sbp || 0))}

        INSTRUCTIONS:
        1. Provide a nuanced clinical summary that interprets the score in the context of the patient's age and notes. Use well-paraphrased language, clear outlines (bullet points), and good paragraphing. Format the summary using Markdown for better readability.
        2. List immediate life-saving or stabilizing actions if necessary.
        3. Recommend a targeted diagnostic workup (Labs, Imaging, Monitoring).
        4. Provide evidence-based education points for the patient or their family.
        5. Generate a professional, structured medical note (SBAR or SOAP format) suitable for a hospital handover.
        
        CRITICAL: If the score indicates high risk (e.g., MEWS >= 5, qSOFA >= 2, GCS < 8), prioritize urgent escalation.
      `;

      const response = await this.ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              actions: { type: Type.ARRAY, items: { type: Type.STRING } },
              diagnostics: { type: Type.ARRAY, items: { type: Type.STRING } },
              education: { type: Type.ARRAY, items: { type: Type.STRING } },
              documentation: { type: Type.STRING }
            },
            required: ["summary", "actions", "diagnostics", "education", "documentation"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      return {
        summary: result.summary || "Unable to generate summary.",
        actions: result.actions || [],
        diagnostics: result.diagnostics || [],
        education: result.education || [],
        documentation: result.documentation || ""
      };
    } catch (error) {
      console.error("AI Synthesis Error:", error);
      return this.localFallback(scoreType, value, components, patientData);
    }
  }

  private localFallback(scoreType: string, value: number, components: any, patientData: any): SynthesisResult {
    const actions: string[] = [];
    const diagnostics: string[] = [];
    const education: string[] = [];
    let summary = `### Clinical Analysis (Local AI Mode)\n\n**Score Type:** ${scoreType}\n**Calculated Value:** ${value}\n\n**Patient Context:**\n- Age Group: ${patientData.ageGroup}\n- Notes: ${patientData.notes || 'None'}\n\n`;

    const vitals = ScoringEngine.classifyVitals(
      patientData.ageGroup,
      components.hr || 0,
      components.rr || 0,
      components.sbp || 0
    );

    // Detailed Rule-Based Analysis
    switch (scoreType) {
      case 'MEWS':
        if (value >= 5) {
          summary += `**Assessment:** The patient's MEWS score of ${value} indicates a **High Risk** of clinical deterioration. Immediate intervention is required.\n\n`;
          actions.push("Immediate medical review by a senior clinician/registrar", "Consider Rapid Response Team (RRT) or ICU consult", "Increase monitoring frequency to every 15-30 minutes");
          diagnostics.push("Urgent Arterial Blood Gas (ABG)", "Stat ECG and Chest X-ray", "Comprehensive metabolic panel and Lactate level");
        } else if (value >= 3) {
          summary += `**Assessment:** A MEWS score of ${value} suggests a **Moderate Risk**. Increased vigilance and clinical review are recommended.\n\n`;
          actions.push("Notify the attending physician", "Increase observation frequency to hourly", "Review fluid balance and medication chart");
          diagnostics.push("Baseline blood work (FBC, U&E)", "Monitor urine output");
        } else {
          summary += `**Assessment:** A MEWS score of ${value} indicates a **Low Risk**. Continue routine observations.\n\n`;
          actions.push("Continue routine 4-hourly observations");
        }
        break;

      case 'GCS':
        if (value <= 8) {
          summary += `**Assessment:** A GCS of ${value} indicates **Severe Head Injury** or profound neurological impairment. The patient's airway is at risk.\n\n`;
          actions.push("URGENT: Secure airway (Consider Intubation)", "Neurosurgical consultation", "Maintain cervical spine immobilization if trauma suspected");
          diagnostics.push("Stat CT Head (Non-contrast)", "Monitor ICP if indicated", "Toxicology screen");
        } else if (value <= 12) {
          summary += `**Assessment:** A GCS of ${value} indicates a **Moderate Head Injury**. Close neurological monitoring is essential.\n\n`;
          actions.push("Neurological observations every 15-30 minutes", "Notify neurosurgical team");
          diagnostics.push("CT Head within 1 hour", "Frequent GCS reassessment");
        } else {
          summary += `**Assessment:** A GCS of ${value} indicates a **Mild Head Injury** or minor impairment.\n\n`;
          actions.push("Neurological observations hourly for 4 hours, then 4-hourly");
          education.push("Signs of increasing intracranial pressure", "When to seek emergency care after discharge");
        }
        break;

      case 'qSOFA':
        if (value >= 2) {
          summary += `**Assessment:** A qSOFA score of ${value} is highly suggestive of **Sepsis** and associated with poor clinical outcomes. High risk of mortality.\n\n`;
          actions.push("Initiate Sepsis-6 Protocol immediately", "Administer broad-spectrum antibiotics within 1 hour", "Aggressive fluid resuscitation (30ml/kg crystalloid)");
          diagnostics.push("Blood cultures x2 (before antibiotics)", "Serum Lactate level", "Procalcitonin and CRP");
        } else {
          summary += `**Assessment:** qSOFA score is ${value}. While not meeting the threshold for sepsis, clinical suspicion should remain high if infection is suspected.\n\n`;
          actions.push("Monitor for signs of organ dysfunction", "Re-evaluate qSOFA frequently");
        }
        break;

      case 'PEWS':
        if (value >= 5) {
          summary += `**Assessment:** A PEWS score of ${value} in a ${patientData.ageGroup} patient is **Critical**. High risk of respiratory or cardiac arrest.\n\n`;
          actions.push("Immediate Pediatric Code/RRT activation", "Start high-flow oxygen or respiratory support", "Senior pediatric review stat");
          diagnostics.push("Capillary Blood Gas", "Continuous pulse oximetry and ECG monitoring");
        } else if (value >= 3) {
          summary += `**Assessment:** A PEWS score of ${value} indicates **Significant Clinical Distress**.\n\n`;
          actions.push("Urgent pediatric review", "Increase monitoring frequency", "Review by senior nurse");
        } else {
          summary += `**Assessment:** PEWS score is ${value}. Low risk of immediate deterioration.\n\n`;
          actions.push("Continue routine pediatric observations");
        }
        break;

      case 'CURB-65':
        if (value >= 3) {
          summary += `**Assessment:** A CURB-65 score of ${value} indicates **Severe Pneumonia**. High risk of mortality (17-27%).\n\n`;
          actions.push("Urgent hospital admission", "Consider ICU admission if score is 4-5", "Start IV antibiotics immediately");
          diagnostics.push("Chest X-ray", "Sputum and Blood cultures", "Legionella/Pneumococcal urinary antigen");
        } else if (value === 2) {
          summary += `**Assessment:** A CURB-65 score of 2 indicates **Moderate Severity Pneumonia**. Mortality risk is ~6.8%.\n\n`;
          actions.push("Consider hospital-based care or close outpatient follow-up");
        } else {
          summary += `**Assessment:** A CURB-65 score of ${value} indicates **Low Severity Pneumonia**. Mortality risk is <2%.\n\n`;
          actions.push("Consider home-based treatment if clinically appropriate");
        }
        break;

      case 'Wells PE':
        if (value > 4) {
          summary += `**Assessment:** A Wells score of ${value} indicates that **Pulmonary Embolism is LIKELY**.\n\n`;
          actions.push("Initiate anticoagulation if no contraindications", "Urgent specialist review");
          diagnostics.push("CT Pulmonary Angiogram (CTPA)", "V/Q scan if CTPA contraindicated");
        } else {
          summary += `**Assessment:** A Wells score of ${value} indicates that **Pulmonary Embolism is UNLIKELY**.\n\n`;
          diagnostics.push("D-dimer assay (High sensitivity)", "If D-dimer is negative, PE can be ruled out");
        }
        break;

      case 'CHA₂DS₂-VASc':
        if (value >= 2) {
          summary += `**Assessment:** A CHA₂DS₂-VASc score of ${value} indicates a **High Risk of Stroke**. Annual stroke risk is significantly elevated.\n\n`;
          actions.push("Oral anticoagulation (DOAC or Warfarin) is strongly recommended");
        } else if (value === 1 && patientData.ageGroup !== 'Female') {
          summary += `**Assessment:** A CHA₂DS₂-VASc score of 1 indicates a **Moderate Risk of Stroke**.\n\n`;
          actions.push("Consider oral anticoagulation based on individual patient factors");
        } else {
          summary += `**Assessment:** A CHA₂DS₂-VASc score of ${value} indicates a **Low Risk of Stroke**.\n\n`;
          actions.push("No antithrombotic therapy or Aspirin may be considered");
        }
        break;

      default:
        summary += `**Assessment:** Clinical score of ${value} calculated for ${scoreType}. Please interpret within the full clinical context.\n\n`;
    }

    // Vital Sign Integration
    if (vitals.hr.severity === 'Critical' || vitals.rr.severity === 'Critical' || vitals.sbp.severity === 'Critical') {
      summary += `**Warning:** One or more vital signs are in the **CRITICAL** range. This takes precedence over the calculated score.\n\n`;
      actions.unshift("URGENT: Stabilize vital signs immediately");
    }

    return {
      summary,
      actions: actions.length > 0 ? actions : ["Routine observations", "Monitor for changes"],
      diagnostics: diagnostics.length > 0 ? diagnostics : ["Baseline labs", "Continuous monitoring"],
      education: education.length > 0 ? education : ["Warning signs of clinical deterioration", "When to call for urgent assistance"],
      documentation: `LOCAL AI SYNTHESIS - ${new Date().toLocaleString()}\nSCORE: ${scoreType}=${value}\nVITALS: HR=${components.hr}, RR=${components.rr}, BP=${components.sbp}\nMODE: OFFLINE/LOCAL`
    };
  }

  private analyzePrimaryScore(
    type: string,
    value: number,
    actions: string[],
    diagnostics: string[],
    education: string[]
  ) {
    switch (type) {
      case 'MEWS':
        if (value >= 5) {
          actions.push("Immediate medical review by senior clinician");
          diagnostics.push("Urgent CXR, ECG, and full blood panel");
        }
        break;
      case 'GCS':
        if (value < 8) actions.push("Protect airway - Consider intubation");
        break;
      case 'qSOFA':
        if (value >= 2) actions.push("Initiate Sepsis Protocol");
        break;
    }
  }
}

export const clinicalAI = new ClinicalSynthesizer();

// Attach to window for global access if needed
if (typeof window !== 'undefined') {
  (window as any).clinicalAI = clinicalAI;
}
