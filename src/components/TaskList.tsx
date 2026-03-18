import React, { useState } from 'react';
import { CheckCircle2, Circle, Plus, Trash2, User, UserPlus, ClipboardList, CheckCircle, Clock, Printer } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Task, SavedPatient } from '../types';
import { speechService } from '../services/speechService';

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useLocalStorage<Task[]>('ai-medica-tasks', []);
  const [patients] = useLocalStorage<SavedPatient[]>('ai-medica-saved-patients', []);
  const [newTask, setNewTask] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'executed'>('all');

  const addTask = () => {
    if (!newTask.trim()) return;
    
    const patient = patients.find(p => p.id === selectedPatientId);
    
    const task: Task = {
      id: Date.now().toString(),
      text: newTask,
      completed: false,
      priority: 'medium',
      patientId: selectedPatientId || undefined,
      patientName: patient?.name,
      createdAt: new Date().toISOString()
    };
    
    setTasks([...tasks, task]);
    setNewTask('');
    
    const message = `Task registered: ${task.text}${patient ? ` for patient ${patient.name}` : ''}.`;
    speechService.speak(message);
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        const newState = !t.completed;
        const message = `Task ${t.text} marked as ${newState ? 'executed' : 'pending'}.`;
        speechService.speak(message);
        return { 
          ...t, 
          completed: newState,
          completedAt: newState ? new Date().toISOString() : undefined
        };
      }
      return t;
    }));
  };

  const deleteTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      speechService.speak(`Task ${task.text} deleted.`);
    }
    setTasks(tasks.filter(t => t.id !== id));
  };

  const printPatientReport = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const data = patient.data;
    
    const html = `
      <html>
        <head>
          <title>Clinical Report - ${patient.name}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            .header { border-bottom: 4px solid #dc2626; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .header h1 { margin: 0; font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; }
            .header p { margin: 5px 0 0; font-weight: 700; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 12px; }
            .meta-item { display: flex; flex-direction: column; }
            .meta-label { font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
            .meta-value { font-size: 16px; font-weight: 700; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #dc2626; border-bottom: 1px solid #fee2e2; padding-bottom: 5px; margin-bottom: 15px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
            .card { background: white; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; }
            .card-label { font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
            .card-value { font-size: 14px; font-weight: 700; }
            .notes { background: #fff7ed; border: 1px solid #ffedd5; padding: 15px; border-radius: 12px; font-style: italic; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>AI MEDICA <span style="color: #dc2626">UG</span></h1>
              <p>Clinical Decision Support System</p>
            </div>
            <div style="text-align: right">
              <div style="font-weight: 900; font-size: 14px;">PATIENT RECORD</div>
              <div style="font-size: 10px; color: #64748b;">Generated: ${new Date().toLocaleString()}</div>
            </div>
          </div>

          <div class="meta">
            <div class="meta-item">
              <span class="meta-label">Patient Name</span>
              <span class="meta-value">${patient.name}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Serial Number</span>
              <span class="meta-value" style="color: #dc2626">${patient.serialNumber || 'N/A'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Age Group</span>
              <span class="meta-value">${patient.ageGroup}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Registration Date</span>
              <span class="meta-value">${new Date(patient.date).toLocaleDateString()}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Vital Signs & Scores</div>
            <div class="grid">
              <div class="card">
                <div class="card-label">GCS Total</div>
                <div class="card-value">${data.gcs.eye + data.gcs.verbal + data.gcs.motor}/15</div>
              </div>
              <div class="card">
                <div class="card-label">MEWS Score</div>
                <div class="card-value">${data.mews.sbp ? 'Calculated' : 'N/A'}</div>
              </div>
              <div class="card">
                <div class="card-label">Temperature</div>
                <div class="card-value">${data.mews.temp}°C</div>
              </div>
              <div class="card">
                <div class="card-label">Heart Rate</div>
                <div class="card-value">${data.mews.hr} bpm</div>
              </div>
              <div class="card">
                <div class="card-label">Resp Rate</div>
                <div class="card-value">${data.mews.rr} /min</div>
              </div>
              <div class="card">
                <div class="card-label">Systolic BP</div>
                <div class="card-value">${data.mews.sbp} mmHg</div>
              </div>
            </div>
          </div>

          ${data.notes ? `
            <div class="section">
              <div class="section-title">Clinical Notes</div>
              <div class="notes">${data.notes}</div>
            </div>
          ` : ''}

          <div style="margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 10px; color: #94a3b8; text-align: center;">
            This report was generated by AI Medica UG. Clinical judgment is required for final decisions.
          </div>

          <script>
            window.onload = () => {
              window.print();
              // window.close();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'executed') return t.completed;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Registration */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 material-card p-5 rounded-3xl bg-white border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <UserPlus size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-900">Register Clinical Task</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && addTask()}
                placeholder="Describe the task (e.g., Administer IV fluids)..."
                className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:border-emerald-500 transition-all text-slate-900 placeholder:text-slate-400"
              />
              <button onClick={addTask} className="bg-emerald-600 text-white px-6 rounded-2xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 font-black text-xs uppercase tracking-widest">
                Add
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">Link to Patient Case</label>
                <select 
                  value={selectedPatientId}
                  onChange={e => setSelectedPatientId(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:border-emerald-500 transition-all text-slate-900"
                >
                  <option value="">No specific patient</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({new Date(p.date).toLocaleDateString()})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="md:w-64 material-card p-5 rounded-3xl bg-slate-900 text-white border-white/5 flex flex-col justify-center text-center">
          <div className="text-3xl font-black mb-1">{tasks.filter(t => !t.completed).length}</div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Tasks</div>
          <div className="h-px bg-white/10 my-4" />
          <div className="text-3xl font-black mb-1">{tasks.filter(t => t.completed).length}</div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Executed Tasks</div>
        </div>
      </div>

      {/* Task List Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'pending', 'executed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === f 
                  ? 'bg-slate-900 text-white shadow-lg' 
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Showing {filteredTasks.length} {filter} tasks
        </div>
      </div>

      {/* Tasks Display */}
      <div className="grid grid-cols-1 gap-3">
        {filteredTasks.map(task => (
          <div 
            key={task.id} 
            className={`material-card p-4 rounded-3xl flex items-center justify-between transition-all border-slate-200 bg-white group ${task.completed ? 'opacity-70 bg-slate-50/50' : 'hover:border-emerald-200 hover:shadow-md'}`}
          >
            <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => toggleTask(task.id)}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${task.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500'}`}>
                {task.completed ? <CheckCircle size={20} /> : <Clock size={20} />}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`font-black text-sm tracking-tight ${task.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {task.text}
                  </span>
                  {task.patientName && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded-full uppercase border border-blue-100 flex items-center gap-1">
                      <User size={8} /> {task.patientName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Created: {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {task.completedAt && (
                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">
                      Executed: {new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {task.patientId && (
                <button 
                  onClick={(e) => { e.stopPropagation(); printPatientReport(task.patientId!); }} 
                  className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                  title="Print Patient Report"
                >
                  <Printer size={18} />
                </button>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} 
                className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <div className="material-card py-20 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
            <ClipboardList size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">No {filter} tasks found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskList;
