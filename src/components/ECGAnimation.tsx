import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface CardiacState {
  name: string;
  bpm: number;
  color: string;
  state: string;
  mode: 'normal' | 'slow' | 'fast' | 'vfib';
}

const CARDIAC_STATES: CardiacState[] = [
  { name: "NORMAL SINUS", bpm: 72, color: "#0891b2", state: "NOMINAL", mode: 'normal' },
  { name: "BRADYCARDIA", bpm: 42, color: "#3b82f6", state: "STABLE", mode: 'slow' },
  { name: "TACHYCARDIA", bpm: 145, color: "#f59e0b", state: "WARNING", mode: 'fast' },
  { name: "V-FIBRILLATION", bpm: 0, color: "#e11d48", state: "CRITICAL", mode: 'vfib' }
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
      ctx.strokeStyle = "rgba(0, 0, 0, 0.03)";
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

      ecgIter += (state.mode === 'fast' ? 0.35 : state.mode === 'slow' ? 0.1 : 0.2);

      if (state.mode === 'vfib') {
        val = 100 + (Math.random() - 0.5) * 60;
        if (Math.random() > 0.8) {
          pulseHeart(1.08);
        }
      } else {
        let cycle = ecgIter % (Math.PI * 2);
        // Synthetic ECG Waveform
        if (cycle < 0.4) {
          val -= Math.sin(cycle * (Math.PI / 0.4)) * 12; // P-Wave
        } else if (cycle > 0.6 && cycle < 0.7) {
          val += 18; // Q
        } else if (cycle >= 0.7 && cycle < 0.82) {
          val -= 90; // R-Peak
          if (performance.now() - lastBeatTime > 400) {
            pulseHeart(1.22);
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
      ctx.lineWidth = 3.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = state.color;
      ctx.shadowBlur = 8;

      for (let i = 0; i < ecgPoints.length; i++) {
        const x = (i / 250) * canvas.width;
        if (i === 0) ctx.moveTo(x, ecgPoints[i]);
        else ctx.lineTo(x, ecgPoints[i]);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(draw);
    };

    const pulseHeart = (scale: number) => {
      if (!heartRef.current) return;
      gsap.to(heartRef.current, { 
        scale: scale, 
        duration: 0.1, 
        ease: "power2.out", 
        onComplete: () => {
          gsap.to(heartRef.current, { scale: 1.0, duration: 0.3, ease: "elastic.out(1, 0.3)" });
        }
      });
    };

    const stateInterval = setInterval(() => {
      stateIdxRef.current = (stateIdxRef.current + 1) % CARDIAC_STATES.length;
    }, 7000);

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(stateInterval);
    };
  }, []);

  return (
    <div className="relative h-20 w-full bg-white/60 rounded border border-black/5 overflow-hidden flex items-center">
      <canvas ref={canvasRef} width={1000} height={200} className="flex-1 h-full ecg-glow" />
      <div ref={heartRef} className="heart-outer absolute right-3">
        <span className="material-symbols-outlined heart-icon-google">
          monitor_heart
        </span>
      </div>
    </div>
  );
};

export default ECGAnimation;
