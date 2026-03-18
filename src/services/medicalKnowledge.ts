/**
 * Comprehensive database of clinical scoring systems and diagnostic tests.
 * Derived from validated clinical sources and peer-reviewed literature.
 */

export const MEDICAL_KNOWLEDGE = {
  scores: {
    qsofa: {
      name: "Quick Sequential Organ Failure Assessment",
      description: "Bedside screening tool for sepsis outside ICU",
      interpretation: {
        0: { risk: "Low", mortality: "3.6%", action: "Continue monitoring" },
        1: { risk: "Moderate", mortality: "8.4%", action: "Check lactate, blood cultures" },
        2: { risk: "High", mortality: "20.5%", action: "Full sepsis workup, consider ICU" },
        3: { risk: "Critical", mortality: "34.8%", action: "Urgent ICU admission, full sepsis bundle" }
      },
      recommendations: [
        "Obtain lactate STAT",
        "Draw blood cultures x2 before antibiotics",
        "Broad-spectrum antibiotics within 1 hour",
        "IV fluids 30mL/kg if hypotensive",
        "ICU consultation for positive scores (>=2)"
      ]
    },
    sofa: {
      name: "Sequential Organ Failure Assessment",
      description: "Daily assessment of organ dysfunction in ICU",
      interpretation: {
        "0-6": { risk: "Low", mortality: "<10%" },
        "7-12": { risk: "Moderate", mortality: "20-40%" },
        "13-18": { risk: "High", mortality: "50-60%" },
        "19-24": { risk: "Critical", mortality: ">80%" }
      }
    },
    curb_65: {
      name: "CURB-65 Pneumonia Severity Score",
      description: "Severity assessment for community-acquired pneumonia",
      interpretation: {
        0: { risk: "Low", mortality: "0.7%", management: "Home treatment" },
        1: { risk: "Low", mortality: "3.2%", management: "Home vs short stay" },
        2: { risk: "Moderate", mortality: "13.0%", management: "Hospital admission" },
        3: { risk: "High", mortality: "17.0%", management: "ICU admission" },
        4: { risk: "High", mortality: "41.5%", management: "ICU admission" },
        5: { risk: "Critical", mortality: "57.0%", management: "ICU admission" }
      }
    },
    wells_pe: {
      name: "Wells Criteria for Pulmonary Embolism",
      description: "Pre-test probability for PE",
      interpretation: {
        "0-1": { probability: "Low", prevalence: "1.3%", action: "D-dimer to exclude" },
        "2-6": { probability: "Moderate", prevalence: "16.2%", action: "D-dimer recommended" },
        ">=7": { probability: "High", prevalence: "40.6%", action: "CTPA directly" }
      }
    },
    nihss: {
      name: "NIH Stroke Scale",
      description: "Quantitative measure of stroke severity",
      interpretation: {
        "0": { severity: "No stroke symptoms" },
        "1-4": { severity: "Minor stroke" },
        "5-15": { severity: "Moderate stroke" },
        "16-20": { severity: "Moderate to severe stroke" },
        "21-42": { severity: "Severe stroke" }
      }
    },
    meld_na: {
      name: "MELD-Na Score",
      description: "Liver transplant priority and mortality",
      interpretation: {
        "<10": { mortality: "1.9%", priority: "Low" },
        "10-19": { mortality: "6.0%", priority: "Moderate" },
        "20-29": { mortality: "19.6%", priority: "High" },
        "30-39": { mortality: "52.6%", priority: "Urgent" },
        ">=40": { mortality: "71.3%", priority: "Critical" }
      }
    },
    child_pugh: {
      name: "Child-Pugh Score",
      description: "Cirrhosis severity and prognosis",
      interpretation: {
        "A": { survival_1y: "85%", risk: "Low" },
        "B": { survival_1y: "57%", risk: "Moderate" },
        "C": { survival_1y: "35%", risk: "High" }
      }
    },
    ranson: {
      name: "Ranson's Criteria",
      description: "Severity prediction in acute pancreatitis",
      interpretation: {
        "0-2": { mortality: "<1%", severity: "Mild" },
        "3-4": { mortality: "16%", severity: "Moderate" },
        "5-6": { mortality: "40%", severity: "Severe" },
        ">=7": { mortality: ">90%", severity: "Critical" }
      }
    },
    apache_ii: {
      name: "APACHE II",
      description: "ICU mortality prediction within 24h of admission",
      interpretation: {
        "0-14": { risk: "Low", mortality: "<15%" },
        "15-24": { risk: "Moderate", mortality: "25-40%" },
        "25-34": { risk: "High", mortality: "55-75%" },
        ">34": { risk: "Extreme", mortality: ">85%" }
      }
    },
    grace: {
      name: "GRACE ACS Risk Score",
      description: "Mortality prediction in acute coronary syndrome",
      interpretation: {
        "Low": { mortality: "<1%", action: "Medical management" },
        "Intermediate": { mortality: "1-3%", action: "Invasive strategy" },
        "High": { mortality: ">3%", action: "Urgent invasive strategy" }
      }
    },
    timi: {
      name: "TIMI Risk Score for UA/NSTEMI",
      description: "Risk stratification for unstable angina/NSTEMI",
      interpretation: {
        "0-2": { risk: "Low", event_rate: "0.8-3.7%" },
        "3-4": { risk: "Moderate", event_rate: "5.9-8.9%" },
        "5-7": { risk: "High", event_rate: "12.6-19.9%" }
      }
    },
    heart: {
      name: "HEART Score for Chest Pain",
      description: "MACE prediction in chest pain",
      interpretation: {
        "0-3": { risk: "Low", mace: "1.7%", action: "Discharge home" },
        "4-6": { risk: "Moderate", mace: "16.6%", action: "Observation/Admit" },
        "7-10": { risk: "High", mace: "50.1%", action: "Early invasive strategy" }
      }
    }
  },
  tests: {
    cbc: {
      name: "Complete Blood Count",
      components: {
        wbc: { normal: "4.0-11.0 K/uL", critical: "<1.0 or >30.0" },
        hgb: { normal: "13.5-17.5 (M), 12.0-16.0 (F) g/dL", critical: "<7.0" },
        plt: { normal: "150-450 K/uL", critical: "<20 or >1000" }
      },
      interpretation: {
        high_wbc: "Infection, inflammation, leukemia, stress",
        low_hgb: "Anemia (Iron def, B12 def, blood loss)",
        low_plt: "ITP, DIC, TTP/HUS, medication effect"
      }
    },
    bmp: {
      name: "Basic Metabolic Panel",
      components: {
        na: { normal: "135-145 mEq/L", critical: "<120 or >155" },
        k: { normal: "3.5-5.1 mEq/L", critical: "<2.5 or >6.5" },
        cr: { normal: "0.6-1.2 mg/dL", critical: ">4.0" },
        glu: { normal: "70-100 mg/dL", critical: "<40 or >400" }
      }
    },
    lactate: {
      name: "Lactate",
      normal: "0.5-2.0 mmol/L",
      critical: ">4.0 mmol/L",
      interpretation: "Marker of tissue hypoperfusion and anaerobic metabolism. Target clearance: >20% in 2-4h."
    },
    procalcitonin: {
      name: "Procalcitonin",
      normal: "<0.1 ng/mL",
      interpretation: {
        "<0.1": "Bacterial infection unlikely",
        "0.1-0.5": "Low probability bacterial",
        "0.5-2.0": "Moderate probability bacterial",
        ">2.0": "High probability bacterial/sepsis"
      }
    },
    troponin: {
      name: "Troponin I",
      normal: "<0.04 ng/mL",
      critical: ">1.0 ng/mL",
      interpretation: "Marker of myocardial injury. Acute rise/fall indicates MI."
    },
    bnp: {
      name: "B-type Natriuretic Peptide",
      normal: "<100 pg/mL",
      interpretation: {
        "<100": "HF unlikely",
        "100-400": "Intermediate",
        ">400": "HF likely"
      }
    },
    abg: {
      name: "Arterial Blood Gas",
      interpretation: {
        respiratory_acidosis: "pH <7.35, pCO2 >45",
        respiratory_alkalosis: "pH >7.45, pCO2 <35",
        metabolic_acidosis: "pH <7.35, HCO3 <22",
        metabolic_alkalosis: "pH >7.45, HCO3 >26"
      }
    },
    coagulation: {
      pt_inr: { normal: "0.8-1.2", therapeutic: "2.0-3.0", critical: ">5.0" },
      ptt: { normal: "25-35s", therapeutic: "50-75s (heparin)" },
      d_dimer: { normal: "<250 ng/mL", interpretation: "Age-adjusted: age x 10 for >50y" }
    },
    renal: {
      creatinine: { normal: "0.6-1.2 mg/dL", critical: ">4.0" },
      bun: { normal: "7-20 mg/dL", ratio: ">20 suggests pre-renal or GI bleed" },
      egfr: { normal: ">=90", ckd: "<60 for >3 months" }
    },
    liver: {
      alt_ast: { normal: "10-40 U/L", ratio: ">2 suggests alcoholic etiology" },
      bilirubin: { normal: "0.1-1.2 mg/dL", critical: ">20" },
      albumin: { normal: "3.5-5.0 g/dL", low: "Suggests synthetic dysfunction or chronic inflammation" }
    }
  }
};
