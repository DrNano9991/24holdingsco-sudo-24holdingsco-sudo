import React, { useState } from 'react';
import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useLocalStorage<Task[]>('ai-medica-tasks', []);
  const [newTask, setNewTask] = useState('');

  const addTask = () => {
    if (!newTask.trim()) return;
    const task: Task = {
      id: Date.now().toString(),
      text: newTask,
      completed: false,
      priority: 'medium'
    };
    setTasks([...tasks, task]);
    setNewTask('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="material-card p-4 rounded-2xl flex gap-3 bg-white/5 border-white/5">
        <input 
          type="text" 
          value={newTask}
          onChange={e => setNewTask(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && addTask()}
          placeholder="Add clinical task..."
          className="flex-1 bg-black/20 border-white/10 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-emerald-500 transition-all text-white placeholder:text-slate-600"
        />
        <button onClick={addTask} className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20">
          <Plus size={20} />
        </button>
      </div>

      <div className="space-y-3">
        {tasks.map(task => (
          <div key={task.id} className={`material-card p-4 rounded-2xl flex items-center justify-between transition-all border-white/5 ${task.completed ? 'opacity-40 grayscale' : 'hover:border-white/10'}`}>
            <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => toggleTask(task.id)}>
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-700 bg-black/20'}`}>
                {task.completed && <CheckCircle2 className="text-white" size={14} />}
              </div>
              <span className={`font-bold text-sm tracking-tight ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>{task.text}</span>
            </div>
            <button onClick={() => deleteTask(task.id)} className="text-slate-600 hover:text-red-500 transition-all p-2">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-16 text-slate-600 font-bold text-sm uppercase tracking-[0.3em] opacity-50">No pending tasks</div>
        )}
      </div>
    </div>
  );
};

export default TaskList;
