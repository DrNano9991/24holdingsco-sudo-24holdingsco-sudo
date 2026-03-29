import React, { useState, useEffect, useMemo } from 'react';
import { Pill, Calculator, AlertCircle, CheckCircle2, Info, Search, ShieldCheck, AlertTriangle, Syringe, Mic } from 'lucide-react';
import { PatientData, AgeGroup } from '../types';
import { clinicalAI } from '../services/clinicalAI';
import ScoreCard from './ScoreCard';

interface Medication {
  name: string;
  category: string;
  standardDose: number; 
  defaultUnit: string;
  concentration: number; // in [defaultUnit] per [formUnit]
  formUnit: string; // 'ml', 'Tablet', 'Capsule', 'Tube', 'Application'
  dosageForms: string[]; // e.g. ['Oral', 'IV', 'IM', 'Topical']
  maxDose?: number; 
  warningThreshold?: number; 
}

const MEDICATION_DATABASE: Medication[] = [
  { name: 'Gentamicin', category: 'Antibiotic', standardDose: 5, defaultUnit: 'mg/kg', concentration: 40, formUnit: 'ml', dosageForms: ['IV', 'IM'], warningThreshold: 7 },
  { name: 'Ampicillin', category: 'Antibiotic', standardDose: 50, defaultUnit: 'mg/kg', concentration: 100, formUnit: 'ml', dosageForms: ['IV', 'IM', 'Oral'], warningThreshold: 100 },
  { name: 'Ceftriaxone', category: 'Antibiotic', standardDose: 80, defaultUnit: 'mg/kg', concentration: 100, formUnit: 'ml', dosageForms: ['IV', 'IM'], warningThreshold: 100 },
  { name: 'Paracetamol (Tablet)', category: 'Analgesic', standardDose: 15, defaultUnit: 'mg/kg', concentration: 500, formUnit: 'Tablet', dosageForms: ['Oral'], warningThreshold: 20 },
  { name: 'Paracetamol (Syrup)', category: 'Analgesic', standardDose: 15, defaultUnit: 'mg/kg', concentration: 24, formUnit: 'ml', dosageForms: ['Oral'], warningThreshold: 20 },
  { name: 'Amoxicillin (Capsule)', category: 'Antibiotic', standardDose: 45, defaultUnit: 'mg/kg', concentration: 250, formUnit: 'Capsule', dosageForms: ['Oral'], warningThreshold: 90 },
  { name: 'Morphine', category: 'Analgesic', standardDose: 0.1, defaultUnit: 'mg/kg', concentration: 1, formUnit: 'ml', dosageForms: ['IV', 'IM', 'SC', 'Oral'], warningThreshold: 0.2 },
  { name: 'Adrenaline', category: 'Resuscitation', standardDose: 0.01, defaultUnit: 'mg/kg', concentration: 0.1, formUnit: 'ml', dosageForms: ['IV', 'IM', 'SC'], warningThreshold: 0.02 },
  { name: 'Furosemide', category: 'Diuretic', standardDose: 1, defaultUnit: 'mg/kg', concentration: 10, formUnit: 'ml', dosageForms: ['IV', 'IM', 'Oral'], warningThreshold: 2 },
  { name: 'Hydrocortisone Cream', category: 'Steroid', standardDose: 1, defaultUnit: 'mg/kg', concentration: 10, formUnit: 'Application', dosageForms: ['Topical'], warningThreshold: 10 },
  { name: 'Diclofenac Gel', category: 'Analgesic', standardDose: 1, defaultUnit: 'mg/kg', concentration: 10, formUnit: 'Application', dosageForms: ['Topical'], warningThreshold: 5 },
  { name: 'Artemether/Lumefantrine', category: 'Antimalarial', standardDose: 1.7, defaultUnit: 'mg/kg', concentration: 20, formUnit: 'Tablet', dosageForms: ['Oral'], warningThreshold: 4 },
  { name: 'Metformin', category: 'Diabetes', standardDose: 15, defaultUnit: 'mg/kg', concentration: 500, formUnit: 'Tablet', dosageForms: ['Oral'], warningThreshold: 30 },
  { name: 'Amlodipine', category: 'Hypertension', standardDose: 0.1, defaultUnit: 'mg/kg', concentration: 5, formUnit: 'Tablet', dosageForms: ['Oral'], warningThreshold: 0.2 },
  { name: 'Atorvastatin', category: 'Hyperlipidemia', standardDose: 0.2, defaultUnit: 'mg/kg', concentration: 10, formUnit: 'Tablet', dosageForms: ['Oral'], warningThreshold: 0.5 },
  { name: 'Salbutamol Inhaler', category: 'Respiratory', standardDose: 0.1, defaultUnit: 'mg/kg', concentration: 0.1, formUnit: 'Puff', dosageForms: ['Inhalation'], warningThreshold: 0.3 },
  { name: 'Enalapril', category: 'Hypertension', standardDose: 0.1, defaultUnit: 'mg/kg', concentration: 5, formUnit: 'Tablet', dosageForms: ['Oral'], warningThreshold: 0.4 },
  { name: 'Losartan', category: 'Hypertension', standardDose: 0.7, defaultUnit: 'mg/kg', concentration: 50, formUnit: 'Tablet', dosageForms: ['Oral'], warningThreshold: 1.5 },
  { name: 'Nifedipine (Retard)', category: 'Hypertension', standardDose: 0.5, defaultUnit: 'mg/kg', concentration: 20, formUnit: 'Tablet', dosageForms: ['Oral'], warningThreshold: 1.0 },
  { name: 'Spironolactone', category: 'Diuretic', standardDose: 2, defaultUnit: 'mg/kg', concentration: 25, formUnit: 'Tablet', dosageForms: ['Oral'], warningThreshold: 4 },
  { name: 'Glibenclamide', category: 'Diabetes', standardDose: 0.1, defaultUnit: 'mg/kg', concentration: 5, formUnit: 'Tablet', dosageForms: ['Oral'], warningThreshold: 0.3 },
  { name: 'Insulin (Regular)', category: 'Diabetes', standardDose: 0.1, defaultUnit: 'U/kg', concentration: 100, formUnit: 'ml', dosageForms: ['SC', 'IV'], warningThreshold: 0.5 },
  { name: 'Simvastatin', category: 'Hyperlipidemia', standardDose: 0.3, defaultUnit: 'mg/kg', concentration: 20, formUnit: 'Tablet', dosageForms: ['Oral'], warningThreshold: 0.8 },
  { name: 'Azithromycin', category: 'Antibiotic', standardDose: 10, defaultUnit: 'mg/kg', concentration: 250, formUnit: 'Tablet', dosageForms: ['Oral'], warningThreshold: 15 },
  { name: 'Ciprofloxacin', category: 'Antibiotic', standardDose: 15, defaultUnit: 'mg/kg', concentration: 500, formUnit: 'Tablet', dosageForms: ['Oral', 'IV'], warningThreshold: 20 },
  { name: 'Metronidazole', category: 'Antibiotic', standardDose: 7.5, defaultUnit: 'mg/kg', concentration: 200, formUnit: 'Tablet', dosageForms: ['Oral', 'IV'], warningThreshold: 15 },
  { name: 'Aspirin', category: 'Antiplatelet', standardDose: 1, defaultUnit: 'mg/kg', concentration: 75, formUnit: 'Tablet', dosageForms: ['Oral'], warningThreshold: 5 },
  { name: 'Warfarin', category: 'Anticoagulant', standardDose: 0.05, defaultUnit: 'mg/kg', concentration: 5, formUnit: 'Tablet', dosageForms: ['Oral'], warningThreshold: 0.2 },
  { name: 'Digoxin', category: 'Cardiac', standardDose: 0.01, defaultUnit: 'mg/kg', concentration: 0.25, formUnit: 'Tablet', dosageForms: ['Oral', 'IV'], warningThreshold: 0.02 },
  { name: 'Prednisolone', category: 'Steroid', standardDose: 1, defaultUnit: 'mg/kg', concentration: 5, formUnit: 'Tablet', dosageForms: ['Oral'], warningThreshold: 2 },
];

const DOSING_RATES = ['QD', 'BD', 'OD', 'TD', 'TID', 'QID'];
const DOSING_UNITS = ['mg/kg', 'micrograms/kg', 'ng/kg', 'ml/kg', 'g/kg', 'pg/kg', 'U/kg', 'IU/kg', 'Tablet/kg', 'Capsule/kg', 'Application/kg'];

interface PrescriptionCalculatorProps {
  patientData: PatientData;
  ageGroup: AgeGroup;
  onVoiceCommand?: () => void;
}

type PrescriptionResult = string;

const SyringeMap: React.FC<{ volume: number; isInjectable?: boolean }> = ({ volume, isInjectable }) => {
  // Determine syringe size based on volume
  const getSyringeSize = (vol: number) => {
    if (isInjectable && vol <= 10) return 10; // User specifically requested 10ml visual for injectables
    if (vol <= 1) return 1;
    if (vol <= 2) return 2;
    if (vol <= 5) return 5;
    if (vol <= 10) return 10;
    if (vol <= 20) return 20;
    if (vol <= 50) return 50;
    return 60; // Max standard syringe
  };

  // Calculate how many syringes are needed
  const syringesNeeded = Math.ceil(volume / 60) || 1;
  const volumes = [];
  let remainingVolume = volume;
  for (let i = 0; i < syringesNeeded; i++) {
    const currentVol = Math.min(remainingVolume, 60);
    volumes.push(currentVol > 0 ? currentVol : 0);
    remainingVolume -= currentVol;
  }

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Syringe className="text-primary" size={18} />
          </div>
          <div>
            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Dose Loading Visualization</h4>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Real-time Syringe Mapping</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-baseline justify-end gap-1">
            <span className="text-2xl font-black text-primary tracking-tighter tabular-nums">{volume.toFixed(2)}</span>
            <span className="text-[10px] font-bold text-primary/60 uppercase">ml</span>
          </div>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Total Volume Loaded</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-6 justify-center p-8 bg-gradient-to-b from-slate-50 to-slate-100/50 border border-slate-200 rounded-2xl shadow-inner overflow-x-auto min-h-[320px] items-end">
        {volumes.map((vol, idx) => {
          const syringeSize = getSyringeSize(vol);
          const fillPercentage = Math.min(100, (vol / syringeSize) * 100);
          const step = syringeSize <= 2 ? 0.2 : syringeSize <= 10 ? 1 : syringeSize <= 20 ? 2 : 5;
          const graduations = [];
          for (let i = 0; i <= syringeSize; i += step) {
            graduations.push(Number(i.toFixed(1)));
          }

          return (
            <div key={idx} className="flex flex-col items-center group/syringe">
              <div className="relative w-20 h-72 flex flex-col items-center">
                {/* Syringe Volume Label */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/syringe:opacity-100 transition-opacity whitespace-nowrap">
                  <span className="px-2 py-0.5 bg-slate-800 text-white text-[8px] font-black rounded uppercase tracking-widest">
                    {syringeSize}ml Syringe
                  </span>
                </div>

                {/* Syringe Body */}
                <div className="relative w-14 h-60 border-2 border-slate-400/60 rounded-b-2xl bg-white/40 backdrop-blur-[2px] overflow-hidden shadow-[inset_0_0_15px_rgba(0,0,0,0.05)]">
                  {/* Glass Reflection */}
                  <div className="absolute top-0 left-2 w-1.5 h-full bg-white/30 z-40 pointer-events-none" />
                  <div className="absolute top-0 right-3 w-0.5 h-full bg-white/20 z-40 pointer-events-none" />
                  
                  {/* Fluid with realistic gradient and animation */}
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-emerald-600/50 via-emerald-400/40 to-emerald-600/50 transition-all duration-1000 cubic-bezier(0.34, 1.56, 0.64, 1) z-10"
                    style={{ height: `${fillPercentage}%` }}
                  >
                    {/* Fluid highlight */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/40 shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                    {/* Bubbles effect */}
                    <div className="absolute top-4 left-3 w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" />
                    <div className="absolute top-12 right-4 w-1 h-1 bg-white/30 rounded-full animate-bounce" />
                  </div>

                  {/* Plunger Tip (Rubber Stopper) */}
                  <div 
                    className="absolute left-0 right-0 h-8 transition-all duration-1000 cubic-bezier(0.34, 1.56, 0.64, 1) z-20"
                    style={{ bottom: `calc(${fillPercentage}% - 6px)` }}
                  >
                    <div className="w-full h-2.5 bg-slate-800 rounded-t-sm shadow-md" />
                    <div className="w-full h-5 bg-gradient-to-b from-slate-700 to-slate-900" />
                    {/* Stopper Rings */}
                    <div className="absolute top-4 left-0 right-0 h-[1px] bg-slate-600/50" />
                    <div className="absolute top-6 left-0 right-0 h-[1px] bg-slate-600/50" />
                  </div>

                  {/* Graduations */}
                  {graduations.map(v => (
                    <div 
                      key={v} 
                      className="absolute left-0 right-0 flex items-center justify-between px-1.5 z-30"
                      style={{ bottom: `${(v / syringeSize) * 100}%` }}
                    >
                      <div className={`h-[1.5px] ${v % 1 === 0 ? 'w-4 bg-slate-700' : 'w-2 bg-slate-500'}`} />
                      <span className={`text-[8px] font-black tabular-nums ${v % 1 === 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                        {v % 1 === 0 ? v : ''}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Needle Hub & Tip */}
                <div className="w-5 h-5 bg-gradient-to-b from-slate-400 to-slate-500 rounded-t-md -mt-0.5 shadow-sm z-50" />
                <div className="w-1.5 h-8 bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300 shadow-sm z-50" />

                {/* Plunger Handle (Top) */}
                <div 
                  className="absolute left-1/2 -translate-x-1/2 w-10 h-56 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 border-x-2 border-slate-300/50 z-[-1] transition-all duration-1000 cubic-bezier(0.34, 1.56, 0.64, 1)"
                  style={{ bottom: `calc(${fillPercentage}% + 64px)` }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-3 bg-gradient-to-b from-slate-300 to-slate-400 rounded-full shadow-md border border-slate-400/50" />
                  {/* Plunger Ribs */}
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-slate-300/50" />
                </div>
              </div>
              <div className="mt-4 text-center">
                <p className="text-[10px] font-black text-slate-800 tabular-nums">{vol.toFixed(2)}ml</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Syringe {idx + 1} ({syringeSize}ml)</p>
              </div>
            </div>
          );
        })}
      </div>
      
      {volume > 60 && (
        <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl flex items-start gap-4 shadow-sm animate-pulse">
          <div className="p-2 bg-amber-100 rounded-lg">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="text-[11px] font-black text-amber-800 uppercase tracking-tight">Large Volume Protocol Required</p>
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mt-1 leading-relaxed">
              Total volume ({volume.toFixed(2)}ml) exceeds standard syringe capacity. 
              Dose must be divided into {syringesNeeded} separate syringes or administered via calibrated infusion pump.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const PrescriptionCalculator: React.FC<PrescriptionCalculatorProps> = ({ patientData, ageGroup, onVoiceCommand }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [prescription, setPrescription] = useState<PrescriptionResult | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  
  // Dosage Calculator State
  const [weight, setWeight] = useState<number>(Number(patientData.anthro?.weight) || 0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [selectedDosageForm, setSelectedDosageForm] = useState<string>('');
  const [isVerified, setIsVerified] = useState(false);
  const [checklist, setChecklist] = useState({
    patient: false,
    drug: false,
    dose: false,
    route: false,
    time: false
  });
  const [selectedUnit, setSelectedUnit] = useState('mg/kg');
  const [selectedRate, setSelectedRate] = useState('OD');

  useEffect(() => {
    if (patientData.anthro?.weight) {
      setWeight(Number(patientData.anthro.weight));
    }
  }, [patientData.anthro?.weight]);

  const filteredMeds = useMemo(() => {
    if (!searchTerm) return [];
    return MEDICATION_DATABASE.filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const getUnitMultiplier = (unit: string, med?: Medication | null) => {
    const base = unit.split('/')[0].toLowerCase();
    switch (base) {
      case 'g': return 1000;
      case 'mg': return 1;
      case 'micrograms': return 0.001;
      case 'ng': return 0.000001;
      case 'pg': return 0.000000001;
      case 'u': return 1;
      case 'iu': return 1;
      case 'ml': return med ? med.concentration : 1;
      case 'tablet': return med ? med.concentration : 1;
      case 'capsule': return med ? med.concentration : 1;
      case 'application': return med ? med.concentration : 1;
      default: return 1;
    }
  };

  const calculatedDose = useMemo(() => {
    if (!selectedMed || !weight) return 0;
    
    // Dose in medication's default unit (e.g. mg)
    const doseInDefaultUnit = weight * selectedMed.standardDose;
    
    // Convert from default unit to selected unit
    const defaultMultiplier = getUnitMultiplier(selectedMed.defaultUnit, selectedMed);
    const selectedMultiplier = getUnitMultiplier(selectedUnit, selectedMed);
    
    // doseInDefaultUnit * defaultMultiplier = dose in absolute base (relative to mg or U)
    // result = (dose in absolute base) / selectedMultiplier
    // Note: We assume defaultMultiplier is 1 for the med's own default unit in its own context
    // unless it's 'ml', which we handled.
    
    // If defaultUnit is 'mg/kg' and selectedUnit is 'mg/kg', result is doseInDefaultUnit.
    // If defaultUnit is 'mg/kg' and selectedUnit is 'ml/kg', result is doseInDefaultUnit / concentration.
    
    return (doseInDefaultUnit * 1) / selectedMultiplier;
  }, [weight, selectedMed, selectedUnit]);

  const calculatedQuantity = useMemo(() => {
    if (!selectedMed || !calculatedDose) return 0;
    
    const selectedMultiplier = getUnitMultiplier(selectedUnit, selectedMed);
    // doseInDefaultUnit = calculatedDose * selectedMultiplier
    const doseInDefaultUnit = calculatedDose * selectedMultiplier;
    return doseInDefaultUnit / selectedMed.concentration;
  }, [calculatedDose, selectedMed, selectedUnit]);

  const isHighDose = useMemo(() => {
    if (!selectedMed) return false;
    return selectedMed.warningThreshold ? selectedMed.standardDose >= selectedMed.warningThreshold : false;
  }, [selectedMed]);

  const isInjectableRoute = useMemo(() => {
    return ['IV', 'IM', 'SC'].includes(selectedDosageForm);
  }, [selectedDosageForm]);

  const generatePrescription = async () => {
    setIsGenerating(true);
    try {
      const enhancedPrompt = `
        ${customPrompt}
        
        ${selectedMed ? `CURRENT SELECTION:
        - Medication: ${selectedMed.name}
        - Dosage Form: ${selectedDosageForm}
        - Calculated Dose: ${calculatedDose.toFixed(2)} ${selectedUnit.split('/')[0]}
        - Calculated Quantity: ${calculatedQuantity.toFixed(2)} ${selectedMed.formUnit}
        - Dosing Rate: ${selectedRate}` : ''}

        PREFERENCE:
        - Preferred Dosing Unit: ${selectedUnit}
        - Preferred Dosing Rate: ${selectedRate}
      `.trim();
      const result = await (clinicalAI as any).generatePrescription(patientData, ageGroup, enhancedPrompt);
      setPrescription(result);
    } catch (error) {
      console.error("Prescription generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 font-['Inter',_sans-serif]">
      {/* Dosage Calculator Modal-like View */}
      <div className="bg-[#F4F7F9] border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800">
              <Syringe className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Prescription & Dosage Calculator</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Precision Infusion Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-border">
            <ShieldCheck size={14} className={isVerified ? "text-emerald-500" : "text-slate-300"} />
            <span className="text-[9px] font-bold text-slate-500 uppercase">Double-Check Verified</span>
            <button 
              onClick={() => setIsVerified(!isVerified)}
              className={`w-8 h-4 rounded-full relative transition-colors ${isVerified ? 'bg-emerald-500' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isVerified ? 'left-4.5' : 'left-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Weight Input */}
            <div className="bg-white p-4 border border-border relative">
              <label htmlFor="patient-weight" className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Patient Weight (kg)</label>
              <div className="flex items-center justify-between">
                <input 
                  id="patient-weight"
                  type="number" 
                  step="0.01"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="text-3xl font-bold text-[#1A365D] bg-transparent border-none outline-none w-full"
                  placeholder="Enter weight in kg (e.g. 70.5)"
                />
                {onVoiceCommand && (
                  <button 
                    onClick={onVoiceCommand}
                    className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 border border-border rounded-lg transition-all"
                    title="Voice Input"
                  >
                    <Mic size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Medication Search */}
            <div className="relative">
              <label htmlFor="medication-search" className="sr-only">Search Medication</label>
              <div className="flex items-center gap-3 bg-white p-3 border border-border">
                <Search size={18} className="text-slate-400" />
                <input 
                  id="medication-search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search Medication Database (e.g. Gentamicin, Amoxicillin)..."
                  className="flex-1 bg-transparent border-none outline-none font-bold text-sm text-slate-700"
                />
              </div>
              
              {searchTerm && filteredMeds.length > 0 && !selectedMed && (
                <div className="absolute top-full left-0 right-0 bg-white border border-border z-50 shadow-lg max-h-48 overflow-y-auto">
                  {filteredMeds.map(med => (
                    <button 
                      key={med.name}
                      onClick={() => {
                        setSelectedMed(med);
                        setSearchTerm(med.name);
                      }}
                      className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                    >
                      <p className="text-xs font-bold text-slate-800 uppercase">{med.name}</p>
                      <p className="text-[9px] text-slate-400 uppercase">{med.category} • {med.concentration}{med.defaultUnit.split('/')[0]}/{med.formUnit}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Calculation Card */}
            {selectedMed && (
              <div className="bg-white border border-border overflow-hidden">
                <div className="p-4 border-b border-border bg-slate-50 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase">{selectedMed.name}</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Concentration: {selectedMed.concentration} {selectedMed.defaultUnit.split('/')[0]}/{selectedMed.formUnit}</p>
                  </div>
                  {isHighDose && (
                    <div className="flex items-center gap-2 px-2 py-1 bg-amber-50 border border-amber-200 text-amber-600">
                      <AlertTriangle size={14} />
                      <span className="text-[9px] font-bold uppercase">High Dose Alert</span>
                    </div>
                  )}
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dosing Unit</p>
                      <div className="grid grid-cols-4 gap-1">
                        {DOSING_UNITS.map(unit => (
                          <button 
                            key={unit}
                            onClick={() => setSelectedUnit(unit)}
                            className={`py-1 text-[8px] font-bold border ${selectedUnit === unit ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                          >
                            {unit}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dosing Rate</p>
                      <div className="grid grid-cols-6 gap-1">
                        {DOSING_RATES.map(rate => (
                          <button 
                            key={rate}
                            onClick={() => setSelectedRate(rate)}
                            className={`py-1 text-[8px] font-bold border ${selectedRate === rate ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                          >
                            {rate}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dosage Form</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedMed.dosageForms.map(form => (
                          <button 
                            key={form}
                            onClick={() => setSelectedDosageForm(form)}
                            className={`px-2 py-1 text-[8px] font-bold border ${selectedDosageForm === form ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                          >
                            {form}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center md:text-left">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Recommended Dose</p>
                      <p className="text-xl font-bold text-slate-800">
                        {(selectedMed.standardDose / getUnitMultiplier(selectedUnit, selectedMed)).toFixed(2)} 
                        <span className="text-xs text-slate-400"> {selectedUnit.split('/')[0]}</span>
                      </p>
                    </div>
                    
                    <div className="text-center border-l border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Calculated Final Dose</p>
                      <div className="inline-block px-4 py-2 bg-emerald-50 border border-emerald-100">
                        <p className="text-3xl font-black text-emerald-600">{calculatedDose.toFixed(2)} <span className="text-sm">{selectedUnit.split('/')[0]}</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Final {selectedMed.formUnit === 'ml' ? 'Fluid Volume' : 'Quantity'}</p>
                    <p className="text-2xl font-bold text-slate-800">{calculatedQuantity.toFixed(2)} <span className="text-xs text-slate-400">{selectedMed.formUnit}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-bold text-primary uppercase">Infusion Pump Setting</p>
                    <p className="text-lg font-black text-slate-800">{selectedRate}</p>
                  </div>
                </div>

                {!isVerified && (
                  <div className="p-3 bg-amber-50 border-t border-amber-100 flex items-center gap-3">
                    <AlertCircle size={14} className="text-amber-600" />
                    <p className="text-[9px] font-bold text-amber-700 uppercase tracking-tight">Requires second clinician verification before administration</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Syringe Visual Aid */}
          <div className="space-y-6">
            {selectedMed?.formUnit === 'ml' && (
              <SyringeMap 
                volume={calculatedQuantity} 
                isInjectable={isInjectableRoute} 
              />
            )}
            
            <div className="bg-white p-4 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Info size={14} className="text-primary" />
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Safety Checklist</h4>
              </div>
              <ul className="space-y-2">
                {[
                  { id: 'patient', label: 'Right Patient' },
                  { id: 'drug', label: 'Right Drug' },
                  { id: 'dose', label: 'Right Dose' },
                  { id: 'route', label: 'Right Route' },
                  { id: 'time', label: 'Right Time' }
                ].map(check => (
                  <li key={check.id} className="flex items-center gap-2 cursor-pointer" onClick={() => setChecklist(prev => ({ ...prev, [check.id]: !prev[check.id as keyof typeof prev] }))}>
                    <div className={`w-3 h-3 border flex items-center justify-center rounded-sm transition-colors ${checklist[check.id as keyof typeof checklist] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                      {checklist[check.id as keyof typeof checklist] && <CheckCircle2 size={8} className="text-white" />}
                    </div>
                    <span className={`text-[10px] font-bold uppercase transition-colors ${checklist[check.id as keyof typeof checklist] ? 'text-emerald-600' : 'text-slate-500'}`}>{check.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Original AI Prescription Section (Optional/Integrated) */}
      <div className="bg-white border border-border p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-slate-800">
            <Pill className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">AI Prescription Synthesis</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Automated Clinical Pharmacology</p>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="clinical-indication" className="text-[11px] font-bold text-slate-600 uppercase block">Specific Clinical Indication / Notes</label>
          <textarea 
            id="clinical-indication"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Enter clinical indication (e.g., Severe CAP, suspected sepsis, hypertensive emergency...)"
            className="w-full p-3 bg-white border border-border font-bold text-sm outline-none focus:border-primary min-h-[80px]"
          />
        </div>

        <button 
          onClick={generatePrescription}
          disabled={isGenerating}
          className={`w-full mt-4 p-3 flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-xs border border-slate-800 transition-none ${isGenerating ? 'bg-slate-100 text-slate-400 border-slate-300' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent animate-spin" />
              Synthesizing Prescription...
            </>
          ) : (
            <>
              <Calculator size={16} />
              Generate Evidence-Based Prescription
            </>
          )}
        </button>
      </div>

      {prescription && (
        <div className="bg-white border border-border p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <div className="p-2 bg-emerald-600">
              <ShieldCheck className="text-white" size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">AI Generated Prescription Regimen</h3>
              <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Evidence-Based Clinical Guidance</p>
            </div>
          </div>
          
          <div className="whitespace-pre-wrap font-mono text-xs text-slate-700 leading-relaxed bg-slate-50 p-6 border border-slate-100">
            {prescription}
          </div>
          
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-600 mt-0.5" />
            <div>
              <p className="text-[10px] font-black text-amber-800 uppercase tracking-tight">Clinical Disclaimer</p>
              <p className="text-[9px] font-bold text-amber-700 uppercase tracking-widest mt-1">
                THIS IS AN AI-GENERATED GUIDELINE. ALL DOSAGES AND INDICATIONS MUST BE INDEPENDENTLY VERIFIED BY A LICENSED CLINICIAN BEFORE ADMINISTRATION.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrescriptionCalculator;
