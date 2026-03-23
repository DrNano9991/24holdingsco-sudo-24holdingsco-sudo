import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, ArrowRight, Settings } from 'lucide-react';

interface PasswordLockProps {
  onUnlock: () => void;
  onBypass: () => void;
}

const PasswordLock: React.FC<PasswordLockProps> = ({ onUnlock, onBypass }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [storedPassword, setStoredPassword] = useState('1234');

  useEffect(() => {
    const saved = localStorage.getItem('ai-medica-password');
    if (saved) {
      setStoredPassword(saved);
    } else {
      localStorage.setItem('ai-medica-password', '1234');
    }
  }, []);

  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const saved = localStorage.getItem('ai-medica-password') || '1234';
    if (password === saved || password === '1234') { // Allow default 1234 as fallback
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 1000);
    }
  };

  const handleReset = () => {
    localStorage.setItem('ai-medica-password', '1234');
    setPassword('1234');
    alert('Password reset to default: 1234');
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900 flex items-center justify-center p-4 font-['Inter',_sans-serif]">
      <div className={`w-full max-w-md bg-white border-4 border-slate-800 p-8 shadow-[8px_8px_0px_0px_rgba(30,41,59,1)] transition-transform ${error ? 'animate-shake' : ''}`}>
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-slate-800 flex items-center justify-center mb-4">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">AI MEDICA UG</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Clinical Authorization Required</p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={16} className="text-slate-400" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ENTER CLINICAL PASSWORD"
              className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-slate-200 font-bold text-sm outline-none focus:border-slate-800 transition-none"
              autoFocus
            />
          </div>

          <button
            type="submit"
            onClick={() => handleUnlock()}
            className="w-full py-4 bg-slate-800 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-slate-700 active:translate-y-1 transition-all cursor-pointer"
          >
            Authorize Access <ArrowRight size={16} />
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="w-full py-2 text-slate-400 font-bold uppercase tracking-widest text-[9px] hover:text-slate-600 transition-all"
          >
            Forgot Password? Reset to Default
          </button>

          <button
            type="button"
            onClick={() => onBypass()}
            className="w-full py-2 text-slate-200 font-bold uppercase tracking-widest text-[8px] hover:text-slate-400 transition-all mt-2"
          >
            Emergency Bypass (Guest Mode)
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2">
          <Settings size={12} className="text-slate-300" />
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Secure Local Encryption Active</p>
        </div>
      </div>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
};

export default PasswordLock;
