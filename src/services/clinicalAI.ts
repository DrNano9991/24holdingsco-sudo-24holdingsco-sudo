import { PatientData, MEWSState, SIRSState, QSOFAState, GCSState, Type, SynthesisOptions } from '../types';
import { ScoringEngine } from './scoringEngine';
import { GoogleGenAI } from "@google/genai";
import { MEDICAL_KNOWLEDGE } from './medicalKnowledge';

export interface SynthesisResult {
  summary: string;
  actions: string;
  diagnostics: string;
  education: string;
  documentation: string;
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
}

export class ClinicalSynthesizer {
  private ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  /**
   * Generates a clinical prescription based on patient data and context.
   */
  async generatePrescription(
    patientData: any,
    ageGroup: string,
    customPrompt: string = ""
  ): Promise<any> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return this.localPrescriptionFallback(patientData, ageGroup, customPrompt);
    }

    try {
      const prompt = `
        You are a senior clinical pharmacologist and consultant physician. Generate a high-fidelity, evidence-based prescription regimen for the following patient.
        
        PATIENT CONTEXT:
        - Age Group: ${ageGroup}
        - Clinical Notes: ${patientData.notes || "No additional context provided."}
        - Physical Exam: ${JSON.stringify(patientData.exam || {})}
        - Liver Findings: ${JSON.stringify(patientData.liver || {})}
        - Anthropometry: ${JSON.stringify(patientData.anthro || {})}
        - Machine Data (Labs/Imaging/Medical Devices): ${JSON.stringify(patientData.machineData || [])}
        - Current Scores: MEWS=${patientData.mews.sbp ? 'Active' : 'N/A'}, GCS=${patientData.gcs.eye + patientData.gcs.verbal + patientData.gcs.motor}
        - Other Scores: CURB-65: ${JSON.stringify(patientData.curb65)}, Wells PE: ${JSON.stringify(patientData.wellsPE)}, CHA2DS2-VASc: ${JSON.stringify(patientData.chads)}
        
        SPECIFIC INDICATION / REQUEST:
        ${customPrompt || "General clinical management based on available data."}

        INSTRUCTIONS:
        1. Recommend a list of medications with precise dosages, frequencies, and durations.
        2. Include drugs for Non-Communicable Diseases (NCDs) like Hypertension, Diabetes, and Chronic Respiratory diseases if relevant to the patient's data.
        3. Provide a clinical rationale for each medication.
        4. List critical safety warnings (contraindications, interactions, side effects).
        5. Recommend a monitoring plan (labs, vitals, clinical signs).
        6. For pediatric/neonate patients, ensure weight-based dosing (mg/kg).
        7. For very large patients (up to 350kg), adjust dosages appropriately.
        
        FORMATTING RULES:
        - Use HIERARCHICAL OUTLINES with INDENTATION (4 spaces).
        - Use ALL-CAPS HEADERS for sections.
        - Use DOUBLE LINE BREAKS between sections.
        - AVOID ALL SYMBOLS (no asterisks, no hashes, no dashes, no bullets, no underscores).
        - Use RAW TEXT only (no markdown).
        - Ensure a clean, professional, non-rendered appearance.
        
        CRITICAL: If the patient has liver dysfunction (Liver Findings), adjust dosages accordingly.
      `;

      const response = await this.ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              prescriptionText: { type: Type.STRING }
            },
            required: ["prescriptionText"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      return result.prescriptionText || "UNABLE TO GENERATE PRESCRIPTION";
    } catch (error) {
      console.error("AI Prescription Error:", error);
      return this.localPrescriptionFallback(patientData, ageGroup, customPrompt);
    }
  }

  private localPrescriptionFallback(patientData: any, ageGroup: string, customPrompt: string): string {
    const isPediatric = ageGroup !== 'Adult';
    
    return `MEDICATION REGIMEN
    IV NORMAL SALINE 0.9 PERCENT
        DOSAGE ${isPediatric ? "20ML PER KG BOLUS" : "500ML TO 1000ML BOLUS"}
        FREQUENCY STAT
        DURATION IMMEDIATE
        RATIONALE INITIAL VOLUME RESUSCITATION BASED ON CLINICAL STABILITY INDICATORS


    PARACETAMOL
        DOSAGE ${isPediatric ? "15MG PER KG" : "1G"}
        FREQUENCY QID 6 HOURLY
        DURATION 3 TO 5 DAYS
        RATIONALE ANALGESIA AND ANTIPYRETIC MANAGEMENT


SAFETY WARNINGS
    MONITOR FOR SIGNS OF FLUID OVERLOAD DURING RESUSCITATION
    ENSURE NO KNOWN ALLERGIES TO RECOMMENDED AGENTS
    LOCAL AI MODE DOSAGES ARE GENERIC AND MUST BE VERIFIED BY A CLINICIAN


MONITORING PLAN
    HOURLY VITAL SIGNS HEART RATE BLOOD PRESSURE RESPIRATORY RATE SPO2
    STRICT FLUID BALANCE INPUT AND OUTPUT
    REPEAT CLINICAL ASSESSMENT IN 4 HOURS`;
  }

  /**
   * Synthesizes clinical data into actionable insights using Gemini.
   */
  async synthesize(
    scoreType: string,
    value: number,
    components: any,
    patientData: any,
    options: SynthesisOptions = { depth: 'Standard', focus: 'Diagnostic', format: 'Standard', includeHandover: true, includeDifferential: true, includePrognosis: true }
  ): Promise<SynthesisResult> {
    // Check online status before attempting API call
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log("Offline mode detected. Using Local AI synthesis.");
      return this.localFallback(scoreType, value, components, patientData, options);
    }

    try {
      let priorityInstruction = "";
      switch (scoreType) {
        case 'GCS':
          priorityInstruction = "PRIORITIZE NEUROLOGICAL STATUS: Analyze pupillary response, motor symmetry, and signs of intracranial pressure. Correlate with any head imaging in machineData.";
          break;
        case 'MEWS':
        case 'PEWS':
          priorityInstruction = "PRIORITIZE HEMODYNAMIC STABILITY: Analyze trends in heart rate, blood pressure, and perfusion. Look for signs of early shock or respiratory failure.";
          break;
        case 'qSOFA':
        case 'SIRS':
          priorityInstruction = "PRIORITIZE SEPSIS AND INFECTION: Analyze inflammatory markers, lactate levels, and source of infection. Evaluate organ dysfunction indicators.";
          break;
        case 'CURB-65':
          priorityInstruction = "PRIORITIZE RESPIRATORY FUNCTION: Analyze oxygenation, urea levels, and chest imaging. Evaluate for severe pneumonia complications.";
          break;
        case 'Wells PE':
          priorityInstruction = "PRIORITIZE THROMBOEMBOLIC RISK: Analyze D-dimer, leg symptoms, and risk factors for pulmonary embolism. Correlate with any CTPA or VQ scan data.";
          break;
        case 'CHA2DS2-VASc':
          priorityInstruction = "PRIORITIZE STROKE RISK: Analyze age, hypertension, and vascular history to determine anticoagulation necessity.";
          break;
      }

      const prompt = `
        You are a senior clinical consultant and medical educator. Analyze the following patient data and provide a high-fidelity clinical synthesis.
        
        ${priorityInstruction}

        PATIENT CONTEXT:
        - Age Group: ${patientData.ageGroup}
        - Clinical Notes: ${patientData.notes || "No additional context provided."}
        - Physical Exam: ${JSON.stringify(patientData.exam || {})}
        - Liver Findings: ${JSON.stringify(patientData.liver || {})}
        - Anthropometry: ${JSON.stringify(patientData.anthro || {})}
        - Surgical Context: ${JSON.stringify(patientData.surgery || {})}
        - Mental Health: PHQ-9=${JSON.stringify(patientData.phq9 || {})}, GAD-7=${JSON.stringify(patientData.gad7 || {})}, AMTS=${JSON.stringify(patientData.amts || {})}
        - Machine Data (Labs/Imaging/Medical Devices): ${JSON.stringify(patientData.machineData || [])}
        - Other Scores: CURB-65: ${JSON.stringify(patientData.curb65)}, Wells PE: ${JSON.stringify(patientData.wellsPE)}, CHA2DS2-VASc: ${JSON.stringify(patientData.chads)}
        
        PRIMARY SCORING DATA:
        - Score System: ${scoreType}
        - Calculated Value: ${value}
        - Detailed Components: ${JSON.stringify(components)}
        
        VITAL SIGNS CLASSIFICATION (Reference Ranges):
        ${JSON.stringify(ScoringEngine.classifyVitals(patientData.ageGroup, components.hr || 0, components.rr || 0, components.sbp || 0))}

        CLINICAL KNOWLEDGE BASE (Reference):
        ${JSON.stringify(MEDICAL_KNOWLEDGE)}

        SYNTHESIS OPTIONS:
        - Depth: ${options.depth}
        - Focus: ${options.focus}
        - Format: ${options.format}
        - Include Handover: ${options.includeHandover}
        - Include Differential Diagnoses: ${options.includeDifferential}
        - Include Prognosis: ${options.includePrognosis}

        INSTRUCTIONS:
        1. Provide a nuanced clinical summary that interprets the score in the context of the patient's age and notes. 
           - Analyze data from medical devices (machineData) carefully.
           - If depth is 'Concise', keep it to 2-3 sentences.
           - If depth is 'Detailed', provide a comprehensive physiological rationale.
           - Focus primarily on ${options.focus} aspects.
        2. List immediate life-saving or stabilizing actions if necessary.
           - CRITICAL: If riskLevel is 'High' or 'Critical', provide SPECIFIC, URGENT, and ACTIONABLE recommendations.
        3. Recommend a targeted diagnostic workup (Labs, Imaging, Monitoring) based on clinical findings and machine data.
        4. Provide evidence-based education points for the patient or their family.
        5. Generate a professional, structured medical note in ${options.format} format (e.g. SBAR or SOAP).
        6. Assign a risk level: 'Low', 'Moderate', 'High', or 'Critical'.
        7. IF includeDifferential IS TRUE, INCLUDE A SECTION TITLED 'DIFFERENTIAL DIAGNOSES' WITH AT LEAST 3 POSSIBILITIES.
        
        FORMATTING RULES:
        - Use HIERARCHICAL OUTLINES with INDENTATION (4 spaces).
        - Use ALL-CAPS HEADERS for sections.
        - Use DOUBLE LINE BREAKS between sections.
        - AVOID ALL SYMBOLS (no asterisks, no hashes, no dashes, no bullets, no underscores).
        - Use RAW TEXT only (no markdown).
        - Ensure a clean, professional, non-rendered appearance.
        
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
              actions: { type: Type.STRING },
              diagnostics: { type: Type.STRING },
              education: { type: Type.STRING },
              documentation: { type: Type.STRING },
              riskLevel: { type: Type.STRING, enum: ['Low', 'Moderate', 'High', 'Critical'] }
            },
            required: ["summary", "actions", "diagnostics", "education", "documentation", "riskLevel"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      return {
        summary: result.summary || "Unable to generate summary.",
        actions: result.actions || "",
        diagnostics: result.diagnostics || "",
        education: result.education || "",
        documentation: result.documentation || "",
        riskLevel: result.riskLevel || 'Low'
      };
    } catch (error) {
      console.error("AI Synthesis Error:", error);
      return this.localFallback(scoreType, value, components, patientData, options);
    }
  }

  private localFallback(
    scoreType: string, 
    value: number, 
    components: any, 
    patientData: any,
    options: SynthesisOptions
  ): SynthesisResult {
    let actions = "";
    let diagnostics = "";
    let education = "";
    let documentation = "";
    let riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical' = 'Low';
    
    let summary = `CLINICAL ANALYSIS LOCAL AI MODE\n\n\n`;
    summary += `SCORE TYPE: ${scoreType}\n`;
    summary += `CALCULATED VALUE: ${value}\n`;
    summary += `PATIENT CONTEXT: ${patientData.ageGroup}\n\n\n`;

    // Rule-based logic for summary and risk
    if (scoreType === 'MEWS') {
      if (value >= 5) {
        riskLevel = 'High';
        summary += `CLINICAL IMPRESSION\n    THE MEWS SCORE OF ${value} INDICATES A HIGH RISK OF CLINICAL DETERIORATION. PHYSIOLOGICAL INSTABILITY IS EVIDENT.\n\n\n`;
        actions += `IMMEDIATE ACTIONS\n    NOTIFY RAPID RESPONSE TEAM\n    INCREASE MONITORING TO EVERY 15 MINUTES\n    ENSURE IV ACCESS AND OXYGEN READINESS\n\n\n`;
        diagnostics += `DIAGNOSTIC WORKUP\n    STAT ABG AND LACTATE\n    12 LEAD ECG\n    CHEST XRAY\n\n\n`;
      } else if (value >= 3) {
        riskLevel = 'Moderate';
        summary += `CLINICAL IMPRESSION\n    MODERATE RISK DETECTED. PATIENT REQUIRES INCREASED CLINICAL VIGILANCE.\n\n\n`;
        actions += `REQUIRED ACTIONS\n    NOTIFY ATTENDING PHYSICIAN\n    HOURLY VITAL SIGNS\n\n\n`;
      } else {
        summary += `CLINICAL IMPRESSION\n    LOW RISK. PATIENT APPEARS PHYSIOLOGICALLY STABLE.\n\n\n`;
      }
    } else if (scoreType === 'GCS') {
      if (value <= 8) {
        riskLevel = 'Critical';
        summary += `CLINICAL IMPRESSION\n    CRITICAL NEUROLOGICAL IMPAIRMENT. GCS ${value} SUGGESTS INABILITY TO PROTECT AIRWAY.\n\n\n`;
        actions += `CRITICAL ACTIONS\n    SECURE AIRWAY IMMEDIATELY\n    NEUROSURGICAL CONSULT STAT\n    NEUROPROTECTIVE MEASURES\n\n\n`;
        diagnostics += `DIAGNOSTIC WORKUP\n    STAT CT HEAD NON CONTRAST\n    TOXICOLOGY SCREEN\n\n\n`;
      } else if (value <= 12) {
        riskLevel = 'High';
        summary += `CLINICAL IMPRESSION\n    MODERATE NEUROLOGICAL DEFICIT. RISK OF RAPID DECLINE.\n\n\n`;
        actions += `REQUIRED ACTIONS\n    NEURO-OBS EVERY 30 MINUTES\n    CT HEAD WITHIN 1 HOUR\n\n\n`;
      } else {
        summary += `CLINICAL IMPRESSION\n    MILD NEUROLOGICAL IMPAIRMENT.\n\n\n`;
      }
    } else if (scoreType === 'qSOFA' || scoreType === 'SIRS') {
      if (value >= 2) {
        riskLevel = 'High';
        summary += `CLINICAL IMPRESSION\n    SUSPECTED SEPSIS OR SYSTEMIC INFLAMMATION. QSOFA/SIRS SCORE OF ${value} IS CONCERNING.\n\n\n`;
        actions += `SEPSIS ACTIONS\n    INITIATE SEPSIS 6 PROTOCOL\n    START BROAD SPECTRUM ANTIBIOTICS\n    FLUID RESUSCITATION\n\n\n`;
      } else {
        summary += `CLINICAL IMPRESSION\n    LOW RISK FOR SEPSIS AT THIS TIME.\n\n\n`;
      }
    } else if (scoreType === 'CURB-65') {
      if (value >= 3) {
        riskLevel = 'High';
        summary += `CLINICAL IMPRESSION\n    SEVERE COMMUNITY ACQUIRED PNEUMONIA. CURB-65 SCORE ${value}.\n\n\n`;
        actions += `PNEUMONIA ACTIONS\n    URGENT HOSPITAL ADMISSION\n    IV ANTIBIOTICS\n\n\n`;
      } else if (value >= 2) {
        riskLevel = 'Moderate';
        summary += `CLINICAL IMPRESSION\n    MODERATE SEVERITY PNEUMONIA.\n\n\n`;
      } else {
        summary += `CLINICAL IMPRESSION\n    LOW SEVERITY PNEUMONIA. CONSIDER OUTPATIENT CARE.\n\n\n`;
      }
    } else if (scoreType === 'Wells PE') {
      if (value > 4) {
        riskLevel = 'High';
        summary += `CLINICAL IMPRESSION\n    PULMONARY EMBOLISM LIKELY. WELLS SCORE ${value}.\n\n\n`;
        actions += `PE ACTIONS\n    INITIATE ANTICOAGULATION\n    URGENT IMAGING (CTPA)\n\n\n`;
      } else {
        summary += `CLINICAL IMPRESSION\n    PE UNLIKELY. USE D-DIMER TO RULE OUT.\n\n\n`;
      }
    } else if (scoreType === 'PHQ-9' || scoreType === 'GAD-7') {
      if (value >= 15) {
        riskLevel = 'High';
        summary += `CLINICAL IMPRESSION\n    SEVERE SYMPTOMS DETECTED. SCORE ${value}.\n\n\n`;
        actions += `MENTAL HEALTH ACTIONS\n    URGENT PSYCHIATRIC REVIEW\n    ASSESS FOR SELF HARM RISK\n\n\n`;
      } else if (value >= 10) {
        riskLevel = 'Moderate';
        summary += `CLINICAL IMPRESSION\n    MODERATE SYMPTOMS DETECTED.\n\n\n`;
      } else {
        summary += `CLINICAL IMPRESSION\n    MILD OR MINIMAL SYMPTOMS.\n\n\n`;
      }
    } else if (scoreType === 'CHA2DS2-VASc') {
      if (value >= 2) {
        riskLevel = 'Moderate';
        summary += `CLINICAL IMPRESSION\n    HIGH STROKE RISK IN ATRIAL FIBRILLATION. CHA2DS2-VASC SCORE ${value}.\n\n\n`;
        actions += `AF ACTIONS\n    ORAL ANTICOAGULATION STRONGLY RECOMMENDED (DOAC OR WARFARIN)\n    REVIEW BLEEDING RISK (HAS-BLED)\n\n\n`;
      } else if (value === 1) {
        summary += `CLINICAL IMPRESSION\n    MODERATE STROKE RISK. CONSIDER ANTICOAGULATION BASED ON CLINICAL JUDGMENT.\n\n\n`;
      } else {
        summary += `CLINICAL IMPRESSION\n    LOW STROKE RISK. NO ANTICOAGULATION TYPICALLY REQUIRED.\n\n\n`;
      }
    } else if (scoreType === 'ARISCAT') {
      if (value >= 45) {
        riskLevel = 'High';
        summary += `CLINICAL IMPRESSION\n    HIGH RISK OF POSTOPERATIVE RESPIRATORY COMPLICATIONS. SCORE ${value}.\n\n\n`;
        actions += `SURGICAL ACTIONS\n    PRE-OP OPTIMIZATION\n    POST-OP ICU/HDU MONITORING\n    AGGRESSIVE CHEST PHYSIOTHERAPY\n\n\n`;
      } else if (value >= 26) {
        riskLevel = 'Moderate';
        summary += `CLINICAL IMPRESSION\n    INTERMEDIATE RISK OF POST-OP RESPIRATORY COMPLICATIONS.\n\n\n`;
      } else {
        summary += `CLINICAL IMPRESSION\n    LOW RISK OF POST-OP RESPIRATORY COMPLICATIONS.\n\n\n`;
      }
    }

    // Add Differential Diagnoses if requested
    if (options.includeDifferential) {
      summary += `DIFFERENTIAL DIAGNOSES\n`;
      if (scoreType === 'MEWS' || scoreType === 'PEWS' || scoreType === 'qSOFA' || scoreType === 'SIRS') {
        summary += `    1 SEPSIS OR SEPTIC SHOCK\n    2 ACUTE CORONARY SYNDROME\n    3 PULMONARY EMBOLISM\n    4 HYPOVOLEMIA\n\n\n`;
      } else if (scoreType === 'GCS') {
        summary += `    1 INTRACRANIAL HEMORRHAGE\n    2 METABOLIC ENCEPHALOPATHY\n    3 TOXIC INGESTION\n    4 POST ICTAL STATE\n\n\n`;
      } else if (scoreType === 'CURB-65') {
        summary += `    1 BACTERIAL PNEUMONIA\n    2 VIRAL PNEUMONIA\n    3 CONGESTIVE HEART FAILURE\n    4 PULMONARY INFARCTION\n\n\n`;
      } else {
        summary += `    1 ACUTE INFECTION\n    2 ORGAN DYSFUNCTION\n    3 ELECTROLYTE IMBALANCE\n\n\n`;
      }
    }

    // Add Prognosis if requested
    if (options.includePrognosis) {
      summary += `PROGNOSIS\n`;
      if (riskLevel === 'Critical' || riskLevel === 'High') {
        summary += `    GUARDED PROGNOSIS REQUIRING INTENSIVE CARE INTERVENTION. HIGH RISK OF ADVERSE OUTCOME WITHOUT URGENT ESCALATION.\n\n\n`;
      } else {
        summary += `    FAVORABLE PROGNOSIS WITH CONTINUED MONITORING AND STANDARD TREATMENT.\n\n\n`;
      }
    }

    // Documentation (SOAP/SBAR)
    if (options.format === 'SOAP') {
      documentation = `SOAP NOTE\n\nS: PATIENT PRESENTING WITH ${scoreType} OF ${value}. NOTES: ${patientData.notes || 'NONE'}.\nO: VITALS: HR ${components.hr || 'N/A'}, BP ${components.sbp || 'N/A'}, RR ${components.rr || 'N/A'}. EXAM: ${JSON.stringify(patientData.exam)}.\nA: ${riskLevel} RISK BASED ON ${scoreType}.\nP: ${actions.replace(/\n/g, ' ')}`;
    } else {
      documentation = `SBAR HANDOVER\n\nS: ${patientData.ageGroup} PATIENT WITH ${scoreType} ${value}.\nB: CLINICAL NOTES: ${patientData.notes || 'NONE'}.\nA: RISK LEVEL IS ${riskLevel}.\nR: RECOMMEND ${actions.replace(/\n/g, ' ')}`;
    }

    return {
      summary,
      actions: actions || "CONTINUE CURRENT MONITORING",
      diagnostics: diagnostics || "ROUTINE LABS AND VITALS",
      education: education || "EXPLAIN CLINICAL STATUS TO FAMILY",
      documentation,
      riskLevel
    };
  }

  private getGeneralEducation(type: string, risk: string): string[] {
    const common = ["Importance of regular vital sign monitoring", "Understanding the significance of clinical scores"];
    if (risk === 'High' || risk === 'Critical') {
      return [...common, "Signs of clinical deterioration to report immediately", "The role of the Rapid Response Team"];
    }
    return [...common, "Follow-up care instructions", "Medication adherence and side effects"];
  }
}

export const clinicalAI = new ClinicalSynthesizer();

// Attach to window for global access if needed
if (typeof window !== 'undefined') {
  (window as any).clinicalAI = clinicalAI;
}
