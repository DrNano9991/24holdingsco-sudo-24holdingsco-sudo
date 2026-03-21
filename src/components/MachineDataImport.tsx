import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, Image as ImageIcon, CheckCircle2, AlertCircle, 
  Trash2, Brain, Loader2, Activity, Microscope, Thermometer, Heart, Zap
} from 'lucide-react';
import { MachineData } from '../types';
import { machineAIService } from '../services/machineAIService';
import { speechService } from '../services/speechService';

interface MachineDataImportProps {
  machineData: MachineData[];
  onAddData: (data: MachineData) => void;
  onRemoveData: (id: string) => void;
}

const DEVICE_TYPES = [
  { id: 'CBC', name: 'CBC (Blood Count)', icon: <Microscope size={20} />, color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'GeneXpert', name: 'GeneXpert (TB/HIV)', icon: <Zap size={20} />, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'Truenat', name: 'Truenat (PCR)', icon: <Activity size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'X-ray', name: 'Digital X-ray', icon: <ImageIcon size={20} />, color: 'text-slate-600', bg: 'bg-slate-50' },
  { id: 'Glucometer', name: 'Glucometer', icon: <Thermometer size={20} />, color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'PulseOx', name: 'Pulse Oximeter', icon: <Activity size={20} />, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  { id: 'ECG', name: 'ECG', icon: <Heart size={20} />, color: 'text-rose-600', bg: 'bg-rose-50' },
  { id: 'Other', name: 'Other Device', icon: <FileText size={20} />, color: 'text-slate-400', bg: 'bg-slate-50' },
] as const;

const MachineDataImport: React.FC<MachineDataImportProps> = ({ machineData, onAddData, onRemoveData }) => {
  const [selectedType, setSelectedType] = useState<MachineData['type']>('CBC');
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setFilePreview(base64);
      setMimeType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleImport = async () => {
    if (!textInput && !filePreview) return;

    setIsInterpreting(true);
    const newData: MachineData = {
      id: Date.now().toString(),
      type: selectedType,
      timestamp: new Date().toISOString(),
      rawContent: filePreview || textInput,
      mimeType,
      deviceName: DEVICE_TYPES.find(d => d.id === selectedType)?.name
    };

    try {
      const interpretation = await machineAIService.interpret(newData);
      newData.interpretation = interpretation;
      onAddData(newData);
      
      // Speak the interpretation
      speechService.speak(`AI Interpretation for ${newData.deviceName}: ${interpretation}`);
      
      // Reset
      setTextInput('');
      setFilePreview(null);
      setMimeType(undefined);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error("Import error:", error);
    } finally {
      setIsInterpreting(false);
    }
  };

  return (
    <div className="space-y-6 transition-none">
      <div className="bg-white p-4 border border-border transition-none">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-3 uppercase tracking-tight">
          <Upload className="text-primary" /> Import Diagnostic Data
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border border-border mb-6">
          {DEVICE_TYPES.map((device) => (
            <button
              key={device.id}
              onClick={() => setSelectedType(device.id)}
              className={`flex flex-col items-center justify-center p-3 border-r border-b border-border last:border-r-0 transition-none ${
                selectedType === device.id 
                  ? 'bg-primary-light text-primary outline-1 outline-primary z-10' 
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className={`${device.color} mb-1.5`}>{device.icon}</div>
              <span className="text-[9px] font-bold text-slate-800 text-center uppercase tracking-tight">
                {device.name}
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {(selectedType === 'X-ray' || selectedType === 'ECG') ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-border p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-none"
            >
              {filePreview ? (
                <div className="relative w-full max-w-xs aspect-video border border-border overflow-hidden">
                  <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={(e) => { e.stopPropagation(); setFilePreview(null); }}
                    className="absolute top-1 right-1 p-1 bg-red-600 text-white border border-red-700"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ) : (
                <>
                  <ImageIcon size={40} className="text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-500">Click to upload {selectedType} image</p>
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">PNG, JPG, DICOM supported</p>
                </>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
              />
            </div>
          ) : (
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={`Paste raw ${selectedType} data or machine output here...`}
              className="w-full h-32 bg-white border border-border p-3 text-slate-800 font-mono text-xs outline-none focus:bg-slate-50 transition-none"
            />
          )}

          <button
            onClick={handleImport}
            disabled={isInterpreting || (!textInput && !filePreview)}
            className={`w-full py-3 border border-border font-bold flex items-center justify-center gap-3 transition-none ${
              isInterpreting || (!textInput && !filePreview)
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
          >
            {isInterpreting ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span className="text-xs uppercase tracking-widest">AI INTERPRETING DATA...</span>
              </>
            ) : (
              <>
                <Brain size={18} />
                <span className="text-xs uppercase tracking-widest">ANALYZE WITH CLINICAL AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Recent Interpretations</h3>
        <div className="grid grid-cols-1 gap-3">
          {machineData.map((data) => (
            <div key={data.id} className="bg-white p-4 border border-border transition-none group">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 border border-border ${DEVICE_TYPES.find(d => d.id === data.type)?.bg}`}>
                    {DEVICE_TYPES.find(d => d.id === data.type)?.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-tight">{data.deviceName}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      {new Date(data.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => onRemoveData(data.id)}
                  className="p-1.5 text-slate-300 hover:text-red-600 border border-transparent hover:border-border transition-none"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="bg-slate-50 border border-border p-3">
                <div className="flex items-center gap-2 text-primary mb-1.5">
                  <Brain size={12} />
                  <span className="text-[9px] font-bold uppercase tracking-widest">AI Interpretation</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {data.interpretation}
                </p>
              </div>

              {data.type === 'X-ray' && data.rawContent.startsWith('data:') && (
                <div className="mt-3 border border-border overflow-hidden">
                  <img src={data.rawContent} alt="Diagnostic" className="w-full h-auto max-h-48 object-contain bg-black" />
                </div>
              )}
            </div>
          ))}
          {machineData.length === 0 && (
            <div className="py-12 text-center bg-slate-50 border border-dashed border-border">
              <Activity size={32} className="mx-auto text-slate-200 mb-2" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No diagnostic data imported yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MachineDataImport;
