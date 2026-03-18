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
  actions: string[];
  diagnostics: string[];
  education: string[];
  documentation: string;
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
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
        actions: result.actions || [],
        diagnostics: result.diagnostics || [],
        education: result.education || [],
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
    const actions: string[] = [];
    const diagnostics: string[] = [];
    const education: string[] = [];
    let riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical' = 'Low';
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
          riskLevel = 'High';
          summary += `**Clinical Impression:** The patient's Modified Early Warning Score (MEWS) of ${value} indicates a significant risk of clinical deterioration. This threshold typically requires immediate escalation to a senior medical officer or rapid response team.\n\n`;
          actions.push("Immediate medical review by a senior clinician/registrar", "Consider Rapid Response Team (RRT) or ICU consult", "Increase monitoring frequency to every 15-30 minutes", "Ensure patent IV access (large bore)");
          diagnostics.push("Urgent Arterial Blood Gas (ABG) for metabolic/respiratory status", "Stat 12-lead ECG and Chest X-ray", "Comprehensive metabolic panel, Lactate level, and Troponin if indicated");
        } else if (value >= 3) {
          riskLevel = 'Moderate';
          summary += `**Clinical Impression:** A MEWS score of ${value} suggests a moderate risk. Increased vigilance and clinical review are recommended to identify underlying causes of physiological instability.\n\n`;
          actions.push("Notify the attending physician", "Increase observation frequency to hourly", "Review fluid balance and medication chart", "Assess for potential sources of infection or occult bleeding");
          diagnostics.push("Baseline blood work (FBC, U&E, CRP)", "Strict fluid balance monitoring and urine output tracking");
        } else {
          summary += `**Clinical Impression:** A MEWS score of ${value} indicates a low risk. The patient appears physiologically stable at this time.\n\n`;
          actions.push("Continue routine 4-hourly observations", "Maintain standard care plan");
        }
        break;

      case 'GCS':
        if (value <= 8) {
          riskLevel = 'Critical';
          summary += `**Clinical Impression:** A Glasgow Coma Scale (GCS) of ${value} indicates severe neurological impairment. At this level, the patient's protective airway reflexes are likely compromised ('GCS of 8, intubate').\n\n`;
          actions.push("URGENT: Secure airway (Consider Intubation/Mechanical Ventilation)", "Neurosurgical consultation stat", "Maintain cervical spine immobilization if trauma is suspected", "Implement neuro-protective measures (Head of bed 30°, normothermia)");
          diagnostics.push("Stat Non-contrast CT Head", "Monitor Intracranial Pressure (ICP) if indicated", "Comprehensive toxicology screen and bedside glucose check");
        } else if (value <= 12) {
          riskLevel = 'High';
          summary += `**Clinical Impression:** A GCS of ${value} indicates a moderate head injury or significant encephalopathy. Close neurological monitoring is essential to detect early signs of herniation or secondary injury.\n\n`;
          actions.push("Neurological observations (GCS + Pupils) every 15-30 minutes", "Notify neurosurgical or neurology team", "Avoid hypotension and hypoxia");
          diagnostics.push("CT Head within 1 hour", "Frequent GCS reassessment", "Check electrolytes (especially Sodium)");
        } else {
          summary += `**Clinical Impression:** A GCS of ${value} indicates a mild head injury or minor neurological impairment.\n\n`;
          actions.push("Neurological observations hourly for 4 hours, then 4-hourly", "Assess for post-concussive symptoms");
          education.push("Signs of increasing intracranial pressure (worsening headache, vomiting, confusion)", "When to seek emergency care after discharge (Concussion advice)");
        }
        break;

      case 'qSOFA':
        if (value >= 2) {
          riskLevel = 'High';
          summary += `**Clinical Impression:** A quick SOFA (qSOFA) score of ${value} is highly predictive of sepsis-related mortality and prolonged ICU stay. This patient meets the criteria for suspected sepsis with organ dysfunction.\n\n`;
          actions.push("Initiate Sepsis-6 Protocol immediately", "Administer broad-spectrum antibiotics within 1 hour ('Golden Hour')", "Aggressive fluid resuscitation (30ml/kg crystalloid if hypotensive)", "Oxygen therapy to maintain SpO2 > 94%");
          diagnostics.push("Blood cultures x2 sets (aerobic/anaerobic) before antibiotics", "Serial Serum Lactate levels (q2-4h if elevated)", "Procalcitonin, CRP, and source-specific imaging (e.g., CXR, CT Abdo)");
        } else {
          summary += `**Clinical Impression:** qSOFA score is ${value}. While not meeting the high-risk threshold for sepsis, clinical suspicion should remain high if an infectious source is suspected.\n\n`;
          actions.push("Monitor for signs of emerging organ dysfunction", "Re-evaluate qSOFA and full SOFA score frequently", "Screen for infection sources");
        }
        break;

      case 'SIRS':
        if (value >= 2) {
          riskLevel = 'Moderate';
          summary += `**Clinical Impression:** The patient meets Systemic Inflammatory Response Syndrome (SIRS) criteria (Score: ${value}). While non-specific, this indicates a significant systemic inflammatory state which may be due to infection, trauma, or inflammation.\n\n`;
          actions.push("Screen for potential infection (Sepsis screen)", "Monitor vitals closely", "Review white cell count and temperature trends");
          diagnostics.push("Blood cultures", "Urinalysis and CXR", "Inflammatory markers (CRP/ESR)");
        } else {
          summary += `**Clinical Impression:** SIRS score is ${value}. No significant systemic inflammatory response detected at this time.\n\n`;
        }
        break;

      case 'PEWS':
        if (value >= 5) {
          riskLevel = 'Critical';
          summary += `**Clinical Impression:** A Pediatric Early Warning Score (PEWS) of ${value} in a ${patientData.ageGroup} patient is a critical finding. There is a high risk of rapid respiratory or cardiovascular collapse.\n\n`;
          actions.push("Immediate Pediatric Rapid Response or Code activation", "Start high-flow oxygen or non-invasive ventilation", "Senior pediatric registrar/consultant review stat", "Prepare for emergency airway management");
          diagnostics.push("Capillary or Arterial Blood Gas", "Continuous multi-parameter monitoring (ECG, SpO2, NIBP)", "Stat portable Chest X-ray");
        } else if (value >= 3) {
          riskLevel = 'High';
          summary += `**Clinical Impression:** A PEWS score of ${value} indicates significant clinical distress in a pediatric patient. This requires urgent escalation and frequent reassessment.\n\n`;
          actions.push("Urgent pediatric review (within 30 mins)", "Increase monitoring frequency to every 30-60 mins", "Review by senior nursing staff", "Assess for dehydration or respiratory fatigue");
        } else {
          summary += `**Clinical Impression:** PEWS score is ${value}. The pediatric patient appears stable, but continue to monitor for age-specific signs of distress.\n\n`;
          actions.push("Continue routine pediatric observations", "Ensure adequate hydration and comfort");
        }
        break;

      case 'CURB-65':
        if (value >= 3) {
          riskLevel = 'High';
          summary += `**Clinical Impression:** A CURB-65 score of ${value} indicates severe community-acquired pneumonia. This patient has a high risk of mortality (up to 27%) and typically requires inpatient management, often in a high-dependency or intensive care setting.\n\n`;
          actions.push("Urgent hospital admission", "Consider ICU/HDU admission if score is 4-5", "Start IV broad-spectrum antibiotics immediately", "Assess for supplemental oxygen requirements");
          diagnostics.push("Chest X-ray", "Sputum and Blood cultures", "Legionella and Pneumococcal urinary antigen tests", "Urea and Electrolytes");
        } else if (value === 2) {
          riskLevel = 'Moderate';
          summary += `**Clinical Impression:** A CURB-65 score of 2 indicates moderate severity pneumonia. Mortality risk is approximately 6.8%. Short-stay inpatient care or very close outpatient follow-up is warranted.\n\n`;
          actions.push("Consider hospital-based care (short stay)", "Initiate appropriate antibiotic therapy", "Monitor for clinical improvement over 24-48 hours");
        } else {
          summary += `**Clinical Impression:** A CURB-65 score of ${value} indicates low severity pneumonia. Mortality risk is low (<2%).\n\n`;
          actions.push("Consider home-based treatment with oral antibiotics", "Provide clear safety-netting instructions");
        }
        break;

      case 'Wells PE':
        if (value > 4) {
          riskLevel = 'High';
          summary += `**Clinical Impression:** A Wells score of ${value} indicates that Pulmonary Embolism (PE) is LIKELY. Diagnostic imaging is required to confirm or rule out the diagnosis.\n\n`;
          actions.push("Initiate empirical anticoagulation if no high-risk bleeding contraindications", "Urgent specialist review (Pulmonology/Hematology)", "Monitor for signs of right heart strain");
          diagnostics.push("CT Pulmonary Angiogram (CTPA) is the gold standard", "V/Q scan if CTPA is contraindicated (e.g., renal failure, contrast allergy)", "Bedside Echocardiogram to assess right ventricular function");
        } else {
          summary += `**Clinical Impression:** A Wells score of ${value} indicates that Pulmonary Embolism is UNLIKELY.\n\n`;
          actions.push("Use D-dimer to rule out PE");
          diagnostics.push("High-sensitivity D-dimer assay", "If D-dimer is negative, PE can be safely ruled out without further imaging");
        }
        break;

      case 'CHA₂DS₂-VASc':
        if (value >= 2) {
          riskLevel = 'Moderate';
          summary += `**Clinical Impression:** A CHA₂DS₂-VASc score of ${value} indicates a high risk of thromboembolism in the setting of Atrial Fibrillation. Annual stroke risk is significantly elevated, warranting preventative therapy.\n\n`;
          actions.push("Oral anticoagulation (DOAC or Warfarin) is strongly recommended", "Review for bleeding risk (HAS-BLED score)", "Optimize blood pressure control");
        } else if (value === 1 && patientData.ageGroup !== 'Female') {
          summary += `**Clinical Impression:** A CHA₂DS₂-VASc score of 1 indicates a moderate risk of stroke.\n\n`;
          actions.push("Consider oral anticoagulation based on individual patient factors and preferences", "Discuss risks vs benefits of therapy with the patient");
        } else {
          summary += `**Clinical Impression:** A CHA₂DS₂-VASc score of ${value} indicates a low risk of stroke.\n\n`;
          actions.push("No antithrombotic therapy or Aspirin may be considered", "Focus on managing modifiable risk factors");
        }
        break;

      case 'ARISCAT':
        if (value >= 45) {
          riskLevel = 'High';
          summary += `**Clinical Impression:** An ARISCAT score of ${value} indicates a high risk of postoperative respiratory complications (approximately 50% incidence). Pre-operative and post-operative optimization is critical.\n\n`;
          actions.push("Pre-operative optimization of respiratory status (e.g., smoking cessation, bronchodilators)", "Consider post-operative ICU/HDU admission for monitoring", "Aggressive chest physiotherapy and early mobilization");
          diagnostics.push("Pre-operative Pulmonary Function Tests (PFTs)", "Baseline ABG");
        } else if (value >= 26) {
          riskLevel = 'Moderate';
          summary += `**Clinical Impression:** An ARISCAT score of ${value} indicates an intermediate risk of complications (approximately 13%).\n\n`;
          actions.push("Post-operative incentive spirometry", "Early mobilization and adequate analgesia to prevent splinting");
        } else {
          summary += `**Clinical Impression:** An ARISCAT score of ${value} indicates a low risk of postoperative respiratory complications (~1.6%).\n\n`;
        }
        break;

      default:
        // Try to find knowledge from the database
        const key = scoreType.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const knowledge = (MEDICAL_KNOWLEDGE.scores as any)[key];
        if (knowledge) {
          summary += `**Clinical Impression (${knowledge.name}):** ${knowledge.description}\n\n`;
          if (knowledge.recommendations) {
            actions.push(...knowledge.recommendations);
          }
          // Basic risk mapping if possible
          if (knowledge.interpretation) {
            const entry = knowledge.interpretation[value] || knowledge.interpretation[String(value)];
            if (entry) {
              summary += `**Interpretation:** ${entry.message || entry.risk || ''} (Mortality: ${entry.mortality || 'N/A'})\n\n`;
              if (entry.risk) riskLevel = entry.risk as any;
              if (entry.action) actions.push(entry.action);
            }
          }
        } else {
          summary += `**Clinical Impression:** A clinical score of ${value} was calculated using the ${scoreType} system. Please interpret this result within the broader context of the patient's history, physical examination, and clinical trajectory.\n\n`;
        }
    }

    // Physical Exam Integration
    if (patientData.exam) {
      const { jvp, capRefill, skinTurgor, mucosa, pulseGrade, muscleStrength } = patientData.exam;
      const liver = patientData.liver;

      if (jvp > 8 || capRefill > 2 || skinTurgor !== 'Normal' || mucosa !== 'Moist' || pulseGrade < 2 || muscleStrength < 5 || (liver && (liver.ascites > 1 || liver.encephalopathy > 1))) {
        summary += `**Granular Physical Exam Findings:**\n`;
        
        // Hemodynamic/Fluid Status
        if (jvp > 8) {
          summary += `- **Elevated JVP (${jvp} mmHg):** Suggests central venous congestion, potentially due to right heart failure or fluid overload.\n`;
          actions.push("Assess for peripheral edema and hepatomegaly", "Consider diuretic therapy if fluid overloaded");
        }
        if (capRefill > 2) {
          summary += `- **Prolonged Capillary Refill (${capRefill}s):** Indicates poor peripheral tissue perfusion; consider shock states (hypovolemic, cardiogenic, or distributive).\n`;
          actions.push("Evaluate for other signs of shock (cool extremities, narrow pulse pressure)");
        }
        if (skinTurgor !== 'Normal' || mucosa !== 'Moist') {
          summary += `- **Signs of Dehydration:** ${skinTurgor} skin turgor and ${mucosa} mucosa suggest significant volume depletion.\n`;
          actions.push("Initiate appropriate fluid resuscitation", "Monitor urine output (target > 0.5ml/kg/hr)");
        }
        
        // Vascular/Neuromuscular
        if (pulseGrade === 0) {
          summary += `- **Absent Pulses (Grade 0):** Critical finding suggesting acute limb ischemia or profound circulatory collapse.\n`;
          riskLevel = 'Critical';
          actions.unshift("URGENT: Vascular surgery consult or ACLS activation");
        } else if (pulseGrade === 1) {
          summary += `- **Weak/Thready Pulses (Grade 1):** Suggests low stroke volume or peripheral arterial disease.\n`;
        }
        
        if (muscleStrength < 3) {
          summary += `- **Significant Muscle Weakness (Grade ${muscleStrength}/5):** Patient cannot move against gravity. Requires urgent neurological/metabolic evaluation.\n`;
          actions.push("Check electrolytes (Potassium, Magnesium, Calcium)", "Consider neurological imaging if focal");
        } else if (muscleStrength < 5) {
          summary += `- **Mild Muscle Weakness (Grade ${muscleStrength}/5):** Reduced strength against resistance.\n`;
        }

        // Liver specific findings
        if (liver) {
          if (liver.ascites > 1) {
            summary += `- **Ascites (${liver.ascites === 2 ? 'Mild' : 'Severe'}):** Indicates portal hypertension or advanced liver disease.\n`;
            diagnostics.push("Diagnostic paracentesis to rule out Spontaneous Bacterial Peritonitis (SBP)");
          }
          if (liver.encephalopathy > 1) {
            summary += `- **Hepatic Encephalopathy (Grade ${liver.encephalopathy === 2 ? '1-2' : '3-4'}):** Significant neuro-metabolic complication.\n`;
            riskLevel = liver.encephalopathy === 3 ? 'Critical' : 'High';
            actions.push("Initiate Lactulose and Rifaximin", "Monitor airway if GCS drops");
          }
        }

        // Anthropometry Integration
        if (patientData.anthro && patientData.anthro.height && (patientData.anthro.waist || patientData.anthro.weight)) {
          const { waist, height, weight, hip } = patientData.anthro;
          
          if (waist && height) {
            const ratio = Number(waist) / Number(height);
            if (ratio > 0.5) {
              summary += `- **Increased Cardiometabolic Risk:** Waist-to-height ratio is ${ratio.toFixed(2)} (Normal < 0.5).\n`;
              education.push("Discuss weight management and metabolic health optimization");
            }
          }

          if (weight && height) {
            const bmi = ScoringEngine.calculateBMI(weight, height);
            if (bmi) {
              summary += `- **Body Mass Index (BMI):** ${bmi} kg/m².\n`;
              if (bmi >= 30) {
                summary += `  - **Clinical Note:** Patient is in the obese range, which significantly increases risk for metabolic syndrome and cardiovascular disease.\n`;
                riskLevel = riskLevel === 'Low' ? 'Moderate' : riskLevel;
              } else if (bmi < 18.5) {
                summary += `  - **Clinical Note:** Patient is underweight; assess for nutritional deficiencies or chronic wasting diseases.\n`;
              }
            }
          }

          if (waist && hip) {
            const whr = ScoringEngine.calculateWHR(waist, hip);
            if (whr) {
              summary += `- **Waist-to-Hip Ratio:** ${whr} (Normal < 0.9 for men, < 0.85 for women).\n`;
              if (whr > 0.9) {
                summary += `  - **Clinical Note:** Elevated WHR indicates central adiposity and increased metabolic risk.\n`;
              }
            }
          }
        }
        summary += `\n`;
      }
    }

    // Vital Sign Integration
    if (vitals.hr.severity === 'Critical' || vitals.rr.severity === 'Critical' || vitals.sbp.severity === 'Critical') {
      riskLevel = 'Critical';
      summary += `**HEMODYNAMIC ALERT:** One or more vital signs are in the **CRITICAL** range. Physiological stabilization must be the immediate priority, regardless of the calculated score.\n\n`;
      actions.unshift("URGENT: Stabilize vital signs immediately (Airway, Breathing, Circulation)");
    }

    // Focus-specific adjustments
    if (options.focus === 'educational') {
      education.push(...this.getGeneralEducation(scoreType, riskLevel));
    } else if (options.focus === 'therapeutic') {
      actions.push("Review current medication list for potential nephrotoxins or contributors", "Optimize pain management and comfort");
    }

    // Apply depth options to local summary
    if (options.depth === 'concise') {
      const lines = summary.split('\n\n');
      summary = (lines[0] || '') + '\n\n' + (lines[1] || '');
    } else if (options.depth === 'detailed') {
      summary += `\n**Physiological Rationale:** The calculated ${scoreType} score of ${value} reflects the cumulative burden of physiological derangement. In ${patientData.ageGroup} patients, compensatory mechanisms may mask early decline, making serial assessment vital.`;
    }

    return {
      summary,
      actions: [...new Set(actions)].slice(0, 8), // Unique and capped
      diagnostics: [...new Set(diagnostics)].slice(0, 6),
      education: [...new Set(education)].slice(0, 5),
      documentation: `LOCAL AI SYNTHESIS - ${new Date().toLocaleString()}\nSCORE: ${scoreType}=${value}\nVITALS: HR=${components.hr}, RR=${components.rr}, BP=${components.sbp}\nRISK: ${riskLevel}\nMODE: OFFLINE/LOCAL`,
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
