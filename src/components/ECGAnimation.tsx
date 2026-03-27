import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { HeartPulse } from 'lucide-react';

interface CardiacState {
  name: string;
  bpm: number;
  color: string;
  state: string;
  mode: 'normal' | 'vtach' | 'atach' | 'vfib' | 'asystole';
}

const CARDIAC_STATES: CardiacState[] = [
  { name: "NORMAL SINUS", bpm: 72, color: "#10b981", state: "NOMINAL", mode: 'normal' },
  { name: "V-TACH", bpm: 160, color: "#f59e0b", state: "WARNING", mode: 'vtach' },
  { name: "A-TACH", bpm: 150, color: "#3b82f6", state: "WARNING", mode: 'atach' },
  { name: "V-FIB", bpm: 0, color: "#ef4444", state: "CRITICAL", mode: 'vfib' },
  { name: "ASYSTOLE", bpm: 0, color: "#64748b", state: "FATAL", mode: 'asystole' }
];

interface ECGAnimationProps {
  rhythm?: 'normal' | 'vtach' | 'atach' | 'vfib' | 'asystole';
  onRhythmChange?: (rhythm: string) => void;
}

const ECGAnimation: React.FC<ECGAnimationProps> = ({ rhythm, onRhythmChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heartRef = useRef<HTMLDivElement>(null);
  const stateIdxRef = useRef(0);

  // Sync internal state with prop
  useEffect(() => {
    if (rhythm) {
      const idx = CARDIAC_STATES.findIndex(s => s.mode === rhythm);
      if (idx !== -1) stateIdxRef.current = idx;
    }
  }, [rhythm]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let ecgPoints: number[] = [];
    let ecgIter = 0;
    let lastBeatTime = 0;
    let animationFrameId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Light Tech Grid Background
      ctx.strokeStyle = "#F1F5F9";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      const state = CARDIAC_STATES[stateIdxRef.current];
      let val = 100;

      // Adjust iteration speed based on rhythm
      const speedMap = {
        normal: 0.15,
        vtach: 0.45,
        atach: 0.4,
        vfib: 0.25,
        asystole: 0.05
      };
      ecgIter += speedMap[state.mode];

      if (state.mode === 'vfib') {
        val = 100 + (Math.random() - 0.5) * 60;
        if (Math.random() > 0.9) {
          pulseHeart(1.05, 0.05);
        }
      } else if (state.mode === 'asystole') {
        val = 100 + (Math.random() - 0.5) * 2; // Tiny noise
      } else if (state.mode === 'vtach') {
        let cycle = ecgIter % (Math.PI * 2);
        // Wide QRS complexes, no P waves
        if (cycle < 1.0) {
          val -= Math.sin(cycle * (Math.PI / 1.0)) * 85; // Wide R
          if (performance.now() - lastBeatTime > 300) {
            pulseHeart(1.15, 0.08);
            lastBeatTime = performance.now();
          }
        }
      } else if (state.mode === 'atach') {
        let cycle = ecgIter % (Math.PI * 2);
        // Fast, narrow QRS
        if (cycle < 0.2) {
          val -= Math.sin(cycle * (Math.PI / 0.2)) * 10; // P
        } else if (cycle > 0.3 && cycle < 0.4) {
          val -= 75; // R
          if (performance.now() - lastBeatTime > 350) {
            pulseHeart(1.18, 0.08);
            lastBeatTime = performance.now();
          }
        } else if (cycle > 0.6 && cycle < 1.0) {
          val -= Math.sin((cycle - 0.6) * (Math.PI / 0.4)) * 15; // T
        }
      } else {
        // Normal Sinus
        let cycle = ecgIter % (Math.PI * 2);
        if (cycle < 0.4) {
          val -= Math.sin(cycle * (Math.PI / 0.4)) * 12; // P-Wave
        } else if (cycle > 0.6 && cycle < 0.7) {
          val += 18; // Q
        } else if (cycle >= 0.7 && cycle < 0.82) {
          val -= 90; // R-Peak
          if (performance.now() - lastBeatTime > 400) {
            pulseHeart(1.22, 0.1);
            lastBeatTime = performance.now();
          }
        } else if (cycle >= 0.82 && cycle < 0.95) {
          val += 30; // S
        } else if (cycle > 1.3 && cycle < 1.9) {
          val -= Math.sin((cycle - 1.3) * (Math.PI / 0.6)) * 18; // T-Wave
        }
      }

      ecgPoints.push(val);
      if (ecgPoints.length > 300) ecgPoints.shift();

      ctx.beginPath();
      ctx.strokeStyle = state.color;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (let i = 0; i < ecgPoints.length; i++) {
        const x = (i / 300) * canvas.width;
        if (i === 0) ctx.moveTo(x, ecgPoints[i]);
        else ctx.lineTo(x, ecgPoints[i]);
      }
      ctx.stroke();

      // Add a "glow" effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = state.color;
      ctx.stroke();
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(draw);
    };

    const pulseHeart = (scale: number, duration: number) => {
      if (!heartRef.current) return;
      gsap.to(heartRef.current, { 
        scale: scale, 
        duration: duration, 
        ease: "power2.out", 
        onComplete: () => {
          gsap.to(heartRef.current, { scale: 1.0, duration: duration * 3, ease: "elastic.out(1, 0.3)" });
        }
      });
    };

    // Only auto-cycle if no rhythm prop is provided
    let stateInterval: any;
    if (!rhythm) {
      stateInterval = setInterval(() => {
        stateIdxRef.current = (stateIdxRef.current + 1) % CARDIAC_STATES.length;
        if (onRhythmChange) onRhythmChange(CARDIAC_STATES[stateIdxRef.current].mode);
      }, 10000);
    }

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (stateInterval) clearInterval(stateInterval);
    };
  }, [rhythm, onRhythmChange]);

  const currentState = CARDIAC_STATES[stateIdxRef.current];

  return (
    <div className="relative h-24 w-full bg-white border-2 border-slate-200 overflow-hidden flex items-center p-2 rounded-lg shadow-inner">
      <div className="absolute top-2 left-3 z-10 flex flex-col">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: currentState.color }} />
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Live Cardiac Monitor</span>
        </div>
        <span className="text-[11px] font-black mt-0.5" style={{ color: currentState.color }}>
          {currentState.name} • {currentState.state} • {currentState.mode === 'asystole' || currentState.mode === 'vfib' ? '--' : currentState.bpm} BPM
        </span>
      </div>
      <canvas ref={canvasRef} width={1200} height={200} className="flex-1 h-full" />
      <div ref={heartRef} className="absolute right-6 flex items-center justify-center">
        <HeartPulse className="transition-colors duration-500" style={{ color: currentState.color }} size={32} />
      </div>
    </div>
  );
};

export default ECGAnimation;
