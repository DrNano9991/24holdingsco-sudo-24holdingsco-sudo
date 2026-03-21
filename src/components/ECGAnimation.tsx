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

const ECGAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heartRef = useRef<HTMLDivElement>(null);
  const stateIdxRef = useRef(0);

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
      ctx.strokeStyle = "#E5E5E5";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < canvas.width; x += 25) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      const state = CARDIAC_STATES[stateIdxRef.current];
      let val = 100;

      // Adjust iteration speed based on rhythm
      const speedMap = {
        normal: 0.2,
        vtach: 0.6,
        atach: 0.5,
        vfib: 0.3,
        asystole: 0.1
      };
      ecgIter += speedMap[state.mode];

      if (state.mode === 'vfib') {
        val = 100 + (Math.random() - 0.5) * 60;
        if (Math.random() > 0.85) {
          pulseHeart(1.05, 0.05);
        }
      } else if (state.mode === 'asystole') {
        val = 100 + (Math.random() - 0.5) * 2; // Tiny noise
      } else if (state.mode === 'vtach') {
        let cycle = ecgIter % (Math.PI * 2);
        // Wide QRS complexes, no P waves
        if (cycle < 0.8) {
          val -= Math.sin(cycle * (Math.PI / 0.8)) * 80; // Wide R
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
          val -= 70; // R
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
      if (ecgPoints.length > 250) ecgPoints.shift();

      ctx.beginPath();
      ctx.strokeStyle = state.color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "square";
      ctx.lineJoin = "miter";

      for (let i = 0; i < ecgPoints.length; i++) {
        const x = (i / 250) * canvas.width;
        if (i === 0) ctx.moveTo(x, ecgPoints[i]);
        else ctx.lineTo(x, ecgPoints[i]);
      }
      ctx.stroke();

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

    const stateInterval = setInterval(() => {
      stateIdxRef.current = (stateIdxRef.current + 1) % CARDIAC_STATES.length;
    }, 8000);

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(stateInterval);
    };
  }, []);

  const currentState = CARDIAC_STATES[stateIdxRef.current];

  return (
    <div className="relative h-20 w-full bg-white border border-[#D1D1D1] overflow-hidden flex items-center p-1 shadow-none">
      <div className="absolute top-1 left-2 z-10 flex flex-col">
        <span className="text-[9px] font-bold text-slate-500 uppercase">Live ECG Feed</span>
        <span className="text-[10px] font-bold" style={{ color: currentState.color }}>
          {currentState.name} • {currentState.state}
        </span>
      </div>
      <canvas ref={canvasRef} width={1000} height={200} className="flex-1 h-full" />
      <div ref={heartRef} className="heart-outer absolute right-4 border" style={{ borderColor: currentState.color + '40' }}>
        <HeartPulse className="transition-colors duration-500" style={{ color: currentState.color }} size={24} />
      </div>
    </div>
  );
};

export default ECGAnimation;
