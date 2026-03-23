import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, Image as ImageIcon, CheckCircle2, AlertCircle, 
  Trash2, Brain, Loader2, Activity, Microscope, Thermometer, Heart, Zap,
  Download, FolderOpen, RefreshCcw
} from 'lucide-react';
import { MachineData } from '../types';
import { machineAIService } from '../services/machineAIService';
import { speechService } from '../services/speechService';

interface MachineDataImportProps {
  machineData: MachineData[];
  onAddData: (data: MachineData) => void;
  onRemoveData: (id: string) => void;
  onClearAll: () => void;
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

const MachineDataImport: React.FC<MachineDataImportProps> = ({ machineData, onAddData, onRemoveData, onClearAll }) => {
  const [selectedType, setSelectedType] = useState<MachineData['type']>('CBC');
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

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

  const handleExport = () => {
    const dataStr = JSON.stringify(machineData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `diagnostics-${new Date().toISOString()}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          imported.forEach(item => onAddData(item));
          alert(`Successfully imported ${imported.length} diagnostic records.`);
        }
      } catch (error) {
        alert('Invalid diagnostic file format.');
      }
    };
    reader.readAsText(file);
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
      {/* Header Actions */}
      <div className="bg-slate-800 border-4 border-slate-800 px-4 py-1.5 shadow-[8px_8px_0px_0px_rgba(30,41,59,1)] flex flex-wrap items-center justify-between gap-4 transition-none min-h-[40px]">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-white/10">
            <Microscope className="text-white" size={18} />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-tight leading-none">Diagnostics Lab</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => importFileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 text-[9px] font-black uppercase tracking-widest border-2 border-white transition-none"
          >
            <FolderOpen size={12} />
            Load
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-[9px] font-black uppercase tracking-widest border-2 border-slate-700 transition-none"
          >
            <Download size={12} />
            Export
          </button>
          <button 
            onClick={() => { if(confirm('Clear all diagnostic data?')) onClearAll(); }}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase tracking-widest border-2 border-red-600 transition-none"
          >
            <Trash2 size={12} />
            Clear All
          </button>
          <input 
            type="file" 
            ref={importFileInputRef} 
            onChange={handleImportFile} 
            accept=".json" 
            className="hidden" 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Device Selection and Input */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border-4 border-slate-800 p-6 shadow-[8px_8px_0px_0px_rgba(30,41,59,1)] transition-none">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Zap size={14} className="text-amber-500" />
              Select Device Type
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {DEVICE_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id as MachineData['type'])}
                  className={`flex flex-col items-center justify-center p-3 border-2 transition-none ${
                    selectedType === type.id 
                      ? 'bg-slate-800 text-white border-slate-800' 
                      : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200'
                  }`}
                >
                  <div className={`mb-1 ${selectedType === type.id ? 'text-white' : type.color}`}>
                    {type.icon}
                  </div>
                  <span className="text-[9px] font-black uppercase text-center leading-tight">{type.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border-4 border-slate-800 p-6 shadow-[8px_8px_0px_0px_rgba(30,41,59,1)] transition-none">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Upload size={14} className="text-blue-500" />
              Import Data
            </h3>
            <div className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 p-6 text-center cursor-pointer hover:bg-slate-50 transition-none"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                {filePreview ? (
                  <div className="space-y-2">
                    <CheckCircle2 size={24} className="mx-auto text-emerald-500" />
                    <p className="text-[10px] font-black text-slate-800 uppercase">File Ready</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload size={24} className="mx-auto text-slate-300" />
                    <p className="text-[10px] font-black text-slate-400 uppercase">Upload Image/PDF</p>
                  </div>
                )}
              </div>

              <div className="relative">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="OR PASTE RAW MACHINE TEXT HERE..."
                  className="w-full h-32 p-3 bg-slate-50 border-2 border-slate-200 font-bold text-[10px] uppercase outline-none focus:border-slate-800 resize-none transition-none"
                />
              </div>

              <button
                onClick={handleImport}
                disabled={isInterpreting || (!textInput && !filePreview)}
                className={`w-full py-4 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest transition-none ${
                  isInterpreting || (!textInput && !filePreview)
                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    : 'bg-slate-800 text-white hover:bg-slate-700 shadow-[4px_4px_0px_0px_rgba(30,41,59,0.3)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                }`}
              >
                {isInterpreting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Interpreting...
                  </>
                ) : (
                  <>
                    <Brain size={16} />
                    Analyze with AI
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Results and History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border-4 border-slate-800 p-6 shadow-[8px_8px_0px_0px_rgba(30,41,59,1)] transition-none min-h-[500px]">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Activity size={14} className="text-emerald-500" />
              Recent Interpretations
            </h3>
            
            <div className="space-y-4">
              {machineData.map((data) => (
                <div key={data.id} className="border-2 border-slate-800 overflow-hidden transition-none">
                  <div className="bg-slate-800 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-white/10">
                        {DEVICE_TYPES.find(d => d.id === data.type)?.icon}
                      </div>
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">{data.deviceName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(data.timestamp).toLocaleString()}</span>
                      <button 
                        onClick={() => onRemoveData(data.id)}
                        className="text-red-400 hover:text-red-300 transition-none"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">AI Interpretation</h4>
                        <p className="text-xs font-bold text-slate-800 leading-relaxed">{data.interpretation}</p>
                      </div>
                      {data.mimeType?.startsWith('image/') && (
                        <div className="w-24 h-24 border-2 border-slate-200 bg-white p-1">
                          <img src={data.rawContent} alt="Diagnostic" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {machineData.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 mb-4">
                    <Microscope size={48} className="text-slate-200" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No diagnostic data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MachineDataImport;
