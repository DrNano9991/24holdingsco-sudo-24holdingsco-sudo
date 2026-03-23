import { PatientData, MEWSState, SIRSState, QSOFAState, GCSState, Type } from '../types';
import { ScoringEngine } from './scoringEngine';
import { GoogleGenAI } from "@google/genai";
import { MEDICAL_KNOWLEDGE } from './medicalKnowledge';

export interface SynthesisOptions {
  depth?: 'concise' | 'standard' | 'detailed';
  focus?: 'diagnostic' | 'therapeutic' | 'educational';
  includeHandover?: boolean;
}

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
        - Machine Data (Labs/Imaging): ${JSON.stringify(patientData.machineData || [])}
        - Current Scores: MEWS=${patientData.mews.sbp ? 'Active' : 'N/A'}, GCS=${patientData.gcs.eye + patientData.gcs.verbal + patientData.gcs.motor}
        
        SPECIFIC INDICATION / REQUEST:
        ${customPrompt || "General clinical management based on available data."}

        INSTRUCTIONS:
        1. Recommend a list of medications with precise dosages, frequencies, and durations.
        2. Provide a clinical rationale for each medication.
        3. List critical safety warnings (contraindications, interactions, side effects).
        4. Recommend a monitoring plan (labs, vitals, clinical signs).
        
        FORMATTING RULES:
        - Use HIERARCHICAL OUTLINES with INDENTATION (4 spaces).
        - Use ALL-CAPS HEADERS for sections.
        - Use DOUBLE LINE BREAKS between sections.
        - AVOID ALL SYMBOLS (no asterisks, no hashes, no dashes, no bullets, no underscores).
        - Use RAW TEXT only (no markdown).
        - Ensure a clean, professional, non-rendered appearance.
        
        CRITICAL: If the patient has liver dysfunction (Liver Findings), adjust dosages accordingly.
        CRITICAL: If the patient is pediatric or neonate, ensure weight-based dosing (mg/kg) is specified.
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
    options: SynthesisOptions = { depth: 'standard', focus: 'diagnostic', includeHandover: true }
  ): Promise<SynthesisResult> {
    // Check online status before attempting API call
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log("Offline mode detected. Using Local AI synthesis.");
      return this.localFallback(scoreType, value, components, patientData, options);
    }

    try {
      const prompt = `
        You are a senior clinical consultant and medical educator. Analyze the following patient data and provide a high-fidelity clinical synthesis.
        
        PATIENT CONTEXT:
        - Age Group: ${patientData.ageGroup}
        - Clinical Notes: ${patientData.notes || "No additional context provided."}
        - Physical Exam: ${JSON.stringify(patientData.exam || {})}
        - Liver Findings: ${JSON.stringify(patientData.liver || {})}
        - Anthropometry: ${JSON.stringify(patientData.anthro || {})}
        - Surgical Context: ${JSON.stringify(patientData.surgery || {})}
        - Machine Data (Labs/Imaging): ${JSON.stringify(patientData.machineData || [])}
        
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
        - Include Handover: ${options.includeHandover}

        INSTRUCTIONS:
        1. Provide a nuanced clinical summary that interprets the score in the context of the patient's age and notes. 
           - If depth is 'concise', keep it to 2-3 sentences.
           - If depth is 'detailed', provide a comprehensive physiological rationale.
           - Focus primarily on ${options.focus} aspects.
        2. List immediate life-saving or stabilizing actions if necessary.
        3. Recommend a targeted diagnostic workup (Labs, Imaging, Monitoring).
        4. Provide evidence-based education points for the patient or their family.
        5. Generate a professional, structured medical note (SBAR or SOAP format) suitable for a hospital handover if requested.
        6. Assign a risk level: 'Low', 'Moderate', 'High', or 'Critical'.
        
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
    let riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical' = 'Low';
    let summary = `CLINICAL ANALYSIS LOCAL AI MODE


SCORE TYPE
    ${scoreType}


CALCULATED VALUE
    ${value}


PATIENT CONTEXT
    AGE GROUP ${patientData.ageGroup}
    NOTES ${patientData.notes || 'NONE'}


`;

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
          riskLevel = 'High';
          summary += `CLINICAL IMPRESSION
    THE PATIENTS MODIFIED EARLY WARNING SCORE MEWS OF ${value} INDICATES A SIGNIFICANT RISK OF CLINICAL DETERIORATION


RECOMMENDATIONS
    THIS THRESHOLD TYPICALLY REQUIRES IMMEDIATE ESCALATION TO A SENIOR MEDICAL OFFICER OR RAPID RESPONSE TEAM


`;
          actions += `IMMEDIATE ACTIONS
    IMMEDIATE MEDICAL REVIEW BY A SENIOR CLINICIAN
    CONSIDER RAPID RESPONSE TEAM OR ICU CONSULT
    INCREASE MONITORING FREQUENCY TO EVERY 15 TO 30 MINUTES
    ENSURE PATENT IV ACCESS


`;
          diagnostics += `DIAGNOSTIC WORKUP
    URGENT ARTERIAL BLOOD GAS
    STAT 12 LEAD ECG AND CHEST XRAY
    COMPREHENSIVE METABOLIC PANEL AND LACTATE


`;
        } else if (value >= 3) {
          riskLevel = 'Moderate';
          summary += `CLINICAL IMPRESSION
    A MEWS SCORE OF ${value} SUGGESTS A MODERATE RISK


RECOMMENDATIONS
    INCREASED VIGILANCE AND CLINICAL REVIEW ARE RECOMMENDED TO IDENTIFY UNDERLYING CAUSES OF PHYSIOLOGICAL INSTABILITY


`;
          actions += `REQUIRED ACTIONS
    NOTIFY THE ATTENDING PHYSICIAN
    INCREASE OBSERVATION FREQUENCY TO HOURLY
    REVIEW FLUID BALANCE AND MEDICATION CHART


`;
          diagnostics += `DIAGNOSTIC WORKUP
    BASELINE BLOOD WORK
    STRICT FLUID BALANCE MONITORING


`;
        } else {
          summary += `CLINICAL IMPRESSION
    A MEWS SCORE OF ${value} INDICATES A LOW RISK


RECOMMENDATIONS
    THE PATIENT APPEARS PHYSIOLOGICALLY STABLE AT THIS TIME


`;
          actions += `ROUTINE ACTIONS
    CONTINUE ROUTINE 4 HOURLY OBSERVATIONS
    MAINTAIN STANDARD CARE PLAN


`;
        }
        break;

      case 'GCS':
        if (value <= 8) {
          riskLevel = 'Critical';
          summary += `CLINICAL IMPRESSION
    A GLASGOW COMA SCALE GCS OF ${value} INDICATES SEVERE NEUROLOGICAL IMPAIRMENT


RECOMMENDATIONS
    AT THIS LEVEL THE PATIENTS PROTECTIVE AIRWAY REFLEXES ARE LIKELY COMPROMISED


`;
          actions += `CRITICAL ACTIONS
    URGENT SECURE AIRWAY
    NEUROSURGICAL CONSULTATION STAT
    MAINTAIN CERVICAL SPINE IMMOBILIZATION
    IMPLEMENT NEURO PROTECTIVE MEASURES


`;
          diagnostics += `DIAGNOSTIC WORKUP
    STAT NON CONTRAST CT HEAD
    MONITOR INTRACRANIAL PRESSURE
    COMPREHENSIVE TOXICOLOGY SCREEN


`;
        } else if (value <= 12) {
          riskLevel = 'High';
          summary += `CLINICAL IMPRESSION
    A GCS OF ${value} INDICATES A MODERATE HEAD INJURY OR SIGNIFICANT ENCEPHALOPATHY


RECOMMENDATIONS
    CLOSE NEUROLOGICAL MONITORING IS ESSENTIAL TO DETEAR EARLY SIGNS OF HERNIATION


`;
          actions += `REQUIRED ACTIONS
    NEUROLOGICAL OBSERVATIONS EVERY 15 TO 30 MINUTES
    NOTIFY NEUROSURGICAL OR NEUROLOGY TEAM
    AVOID HYPOTENSION AND HYPOXIA


`;
          diagnostics += `DIAGNOSTIC WORKUP
    CT HEAD WITHIN 1 HOUR
    FREQUENT GCS REASSESSMENT
    CHECK ELECTROLYTES


`;
        } else {
          summary += `CLINICAL IMPRESSION
    A GCS OF ${value} INDICATES A MILD HEAD INJURY


RECOMMENDATIONS
    ASSESS FOR POST CONCUSSIVE SYMPTOMS


`;
          actions += `ROUTINE ACTIONS
    NEUROLOGICAL OBSERVATIONS HOURLY FOR 4 HOURS
    ASSESS FOR POST CONCUSSIVE SYMPTOMS


`;
          education += `PATIENT EDUCATION
    SIGNS OF INCREASING INTRACRANIAL PRESSURE
    WHEN TO SEEK EMERGENCY CARE AFTER DISCHARGE


`;
        }
        break;

      case 'qSOFA':
        if (value >= 2) {
          riskLevel = 'High';
          summary += `CLINICAL IMPRESSION
    A QUICK SOFA QSOFA SCORE OF ${value} IS HIGHLY PREDICTIVE OF SEPSIS RELATED MORTALITY


RECOMMENDATIONS
    THIS PATIENT MEETS THE CRITERIA FOR SUSPECTED SEPSIS WITH ORGAN DYSFUNCTION


`;
          actions += `SEPSIS PROTOCOL
    INITIATE SEPSIS 6 PROTOCOL IMMEDIATELY
    ADMINISTER BROAD SPECTRUM ANTIBIOTICS WITHIN 1 HOUR
    AGGRESSIVE FLUID RESUSCITATION
    OXYGEN THERAPY


`;
          diagnostics += `DIAGNOSTIC WORKUP
    BLOOD CULTURES BEFORE ANTIBIOTICS
    SERIAL SERUM LACTATE LEVELS
    PROCALCITONIN AND CRP


`;
        } else {
          summary += `CLINICAL IMPRESSION
    QSOFA SCORE IS ${value}


RECOMMENDATIONS
    WHILE NOT MEETING THE HIGH RISK THRESHOLD CLINICAL SUSPICION SHOULD REMAIN HIGH


`;
          actions += `MONITORING ACTIONS
    MONITOR FOR SIGNS OF EMERGING ORGAN DYSFUNCTION
    RE EVALUATE QSOFA FREQUENTLY
    SCREEN FOR INFECTION SOURCES


`;
        }
        break;

      case 'SIRS':
        if (value >= 2) {
          riskLevel = 'Moderate';
          summary += `CLINICAL IMPRESSION
    THE PATIENT MEETS SYSTEMIC INFLAMMATORY RESPONSE SYNDROME SIRS CRITERIA SCORE ${value}


RECOMMENDATIONS
    THIS INDICATES A SIGNIFICANT SYSTEMIC INFLAMMATORY STATE


`;
          actions += `SIRS ACTIONS
    SCREEN FOR POTENTIAL INFECTION
    MONITOR VITALS CLOSELY
    REVIEW WHITE CELL COUNT TRENDS


`;
          diagnostics += `DIAGNOSTIC WORKUP
    BLOOD CULTURES
    URINALYSIS AND CXR
    INFLAMMATORY MARKERS


`;
        } else {
          summary += `CLINICAL IMPRESSION
    SIRS SCORE IS ${value}


RECOMMENDATIONS
    NO SIGNIFICANT SYSTEMIC INFLAMMATORY RESPONSE DETECTED


`;
        }
        break;

      case 'PEWS':
        if (value >= 5) {
          riskLevel = 'Critical';
          summary += `CLINICAL IMPRESSION
    A PEDIATRIC EARLY WARNING SCORE PEWS OF ${value} IS A CRITICAL FINDING


RECOMMENDATIONS
    THERE IS A HIGH RISK OF RAPID RESPIRATORY OR CARDIOVASCULAR COLLAPSE


`;
          actions += `CRITICAL PEDIATRIC ACTIONS
    IMMEDIATE PEDIATRIC RAPID RESPONSE ACTIVATION
    START HIGH FLOW OXYGEN
    SENIOR PEDIATRIC REGISTRAR REVIEW STAT
    PREPARE FOR EMERGENCY AIRWAY MANAGEMENT


`;
          diagnostics += `DIAGNOSTIC WORKUP
    CAPILLARY OR ARTERIAL BLOOD GAS
    CONTINUOUS MULTI PARAMETER MONITORING
    STAT PORTABLE CHEST XRAY


`;
        } else if (value >= 3) {
          riskLevel = 'High';
          summary += `CLINICAL IMPRESSION
    A PEWS SCORE OF ${value} INDICATES SIGNIFICANT CLINICAL DISTRESS


RECOMMENDATIONS
    THIS REQUIRES URGENT ESCALATION AND FREQUENT REASSESSMENT


`;
          actions += `REQUIRED ACTIONS
    URGENT PEDIATRIC REVIEW WITHIN 30 MINS
    INCREASE MONITORING FREQUENCY TO EVERY 30 TO 60 MINS
    REVIEW BY SENIOR NURSING STAFF


`;
        } else {
          summary += `CLINICAL IMPRESSION
    PEWS SCORE IS ${value}


RECOMMENDATIONS
    THE PEDIATRIC PATIENT APPEARS STABLE


`;
          actions += `ROUTINE ACTIONS
    CONTINUE ROUTINE PEDIATRIC OBSERVATIONS
    ENSURE ADEQUATE HYDRATION


`;
        }
        break;

      case 'CURB-65':
        if (value >= 3) {
          riskLevel = 'High';
          summary += `CLINICAL IMPRESSION
    A CURB 65 SCORE OF ${value} INDICATES SEVERE COMMUNITY ACQUIRED PNEUMONIA


RECOMMENDATIONS
    THIS PATIENT HAS A HIGH RISK OF MORTALITY AND TYPICALLY REQUIRES INPATIENT MANAGEMENT


`;
          actions += `PNEUMONIA ACTIONS
    URGENT HOSPITAL ADMISSION
    CONSIDER ICU HDU ADMISSION
    START IV BROAD SPECTRUM ANTIBIOTICS IMMEDIATELY
    ASSESS FOR SUPPLEMENTAL OXYGEN


`;
          diagnostics += `DIAGNOSTIC WORKUP
    CHEST XRAY
    SPUTUM AND BLOOD CULTURES
    URINARY ANTIGEN TESTS
    UREA AND ELECTROLYTES


`;
        } else if (value === 2) {
          riskLevel = 'Moderate';
          summary += `CLINICAL IMPRESSION
    A CURB 65 SCORE OF 2 INDICATES MODERATE SEVERITY PNEUMONIA


RECOMMENDATIONS
    SHORT STAY INPATIENT CARE OR VERY CLOSE OUTPATIENT FOLLOW UP IS WARRANTED


`;
          actions += `REQUIRED ACTIONS
    CONSIDER HOSPITAL BASED CARE
    INITIATE APPROPRIATE ANTIBIOTIC THERAPY
    MONITOR FOR CLINICAL IMPROVEMENT


`;
        } else {
          summary += `CLINICAL IMPRESSION
    A CURB 65 SCORE OF ${value} INDICATES LOW SEVERITY PNEUMONIA


RECOMMENDATIONS
    CONSIDER HOME BASED TREATMENT WITH ORAL ANTIBIOTICS


`;
          actions += `ROUTINE ACTIONS
    CONSIDER HOME BASED TREATMENT
    PROVIDE CLEAR SAFETY NETTING INSTRUCTIONS


`;
        }
        break;

      case 'Wells PE':
        if (value > 4) {
          riskLevel = 'High';
          summary += `CLINICAL IMPRESSION
    A WELLS SCORE OF ${value} INDICATES THAT PULMONARY EMBOLISM PE IS LIKELY


RECOMMENDATIONS
    DIAGNOSTIC IMAGING IS REQUIRED TO CONFIRM THE DIAGNOSIS


`;
          actions += `PE ACTIONS
    INITIATE EMPIRICAL ANTICOAGULATION
    URGENT SPECIALIST REVIEW
    MONITOR FOR SIGNS OF RIGHT HEART STRAIN


`;
          diagnostics += `DIAGNOSTIC WORKUP
    CT PULMONARY ANGIOGRAM CTPA
    VQ SCAN IF CTPA IS CONTRAINDICATED
    BEDSIDE ECHOCARDIOGRAM


`;
        } else {
          summary += `CLINICAL IMPRESSION
    A WELLS SCORE OF ${value} INDICATES THAT PULMONARY EMBOLISM IS UNLIKELY


RECOMMENDATIONS
    USE D DIMER TO RULE OUT PE


`;
          actions += `ROUTINE ACTIONS
    USE D DIMER TO RULE OUT PE


`;
          diagnostics += `DIAGNOSTIC WORKUP
    HIGH SENSITIVITY D DIMER ASSAY


`;
        }
        break;

      case 'CHA₂DS₂-VASc':
        if (value >= 2) {
          riskLevel = 'Moderate';
          summary += `CLINICAL IMPRESSION
    A CHADS VASC SCORE OF ${value} INDICATES A HIGH RISK OF THROMBOEMBOLISM


RECOMMENDATIONS
    ORAL ANTICOAGULATION IS STRONGLY RECOMMENDED


`;
          actions += `AF ACTIONS
    ORAL ANTICOAGULATION IS STRONGLY RECOMMENDED
    REVIEW FOR BLEEDING RISK
    OPTIMIZE BLOOD PRESSURE CONTROL


`;
        } else if (value === 1 && patientData.ageGroup !== 'Female') {
          summary += `CLINICAL IMPRESSION
    A CHADS VASC SCORE OF 1 INDICATES A MODERATE RISK OF STROKE


RECOMMENDATIONS
    CONSIDER ORAL ANTICOAGULATION BASED ON INDIVIDUAL FACTORS


`;
          actions += `REQUIRED ACTIONS
    CONSIDER ORAL ANTICOAGULATION
    DISCUSS RISKS VS BENEFITS


`;
        } else {
          summary += `CLINICAL IMPRESSION
    A CHADS VASC SCORE OF ${value} INDICATES A LOW RISK OF STROKE


RECOMMENDATIONS
    NO ANTITHROMBOTIC THERAPY OR ASPIRIN MAY BE CONSIDERED


`;
          actions += `ROUTINE ACTIONS
    NO ANTITHROMBOTIC THERAPY
    MANAGE MODIFIABLE RISK FACTORS


`;
        }
        break;

      case 'ARISCAT':
        if (value >= 45) {
          riskLevel = 'High';
          summary += `CLINICAL IMPRESSION
    AN ARISCAT SCORE OF ${value} INDICATES A HIGH RISK OF POSTOPERATIVE RESPIRATORY COMPLICATIONS


RECOMMENDATIONS
    PRE OPERATIVE AND POST OPERATIVE OPTIMIZATION IS CRITICAL


`;
          actions += `ARISCAT ACTIONS
    PRE OPERATIVE OPTIMIZATION OF RESPIRATORY STATUS
    CONSIDER POST OPERATIVE ICU HDU ADMISSION
    AGGRESSIVE CHEST PHYSIOTHERAPY


`;
          diagnostics += `DIAGNOSTIC WORKUP
    PRE OPERATIVE PULMONARY FUNCTION TESTS
    BASELINE ABG


`;
        } else if (value >= 26) {
          riskLevel = 'Moderate';
          summary += `CLINICAL IMPRESSION
    AN ARISCAT SCORE OF ${value} INDICATES AN INTERMEDIATE RISK OF COMPLICATIONS


RECOMMENDATIONS
    POST OPERATIVE INCENTIVE SPIROMETRY RECOMMENDED


`;
          actions += `REQUIRED ACTIONS
    POST OPERATIVE INCENTIVE SPIROMETRY
    EARLY MOBILIZATION AND ADEQUATE ANALGESIA


`;
        } else {
          summary += `CLINICAL IMPRESSION
    AN ARISCAT SCORE OF ${value} INDICATES A LOW RISK OF POSTOPERATIVE RESPIRATORY COMPLICATIONS


RECOMMENDATIONS
    CONTINUE ROUTINE POST OPERATIVE CARE


`;
        }
        break;

      default:
        // Try to find knowledge from the database
        const key = scoreType.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const knowledge = (MEDICAL_KNOWLEDGE.scores as any)[key];
        if (knowledge) {
          summary += `CLINICAL IMPRESSION ${knowledge.name.toUpperCase()}
    ${knowledge.description.toUpperCase()}


`;
          if (knowledge.recommendations) {
            actions += `RECOMMENDATIONS
    ${knowledge.recommendations.map((r: string) => r.toUpperCase()).join('\n    ')}


`;
          }
          // Basic risk mapping if possible
          if (knowledge.interpretation) {
            const entry = knowledge.interpretation[value] || knowledge.interpretation[String(value)];
            if (entry) {
              summary += `INTERPRETATION
    ${(entry.message || entry.risk || '').toUpperCase()} MORTALITY ${entry.mortality || 'NA'}


`;
              if (entry.risk) riskLevel = entry.risk as any;
              if (entry.action) actions += `REQUIRED ACTION
    ${entry.action.toUpperCase()}


`;
            }
          }
        } else {
          summary += `CLINICAL IMPRESSION
    A CLINICAL SCORE OF ${value} WAS CALCULATED USING THE ${scoreType} SYSTEM


RECOMMENDATIONS
    PLEASE INTERPRET THIS RESULT WITHIN THE BROADER CONTEXT OF THE PATIENT HISTORY


`;
        }
    }

    // Physical Exam Integration
    if (patientData.exam) {
      const { jvp, capRefill, skinTurgor, mucosa, pulseGrade, muscleStrength } = patientData.exam;
      const liver = patientData.liver;

      if (jvp > 8 || capRefill > 2 || skinTurgor !== 'Normal' || mucosa !== 'Moist' || pulseGrade < 2 || muscleStrength < 5 || (liver && (liver.ascites > 1 || liver.encephalopathy > 1))) {
        summary += `GRANULAR PHYSICAL EXAM FINDINGS


`;
        
        // Hemodynamic/Fluid Status
        if (jvp > 8) {
          summary += `    ELEVATED JVP ${jvp} MMHG
        SUGGESTS CENTRAL VENOUS CONGESTION POTENTIALLY DUE TO RIGHT HEART FAILURE


`;
          actions += `HEMODYNAMIC ACTIONS
    ASSESS FOR PERIPHERAL EDEMA
    CONSIDER DIURETIC THERAPY


`;
        }
        if (capRefill > 2) {
          summary += `    PROLONGED CAPILLARY REFILL ${capRefill}S
        INDICATES POOR PERIPHERAL TISSUE PERFUSION


`;
          actions += `PERFUSION ACTIONS
    EVALUATE FOR OTHER SIGNS OF SHOCK


`;
        }
        if (skinTurgor !== 'Normal' || mucosa !== 'Moist') {
          summary += `    SIGNS OF DEHYDRATION
        ${skinTurgor.toUpperCase()} SKIN TURGOR AND ${mucosa.toUpperCase()} MUCOSA SUGGEST VOLUME DEPLETION


`;
          actions += `FLUID ACTIONS
    INITIATE APPROPRIATE FLUID RESUSCITATION
    MONITOR URINE OUTPUT


`;
        }
        
        // Vascular/Neuromuscular
        if (pulseGrade === 0) {
          summary += `    ABSENT PULSES GRADE 0
        CRITICAL FINDING SUGGESTING ACUTE LIMB ISCHEMIA


`;
          riskLevel = 'Critical';
          actions = `URGENT ACTIONS
    URGENT VASCULAR SURGERY CONSULT


` + actions;
        } else if (pulseGrade === 1) {
          summary += `    WEAK THREADY PULSES GRADE 1
        SUGGESTS LOW STROKE VOLUME


`;
        }
        
        if (muscleStrength < 3) {
          summary += `    SIGNIFICANT MUSCLE WEAKNESS GRADE ${muscleStrength} OUT OF 5
        PATIENT CANNOT MOVE AGAINST GRAVITY


`;
          actions += `NEUROMUSCULAR ACTIONS
    CHECK ELECTROLYTES
    CONSIDER NEUROLOGICAL IMAGING


`;
        } else if (muscleStrength < 5) {
          summary += `    MILD MUSCLE WEAKNESS GRADE ${muscleStrength} OUT OF 5
        REDUCED STRENGTH AGAINST RESISTANCE


`;
        }

        // Liver specific findings
        if (liver) {
          if (liver.ascites > 1) {
            summary += `    ASCITES ${liver.ascites === 2 ? 'MILD' : 'SEVERE'}
        INDICATES PORTAL HYPERTENSION


`;
            diagnostics += `LIVER WORKUP
    DIAGNOSTIC PARACENTESIS


`;
          }
          if (liver.encephalopathy > 1) {
            summary += `    HEPATIC ENCEPHALOPATHY GRADE ${liver.encephalopathy === 2 ? '1 TO 2' : '3 TO 4'}
        SIGNIFICANT NEURO METABOLIC COMPLICATION


`;
            riskLevel = liver.encephalopathy === 3 ? 'Critical' : 'High';
            actions += `ENCEPHALOPATHY ACTIONS
    INITIATE LACTULOSE AND RIFAXIMIN
    MONITOR AIRWAY


`;
          }
        }

        // Anthropometry Integration
        if (patientData.anthro && patientData.anthro.height && (patientData.anthro.waist || patientData.anthro.weight)) {
          const { waist, height, weight, hip } = patientData.anthro;
          
          if (waist && height) {
            const ratio = Number(waist) / Number(height);
            if (ratio > 0.5) {
              summary += `    INCREASED CARDIOMETABOLIC RISK
        WAIST TO HEIGHT RATIO IS ${ratio.toFixed(2)}


`;
              education += `METABOLIC EDUCATION
    DISCUSS WEIGHT MANAGEMENT


`;
            }
          }

          if (weight && height) {
            const bmi = ScoringEngine.calculateBMI(weight, height);
            if (bmi) {
              summary += `    BODY MASS INDEX BMI
        ${bmi} KG PER M2


`;
              if (bmi >= 30) {
                summary += `        PATIENT IS IN THE OBESE RANGE


`;
                riskLevel = riskLevel === 'Low' ? 'Moderate' : riskLevel;
              } else if (bmi < 18.5) {
                summary += `        PATIENT IS UNDERWEIGHT


`;
              }
            }
          }

          if (waist && hip) {
            const whr = ScoringEngine.calculateWHR(waist, hip);
            if (whr) {
              summary += `    WAIST TO HIP RATIO
        ${whr}


`;
              if (whr > 0.9) {
                summary += `        ELEVATED WHR INDICATES CENTRAL ADIPOSITY


`;
              }
            }
          }
        }
      }
    }

    // Vital Sign Integration
    if (vitals.hr.severity === 'Critical' || vitals.rr.severity === 'Critical' || vitals.sbp.severity === 'Critical') {
      riskLevel = 'Critical';
      summary += `HEMODYNAMIC ALERT
    ONE OR MORE VITAL SIGNS ARE IN THE CRITICAL RANGE
    PHYSIOLOGICAL STABILIZATION MUST BE THE IMMEDIATE PRIORITY


`;
      actions = `URGENT ACTIONS
    URGENT STABILIZE VITAL SIGNS IMMEDIATELY


` + actions;
    }

    // Focus-specific adjustments
    if (options.focus === 'educational') {
      education += `GENERAL EDUCATION
    ${this.getGeneralEducation(scoreType, riskLevel).map(e => e.toUpperCase()).join('\n    ')}


`;
    } else if (options.focus === 'therapeutic') {
      actions += `THERAPEUTIC ACTIONS
    REVIEW CURRENT MEDICATION LIST
    OPTIMIZE PAIN MANAGEMENT


`;
    }

    // Apply depth options to local summary
    if (options.depth === 'concise') {
      const lines = summary.split('\n\n');
      summary = (lines[0] || '') + '\n\n' + (lines[1] || '');
    } else if (options.depth === 'detailed') {
      summary += `PHYSIOLOGICAL RATIONALE
    THE CALCULATED ${scoreType} SCORE OF ${value} REFLECTS THE CUMULATIVE BURDEN OF PHYSIOLOGICAL DERANGEMENT
    IN ${patientData.ageGroup.toUpperCase()} PATIENTS COMPENSATORY MECHANISMS MAY MASK EARLY DECLINE


`;
    }

    return {
      summary,
      actions,
      diagnostics,
      education,
      documentation: `LOCAL AI SYNTHESIS ${new Date().toLocaleString().toUpperCase()}


SCORE
    ${scoreType} EQUALS ${value}


VITALS
    HR ${components.hr} RR ${components.rr} BP ${components.sbp}


RISK
    ${riskLevel.toUpperCase()}


MODE
    OFFLINE LOCAL`,
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
