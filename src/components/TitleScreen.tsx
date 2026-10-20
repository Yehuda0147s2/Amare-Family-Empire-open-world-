import React, { useEffect } from 'react';
import { Play, Settings2, ShieldAlert } from 'lucide-react';

interface TitleScreenProps {
  onStart: () => void;
  onOpenFactory: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart, onOpenFactory }) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onStart]);

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-8 sm:p-12 text-slate-100">
      {/* Top Left World Status & Version */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-md bg-slate-950/80 border border-slate-800 text-xs tracking-wider uppercase font-mono text-cyan-400">
          <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
          <span>Anita Central Core Online · Sector 07</span>
        </div>

        <button
          onClick={onOpenFactory}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white transition cursor-pointer"
        >
          <Settings2 className="w-4 h-4 text-cyan-400" />
          <span>3D World Factory</span>
        </button>
      </div>

      {/* Center / Lower Left Title Lockup with gradient backdrop */}
      <div className="max-w-xl pointer-events-auto mt-auto mb-8 p-4 sm:p-6 rounded-lg bg-slate-950/70 border border-slate-900/60 shadow-2xl backdrop-blur-none">
        {/* Bespoke inline SVG Title Lockup */}
        <div className="mb-3">
          <svg viewBox="0 0 520 80" className="w-full max-w-lg h-auto overflow-visible">
            <defs>
              <linearGradient id="anitaGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00f2fe" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
              <filter id="shadow">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.8" />
              </filter>
            </defs>
            <text
              x="0"
              y="36"
              fontFamily="monospace"
              fontWeight="900"
              fontSize="32"
              letterSpacing="4"
              fill="#f8fafc"
              filter="url(#shadow)"
            >
              HUMANS VS. ANITA
            </text>
            <text
              x="2"
              y="60"
              fontFamily="monospace"
              fontWeight="700"
              fontSize="12"
              letterSpacing="5"
              fill="url(#anitaGlow)"
            >
              AUTONOMOUS 3D CYBERPUNK METROPOLIS
            </text>
          </svg>
        </div>

        <p className="text-slate-300 text-sm font-sans leading-relaxed mb-6 max-w-md drop-shadow">
          Infiltrate the AI-controlled megacity. Hack Anita mainframe nodes, avoid autonomous surveillance drones, and restore human resistance control.
        </p>

        {/* Primary Start CTA */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            data-start="true"
            onClick={onStart}
            className="flex items-center gap-3 px-8 py-3.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-base tracking-wide transition shadow-lg shadow-cyan-500/25 cursor-pointer active:scale-95"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START RESISTANCE</span>
          </button>

          <button
            onClick={onOpenFactory}
            className="px-5 py-3.5 rounded bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-mono text-sm tracking-wide transition cursor-pointer"
          >
            WORLD FACTORY ARCHITECTURE
          </button>
        </div>
      </div>

      {/* Flat Control Hints Line in Bottom Margin */}
      <div className="pointer-events-auto border-t border-slate-800/80 pt-3 text-xs font-mono text-slate-400 flex flex-wrap items-center justify-between gap-4">
        <span>WASD Move · Shift Run · Space Jump · E Interact / Hack · F EMP Shockwave · Esc Pause</span>
        <span className="text-slate-500">Seed: Deterministic 3D Grid · WebGL2</span>
      </div>
    </div>
  );
};
