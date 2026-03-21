import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ShieldCheck, LogIn, Activity, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

const AuthPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Create user profile
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: 'user',
          createdAt: serverTimestamp()
        });
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-border p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
        <div className="absolute -right-12 -top-12 w-24 h-24 bg-primary/10 rotate-45" />

        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-slate-800 flex items-center justify-center mb-4 shadow-lg">
            <Activity className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white uppercase">
            AI <span className="text-primary">MEDICA</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest">
            Authorization Required
          </p>
        </div>

        <div className="space-y-6">
          <div className="p-4 bg-primary-light/30 border border-primary/20 text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
            <p className="font-bold flex items-center gap-2 mb-2 text-primary">
              <ShieldCheck size={14} /> SECURITY PROTOCOL
            </p>
            Access to this clinical decision support system is restricted to authorized medical personnel. Please sign in with your institutional credentials.
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold uppercase tracking-widest text-xs transition-all disabled:opacity-50 group"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <>
                <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
                Sign In with Google
              </>
            )}
          </button>

          <p className="text-[9px] text-center text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">
            By signing in, you agree to the Clinical Data Handling Policy
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
