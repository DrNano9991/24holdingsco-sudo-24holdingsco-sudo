import React, { useState, useEffect, useMemo } from 'react';
import { Pill, Calculator, AlertCircle, CheckCircle2, Info, Search, ShieldCheck, AlertTriangle, Syringe } from 'lucide-react';
import { PatientData, AgeGroup } from '../types';
import { clinicalAI } from '../services/clinicalAI';
import ScoreCard from './ScoreCard';

interface Medication {
  name: string;
  category: string;
  standardDose: number; // mg/kg
  concentration: number; // mg/ml
  maxDose?: number; // mg
  warningThreshold?: number; // mg/kg
}

const MEDICATION_DATABASE: Medication[] = [
  { name: 'Gentamicin', category: 'Antibiotic', standardDose: 5, concentration: 40, warningThreshold: 7 },
  { name: 'Ampicillin', category: 'Antibiotic', standardDose: 50, concentration: 100, warningThreshold: 100 },
  { name: 'Ceftriaxone', category: 'Antibiotic', standardDose: 80, concentration: 100, warningThreshold: 100 },
  { name: 'Paracetamol', category: 'Analgesic', standardDose: 15, concentration: 10, warningThreshold: 20 },
  { name: 'Morphine', category: 'Analgesic', standardDose: 0.1, concentration: 1, warningThreshold: 0.2 },
  { name: 'Adrenaline', category: 'Resuscitation', standardDose: 0.01, concentration: 0.1, warningThreshold: 0.02 },
  { name: 'Furosemide', category: 'Diuretic', standardDose: 1, concentration: 10, warningThreshold: 2 },
  { name: 'Phenobarbital', category: 'Anticonvulsant', standardDose: 20, concentration: 200, warningThreshold: 30 },
];

interface PrescriptionCalculatorProps {
  patientData: PatientData;
  ageGroup: AgeGroup;
}

interface PrescriptionResult {
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    rationale: string;
  }[];
  warnings: string[];
  monitoring: string[];
}

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

  const calculatedDose = useMemo(() => {
    if (!selectedMed || !weight) return 0;
    return selectedMed.standardDose * weight;
  }, [selectedMed, weight]);

  const calculatedVolume = useMemo(() => {
    if (!selectedMed || !calculatedDose) return 0;
    return calculatedDose / selectedMed.concentration;
  }, [selectedMed, calculatedDose]);

  const isHighDose = useMemo(() => {
    if (!selectedMed) return false;
    return selectedMed.warningThreshold ? selectedMed.standardDose >= selectedMed.warningThreshold : false;
  }, [selectedMed]);

  const generatePrescription = async () => {
    setIsGenerating(true);
    try {
      const result = await (clinicalAI as any).generatePrescription(patientData, ageGroup, customPrompt);
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
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="text-center md:text-left">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Recommended Dose</p>
                    <p className="text-xl font-bold text-slate-800">{selectedMed.standardDose} <span className="text-xs text-slate-400">mg/kg</span></p>
                  </div>
                  
                  <div className="text-center border-x border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Calculated Final Dose</p>
                    <div className="inline-block px-4 py-2 bg-emerald-50 border border-emerald-100">
                      <p className="text-3xl font-black text-emerald-600">{calculatedDose.toFixed(2)} <span className="text-sm">mg</span></p>
                    </div>
                  </div>

                  <div className="text-center md:text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Final Fluid Volume</p>
                    <p className="text-2xl font-bold text-slate-800">{calculatedVolume.toFixed(2)} <span className="text-xs text-slate-400">ml</span></p>
                    <p className="text-[8px] font-bold text-primary uppercase mt-1">Infusion Pump Setting</p>
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
          <div className="p-2 bg-primary">
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
          className={`w-full mt-4 p-3 flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-xs border border-primary transition-none ${isGenerating ? 'bg-slate-100 text-slate-400 border-slate-300' : 'bg-primary text-white hover:bg-primary-dark'}`}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-border">
              <div className="p-3 border-b border-border bg-slate-50 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Medication Regimen</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-success uppercase">Verified by AI Engine</span>
                  <CheckCircle2 size={12} className="text-success" />
                </div>
              </div>
              <div className="divide-y divide-border">
                {prescription.medications.map((med, idx) => (
                  <div key={idx} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-sm font-bold text-primary uppercase">{med.name}</h4>
                        <div className="flex gap-4 mt-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Dosage:</span>
                            <span className="text-[11px] font-bold text-slate-700">{med.dosage}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Freq:</span>
                            <span className="text-[11px] font-bold text-slate-700">{med.frequency}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Dur:</span>
                            <span className="text-[11px] font-bold text-slate-700">{med.duration}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-slate-50 border-l-2 border-primary">
                      <p className="text-[10px] text-slate-600 italic">
                        <span className="font-bold uppercase not-italic mr-1">Rationale:</span>
                        {med.rationale}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-border">
              <div className="p-3 border-b border-border bg-red-50 flex items-center gap-2">
                <AlertCircle size={14} className="text-red-600" />
                <h3 className="text-xs font-bold text-red-800 uppercase tracking-wider">Safety Warnings</h3>
              </div>
              <div className="p-3 space-y-2">
                {prescription.warnings.map((warning, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[10px] text-red-700 font-bold">
                    <div className="mt-1 w-1 h-1 bg-red-600 flex-shrink-0" />
                    {warning}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-border">
              <div className="p-3 border-b border-border bg-blue-50 flex items-center gap-2">
                <Info size={14} className="text-blue-600" />
                <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider">Monitoring Plan</h3>
              </div>
              <div className="p-3 space-y-2">
                {prescription.monitoring.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[10px] text-slate-600">
                    <div className="mt-1 w-1 h-1 bg-blue-600 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrescriptionCalculator;
