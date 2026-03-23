import React, { useState, useEffect, useMemo } from 'react';
import { Pill, Calculator, AlertCircle, CheckCircle2, Info, Search, ShieldCheck, AlertTriangle, Syringe } from 'lucide-react';
import { PatientData, AgeGroup } from '../types';
import { clinicalAI } from '../services/clinicalAI';
import ScoreCard from './ScoreCard';

interface Medication {
  name: string;
  category: string;
  standardDose: number; 
  defaultUnit: string;
  concentration: number; // in [defaultUnit]/ml
  maxDose?: number; 
  warningThreshold?: number; 
}

const MEDICATION_DATABASE: Medication[] = [
  { name: 'Gentamicin', category: 'Antibiotic', standardDose: 5, defaultUnit: 'mg/kg', concentration: 40, warningThreshold: 7 },
  { name: 'Ampicillin', category: 'Antibiotic', standardDose: 50, defaultUnit: 'mg/kg', concentration: 100, warningThreshold: 100 },
  { name: 'Ceftriaxone', category: 'Antibiotic', standardDose: 80, defaultUnit: 'mg/kg', concentration: 100, warningThreshold: 100 },
  { name: 'Paracetamol', category: 'Analgesic', standardDose: 15, defaultUnit: 'mg/kg', concentration: 10, warningThreshold: 20 },
  { name: 'Morphine', category: 'Analgesic', standardDose: 0.1, defaultUnit: 'mg/kg', concentration: 1, warningThreshold: 0.2 },
  { name: 'Adrenaline', category: 'Resuscitation', standardDose: 0.01, defaultUnit: 'mg/kg', concentration: 0.1, warningThreshold: 0.02 },
  { name: 'Furosemide', category: 'Diuretic', standardDose: 1, defaultUnit: 'mg/kg', concentration: 10, warningThreshold: 2 },
  { name: 'Phenobarbital', category: 'Anticonvulsant', standardDose: 20, defaultUnit: 'mg/kg', concentration: 200, warningThreshold: 30 },
  // Ugandan Schedule
  { name: 'Artemether/Lumefantrine', category: 'Antimalarial', standardDose: 1.7, defaultUnit: 'mg/kg', concentration: 20, warningThreshold: 4 },
  { name: 'Quinine', category: 'Antimalarial', standardDose: 10, defaultUnit: 'mg/kg', concentration: 300, warningThreshold: 20 },
  { name: 'Artesunate', category: 'Antimalarial', standardDose: 2.4, defaultUnit: 'mg/kg', concentration: 60, warningThreshold: 5 },
  { name: 'Metronidazole', category: 'Antibiotic', standardDose: 7.5, defaultUnit: 'mg/kg', concentration: 5, warningThreshold: 15 },
  { name: 'Ciprofloxacin', category: 'Antibiotic', standardDose: 15, defaultUnit: 'mg/kg', concentration: 2, warningThreshold: 20 },
  { name: 'Amoxicillin/Clavulanate', category: 'Antibiotic', standardDose: 45, defaultUnit: 'mg/kg', concentration: 80, warningThreshold: 90 },
  { name: 'Cotrimoxazole', category: 'Antibiotic', standardDose: 24, defaultUnit: 'mg/kg', concentration: 48, warningThreshold: 48 },
  { name: 'Fluconazole', category: 'Antifungal', standardDose: 6, defaultUnit: 'mg/kg', concentration: 2, warningThreshold: 12 },
  { name: 'Insulin (Soluble)', category: 'Endocrine', standardDose: 0.1, defaultUnit: 'U/kg', concentration: 100, warningThreshold: 0.5 },
  { name: 'Salbutamol', category: 'Respiratory', standardDose: 0.15, defaultUnit: 'mg/kg', concentration: 1, warningThreshold: 0.3 },
  { name: 'Hydrocortisone', category: 'Steroid', standardDose: 4, defaultUnit: 'mg/kg', concentration: 50, warningThreshold: 10 },
  { name: 'Dexamethasone', category: 'Steroid', standardDose: 0.15, defaultUnit: 'mg/kg', concentration: 4, warningThreshold: 0.6 },
  { name: 'Magnesium Sulphate', category: 'Anticonvulsant', standardDose: 50, defaultUnit: 'mg/kg', concentration: 500, warningThreshold: 100 },
  { name: 'Oxytocin', category: 'Obstetric', standardDose: 0.02, defaultUnit: 'U/kg', concentration: 10, warningThreshold: 0.1 },
  { name: 'Misoprostol', category: 'Obstetric', standardDose: 4, defaultUnit: 'micrograms/kg', concentration: 0.2, warningThreshold: 10 },
  { name: 'Benzylpenicillin (X-pen)', category: 'Antibiotic', standardDose: 50000, defaultUnit: 'U/kg', concentration: 200000, warningThreshold: 100000 },
  { name: 'Cloxacillin', category: 'Antibiotic', standardDose: 25, defaultUnit: 'mg/kg', concentration: 125, warningThreshold: 50 },
  { name: 'Erythromycin', category: 'Antibiotic', standardDose: 10, defaultUnit: 'mg/kg', concentration: 125, warningThreshold: 20 },
  { name: 'Azithromycin', category: 'Antibiotic', standardDose: 10, defaultUnit: 'mg/kg', concentration: 40, warningThreshold: 15 },
  { name: 'Albendazole', category: 'Anthelmintic', standardDose: 400, defaultUnit: 'mg/kg', concentration: 200, warningThreshold: 400 },
  { name: 'Diazepam', category: 'Anticonvulsant', standardDose: 0.3, defaultUnit: 'mg/kg', concentration: 5, warningThreshold: 0.5 },
  { name: 'Chlorpromazine', category: 'Antipsychotic', standardDose: 0.5, defaultUnit: 'mg/kg', concentration: 25, warningThreshold: 2 },
  { name: 'Haloperidol', category: 'Antipsychotic', standardDose: 0.02, defaultUnit: 'mg/kg', concentration: 5, warningThreshold: 0.1 },
  { name: 'Atenolol', category: 'Cardiovascular', standardDose: 1, defaultUnit: 'mg/kg', concentration: 50, warningThreshold: 2 },
  { name: 'Nifedipine', category: 'Cardiovascular', standardDose: 0.25, defaultUnit: 'mg/kg', concentration: 10, warningThreshold: 1 },
  { name: 'Enalapril', category: 'Cardiovascular', standardDose: 0.1, defaultUnit: 'mg/kg', concentration: 5, warningThreshold: 0.5 },
  { name: 'Spironolactone', category: 'Diuretic', standardDose: 1, defaultUnit: 'mg/kg', concentration: 25, warningThreshold: 3 },
  { name: 'Prednisolone', category: 'Steroid', standardDose: 1, defaultUnit: 'mg/kg', concentration: 5, warningThreshold: 2 },
  { name: 'Nevirapine', category: 'Antiretroviral', standardDose: 150, defaultUnit: 'mg/kg', concentration: 10, warningThreshold: 200 },
  { name: 'Zidovudine (AZT)', category: 'Antiretroviral', standardDose: 180, defaultUnit: 'mg/kg', concentration: 10, warningThreshold: 240 },
  { name: 'Tenofovir (TDF)', category: 'Antiretroviral', standardDose: 300, defaultUnit: 'mg/kg', concentration: 300, warningThreshold: 300 },
  { name: 'Lamivudine (3TC)', category: 'Antiretroviral', standardDose: 4, defaultUnit: 'mg/kg', concentration: 10, warningThreshold: 8 },
  { name: 'Rifampicin', category: 'Antitubercular', standardDose: 10, defaultUnit: 'mg/kg', concentration: 20, warningThreshold: 15 },
  { name: 'Isoniazid', category: 'Antitubercular', standardDose: 5, defaultUnit: 'mg/kg', concentration: 10, warningThreshold: 10 },
  { name: 'Pyrazinamide', category: 'Antitubercular', standardDose: 25, defaultUnit: 'mg/kg', concentration: 50, warningThreshold: 35 },
  { name: 'Ethambutol', category: 'Antitubercular', standardDose: 15, defaultUnit: 'mg/kg', concentration: 100, warningThreshold: 25 },
  { name: 'Digoxin', category: 'Cardiovascular', standardDose: 0.01, defaultUnit: 'mg/kg', concentration: 0.25, warningThreshold: 0.02 },
  { name: 'Warfarin', category: 'Anticoagulant', standardDose: 0.1, defaultUnit: 'mg/kg', concentration: 5, warningThreshold: 0.2 },
  { name: 'Heparin', category: 'Anticoagulant', standardDose: 50, defaultUnit: 'U/kg', concentration: 5000, warningThreshold: 100 },
  { name: 'Enoxaparin', category: 'Anticoagulant', standardDose: 1, defaultUnit: 'mg/kg', concentration: 100, warningThreshold: 1.5 },
  { name: 'Phenytoin', category: 'Anticonvulsant', standardDose: 5, defaultUnit: 'mg/kg', concentration: 50, warningThreshold: 10 },
  { name: 'Sodium Valproate', category: 'Anticonvulsant', standardDose: 20, defaultUnit: 'mg/kg', concentration: 200, warningThreshold: 40 },
  { name: 'Carbamazepine', category: 'Anticonvulsant', standardDose: 10, defaultUnit: 'mg/kg', concentration: 20, warningThreshold: 20 },
  { name: 'Amitriptyline', category: 'Antidepressant', standardDose: 1, defaultUnit: 'mg/kg', concentration: 25, warningThreshold: 2.5 },
  { name: 'Fluoxetine', category: 'Antidepressant', standardDose: 0.5, defaultUnit: 'mg/kg', concentration: 20, warningThreshold: 1 },
];

const DOSING_RATES = ['QD', 'BD', 'OD', 'TD', 'TID', 'QID'];
const DOSING_UNITS = ['mg/kg', 'micrograms/kg', 'ng/kg', 'ml/kg', 'g/kg', 'pg/kg', 'U/kg', 'IU/kg'];

interface PrescriptionCalculatorProps {
  patientData: PatientData;
  ageGroup: AgeGroup;
}

type PrescriptionResult = string;

const SyringeMap: React.FC<{ volume: number }> = ({ volume }) => {
  // Volume is in ml. We assume a 1ml syringe for the visual aid as requested.
  // If volume > 1, we cap it at 1 for the visual or show it full.
  const fillPercentage = Math.min(100, (volume / 1) * 100);
  
  return (
    <div className="flex flex-col items-center p-4 bg-slate-50 border border-slate-200 rounded-lg">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4">1ml Syringe Visual Aid</p>
      <div className="relative w-12 h-48 border-2 border-slate-300 rounded-b-lg bg-white overflow-hidden">
        {/* Plunger */}
        <div 
          className="absolute bottom-0 left-0 right-0 bg-emerald-500/30 transition-all duration-500"
          style={{ height: `${fillPercentage}%` }}
        />
        {/* Graduations */}
        {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map(v => (
          <div 
            key={v} 
            className="absolute left-0 right-0 border-t border-slate-200 flex items-center justify-end pr-1"
            style={{ bottom: `${v * 100}%` }}
          >
            <span className="text-[7px] font-bold text-slate-400">{v}</span>
          </div>
        ))}
        {/* Fluid Level Line */}
        <div 
          className="absolute left-0 right-0 border-t-2 border-emerald-600 z-10"
          style={{ bottom: `${fillPercentage}%` }}
        />
      </div>
      <p className="text-[10px] font-bold text-slate-600 mt-2 uppercase">{volume.toFixed(2)} ml</p>
    </div>
  );
};

const PrescriptionCalculator: React.FC<PrescriptionCalculatorProps> = ({ patientData, ageGroup }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [prescription, setPrescription] = useState<PrescriptionResult | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  
  // Dosage Calculator State
  const [weight, setWeight] = useState<number>(Number(patientData.anthro?.weight) || 0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [selectedRate, setSelectedRate] = useState('OD');
  const [selectedUnit, setSelectedUnit] = useState('mg/kg');

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

  const calculatedVolume = useMemo(() => {
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

  const generatePrescription = async () => {
    setIsGenerating(true);
    try {
      const enhancedPrompt = `
        ${customPrompt}
        
        ${selectedMed ? `CURRENT SELECTION:
        - Medication: ${selectedMed.name}
        - Calculated Dose: ${calculatedDose.toFixed(2)} ${selectedUnit.split('/')[0]}
        - Calculated Volume: ${calculatedVolume.toFixed(2)} ml
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
            <div className="bg-white p-4 border border-border">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Patient Weight (kg)</label>
              <input 
                type="number" 
                step="0.01"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="text-3xl font-bold text-[#1A365D] bg-transparent border-none outline-none w-full"
                placeholder="0.00"
              />
            </div>

            {/* Medication Search */}
            <div className="relative">
              <div className="flex items-center gap-3 bg-white p-3 border border-border">
                <Search size={18} className="text-slate-400" />
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search Medication Database (e.g. Gentamicin)..."
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
                      <p className="text-[9px] text-slate-400 uppercase">{med.category} • {med.concentration}mg/ml</p>
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
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Concentration: {selectedMed.concentration} mg/ml</p>
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
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Final Fluid Volume</p>
                    <p className="text-2xl font-bold text-slate-800">{calculatedVolume.toFixed(2)} <span className="text-xs text-slate-400">ml</span></p>
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
            <SyringeMap volume={calculatedVolume} />
            
            <div className="bg-white p-4 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Info size={14} className="text-primary" />
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Safety Checklist</h4>
              </div>
              <ul className="space-y-2">
                {[
                  'Right Patient',
                  'Right Drug',
                  'Right Dose',
                  'Right Route',
                  'Right Time'
                ].map(check => (
                  <li key={check} className="flex items-center gap-2">
                    <div className="w-3 h-3 border border-slate-300 rounded-sm" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{check}</span>
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
          <label className="text-[11px] font-bold text-slate-600 uppercase block">Specific Clinical Indication / Notes</label>
          <textarea 
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g., Severe CAP, suspected sepsis, hypertensive emergency..."
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
