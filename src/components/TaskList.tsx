import React, { useState } from 'react';
import { CheckCircle2, Circle, Plus, Trash2, User, UserPlus, ClipboardList, CheckCircle, Clock, Printer, Filter, ChevronDown, AlertCircle } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Task, SavedPatient } from '../types';
import { speechService } from '../services/speechService';
import { toast } from 'react-hot-toast';

interface TaskListProps {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  patients: SavedPatient[];
}

const TaskList: React.FC<TaskListProps> = ({ tasks, setTasks, patients }) => {
  const [newTask, setNewTask] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [filter, setFilter] = useState<'all' | 'pending' | 'executed'>('all');
  const [patientFilter, setPatientFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const addTask = () => {
    if (!newTask.trim()) return;
    
    const patient = patients.find(p => p.id === selectedPatientId);
    
    const task: Task = {
      id: Date.now().toString(),
      text: newTask,
      completed: false,
      priority: taskPriority,
      patientId: selectedPatientId || undefined,
      patientName: patient?.name,
      createdAt: new Date().toISOString()
    };
    
    setTasks([...tasks, task]);
    setNewTask('');
    setTaskPriority('medium');
    
    toast.success('Task registered successfully');
    
    window.dispatchEvent(new CustomEvent('guest-action', { detail: `Added clinical task: ${task.text}${patient ? ` for patient ${patient.name}` : ''}` }));
    
    const message = `Task registered: ${task.text}${patient ? ` for patient ${patient.name}` : ''}.`;
    speechService.speak(message);
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        const newState = !t.completed;
        const message = `Task ${t.text} marked as ${newState ? 'executed' : 'pending'}.`;
        
        if (newState) {
          toast.success('Task completed', { icon: '✅' });
        }
        
        window.dispatchEvent(new CustomEvent('guest-action', { detail: `Marked task "${t.text}" as ${newState ? 'executed' : 'pending'}` }));
        
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
      toast.error('Task deleted', { icon: '🗑️' });
      speechService.speak(`Task ${task.text} deleted.`);
      window.dispatchEvent(new CustomEvent('guest-action', { detail: `Deleted task: ${task.text}` }));
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
    if (filter === 'pending' && t.completed) return false;
    if (filter === 'executed' && !t.completed) return false;
    if (patientFilter !== 'all' && t.patientId !== patientFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Registration */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-white border border-border p-4 transition-none">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-1.5 bg-slate-100 text-slate-600 border border-border">
              <UserPlus size={18} />
            </div>
            <h3 className="text-base font-bold text-slate-800 uppercase tracking-tight">Register Clinical Task</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="new-task-input" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block ml-1">Task Description</label>
              <div className="flex gap-1 border border-border p-1 bg-slate-50">
                <input 
                  id="new-task-input"
                  type="text" 
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && addTask()}
                  placeholder="Describe the task (e.g., Administer IV fluids)..."
                  className="flex-1 bg-white px-3 py-2 font-bold text-sm outline-none focus:bg-slate-50 transition-none text-slate-900 placeholder:text-slate-400"
                />
                <button onClick={addTask} className="bg-slate-800 text-white px-6 border-l border-border hover:bg-slate-700 transition-none font-bold text-xs uppercase tracking-widest">
                  Add
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="flex-1 w-full">
                <label htmlFor="link-patient-select" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1 ml-1">Link to Patient Case</label>
                <select 
                  id="link-patient-select"
                  value={selectedPatientId}
                  onChange={e => setSelectedPatientId(e.target.value)}
                  className="w-full bg-white border border-border px-3 py-2 font-bold text-sm outline-none focus:border-primary transition-none text-slate-900"
                >
                  <option value="">No specific patient</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({new Date(p.date).toLocaleDateString()})</option>
                  ))}
                </select>
              </div>
              <div className="w-full md:w-48">
                <label id="priority-level-label" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1 ml-1">Priority Level</label>
                <div className="flex gap-1 p-1 bg-slate-50 border border-border" aria-labelledby="priority-level-label">
                  {(['low', 'medium', 'high'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setTaskPriority(p)}
                      className={`flex-1 py-1 text-[8px] font-black uppercase tracking-tighter border border-border transition-none ${
                        taskPriority === p 
                          ? p === 'high' ? 'bg-red-600 text-white border-red-700' : p === 'medium' ? 'bg-orange-400 text-white border-orange-500' : 'bg-emerald-500 text-white border-emerald-600'
                          : 'bg-white text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="md:w-64 bg-slate-800 text-white border border-slate-700 p-4 flex flex-col justify-center text-center">
          <div className="text-2xl font-bold mb-0.5">{tasks.filter(t => !t.completed).length}</div>
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pending Tasks</div>
          <div className="h-px bg-white/10 my-3" />
          <div className="text-2xl font-bold mb-0.5">{tasks.filter(t => t.completed).length}</div>
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Executed Tasks</div>
        </div>
      </div>

      {/* Task List Controls */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <label htmlFor="status-filter-select" className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Status Filter</label>
          <div id="status-filter-select" className="flex gap-1 border border-border p-1 bg-slate-50">
            {(['all', 'pending', 'executed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 border border-border text-[10px] font-bold uppercase tracking-widest transition-none ${
                  filter === f 
                    ? 'bg-slate-400 text-white border-slate-500 z-10' 
                    : 'bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1 w-full md:w-auto">
          <label htmlFor="patient-filter-select" className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Patient Filter</label>
          <select 
            id="patient-filter-select"
            value={patientFilter}
            onChange={e => setPatientFilter(e.target.value)}
            className="bg-white border border-border px-3 py-1.5 font-bold text-[10px] uppercase tracking-widest outline-none focus:border-primary transition-none text-slate-600"
          >
            <option value="all">All Patients</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 w-full md:w-auto">
          <label id="priority-filter-label" className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Priority Filter</label>
          <div className="flex gap-1 border border-border p-1 bg-slate-50" aria-labelledby="priority-filter-label">
            {(['all', 'low', 'medium', 'high'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1.5 border border-border text-[10px] font-bold uppercase tracking-widest transition-none ${
                  priorityFilter === p 
                    ? 'bg-slate-400 text-white border-slate-500 z-10' 
                    : 'bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        
        <div className="ml-auto text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Showing {filteredTasks.length} tasks
        </div>
      </div>

      {/* Tasks Display */}
      <div className="grid grid-cols-1 gap-3">
        {filteredTasks.map(task => (
          <div 
            key={task.id} 
            className={`bg-white border border-border p-3 flex items-center justify-between transition-none group ${task.completed ? 'opacity-70 bg-slate-50/50' : 'hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => toggleTask(task.id)}>
              <div className={`w-8 h-8 border border-border flex items-center justify-center transition-none ${task.completed ? 'bg-slate-100 text-slate-600' : 'bg-white text-slate-300 group-hover:text-slate-600'}`}>
                {task.completed ? <CheckCircle size={16} /> : <Clock size={16} />}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`font-bold text-sm tracking-tight ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {task.text}
                  </span>
                  <span className={`px-1.5 py-0.5 text-[8px] font-black border uppercase tracking-widest flex items-center gap-1 ${
                    task.priority === 'high' ? 'bg-red-50 text-red-600 border-red-100' :
                    task.priority === 'medium' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                    'bg-emerald-50 text-emerald-600 border-emerald-100'
                  }`}>
                    {task.priority === 'high' && <AlertCircle size={8} />}
                    {task.priority === 'medium' && <Clock size={8} />}
                    {task.priority === 'low' && <CheckCircle size={8} />}
                    {task.priority}
                  </span>
                  {task.patientName && (
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-bold border border-border uppercase flex items-center gap-1">
                      <User size={8} /> {task.patientName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Created: {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {task.completedAt && (
                    <span className="text-[9px] font-bold text-primary uppercase tracking-widest">
                      Executed: {new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {task.patientId && (
                <button 
                  onClick={(e) => { e.stopPropagation(); printPatientReport(task.patientId!); }} 
                  className="p-2 text-slate-300 hover:text-primary hover:bg-white border border-transparent hover:border-border transition-none"
                  title="Print Patient Report"
                >
                  <Printer size={16} />
                </button>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} 
                className="p-2 text-slate-300 hover:text-red-600 hover:bg-white border border-transparent hover:border-border transition-none"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <div className="py-16 text-center bg-slate-50 border border-dashed border-border">
            <ClipboardList size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No {filter} tasks found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskList;
