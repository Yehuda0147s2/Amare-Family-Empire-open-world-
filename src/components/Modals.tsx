import React from 'react';
import { Play, RotateCcw, Home, Trophy, Skull, Database } from 'lucide-react';
import { PlayerStats } from '../game/types.ts';

interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
  onOpenFactory: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  onResume,
  onRestart,
  onTitle,
  onOpenFactory,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-lg p-6 text-center text-slate-100 font-mono shadow-2xl">
        <h2 className="text-xl font-bold tracking-wider text-cyan-400 mb-1">SIMULATION PAUSED</h2>
        <p className="text-xs text-slate-400 mb-6">Neural link suspended. Choose an action.</p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="flex items-center justify-center gap-2 w-full py-3 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm tracking-wide transition cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME MISSION</span>
          </button>

          <button
            onClick={onOpenFactory}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs tracking-wide transition cursor-pointer border border-slate-700"
          >
            <Database className="w-4 h-4 text-amber-400" />
            <span>3D WORLD FACTORY</span>
          </button>

          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs tracking-wide transition cursor-pointer border border-slate-700"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART SECTOR</span>
          </button>

          <button
            onClick={onTitle}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs tracking-wide transition cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>TITLE SCREEN</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  isOpen: boolean;
  stats: PlayerStats;
  onRestart: () => void;
  onTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  stats,
  onRestart,
  onTitle,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-rose-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-rose-700 rounded-lg p-6 text-center text-slate-100 font-mono shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-rose-950 border border-rose-600 flex items-center justify-center mx-auto mb-3">
          <Skull className="w-6 h-6 text-rose-500" />
        </div>

        <h2 className="text-xl font-bold tracking-wider text-rose-400 mb-1">RESISTANCE NEUTRALIZED</h2>
        <p className="text-xs text-slate-400 mb-6">
          Anita defense network purged operative Kaelen. Sub-core uplink severed.
        </p>

        {/* Tabular Stats Grid */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded bg-slate-950 border border-slate-800 mb-6 text-left text-xs">
          <div>
            <div className="text-slate-500">FINAL SCORE</div>
            <div className="text-base font-bold tabular-nums text-white">{stats.score}</div>
          </div>
          <div>
            <div className="text-slate-500">NODES OVERRIDDEN</div>
            <div className="text-base font-bold tabular-nums text-cyan-400">
              {stats.nodesHacked} / {stats.totalNodesRequired}
            </div>
          </div>
          <div>
            <div className="text-slate-500">DATASHARDS RECOVERED</div>
            <div className="text-base font-bold tabular-nums text-amber-400">{stats.datashardsCollected}</div>
          </div>
          <div>
            <div className="text-slate-500">PEAK ANITA ALERT</div>
            <div className="text-base font-bold tabular-nums text-rose-400">{Math.round(stats.anitaAlertLevel)}%</div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            data-start="true"
            onClick={onRestart}
            className="flex items-center justify-center gap-2 w-full py-3 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm tracking-wide transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>TRY INFILTRATION AGAIN</span>
          </button>

          <button
            onClick={onTitle}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs tracking-wide transition cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>RETURN TO TITLE</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface VictoryModalProps {
  isOpen: boolean;
  stats: PlayerStats;
  onPlayAgain: () => void;
  onTitle: () => void;
  onOpenFactory: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  stats,
  onPlayAgain,
  onTitle,
  onOpenFactory,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-cyan-950/85 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-cyan-500 rounded-lg p-6 text-center text-slate-100 font-mono shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-cyan-950 border border-cyan-400 flex items-center justify-center mx-auto mb-3">
          <Trophy className="w-6 h-6 text-cyan-400" />
        </div>

        <h2 className="text-xl font-bold tracking-wider text-cyan-300 mb-1">ANITA OVERRIDE COMPLETE</h2>
        <p className="text-xs text-slate-300 mb-6">
          Human Resistance operative Kaelen has hijacked all regional Anita sub-core towers!
        </p>

        {/* Tabular Stats Grid */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded bg-slate-950 border border-slate-800 mb-6 text-left text-xs">
          <div>
            <div className="text-slate-500">VICTORY SCORE</div>
            <div className="text-base font-bold tabular-nums text-cyan-300">{stats.score + 1000}</div>
          </div>
          <div>
            <div className="text-slate-500">NODES OVERRIDDEN</div>
            <div className="text-base font-bold tabular-nums text-emerald-400">
              {stats.nodesHacked} / {stats.totalNodesRequired}
            </div>
          </div>
          <div>
            <div className="text-slate-500">DATASHARDS RECOVERED</div>
            <div className="text-base font-bold tabular-nums text-amber-400">{stats.datashardsCollected}</div>
          </div>
          <div>
            <div className="text-slate-500">SECTOR STATUS</div>
            <div className="text-base font-bold text-emerald-400">LIBERATED</div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            data-start="true"
            onClick={onPlayAgain}
            className="flex items-center justify-center gap-2 w-full py-3 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm tracking-wide transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>PLAY AGAIN (NEW SECTOR)</span>
          </button>

          <button
            onClick={onOpenFactory}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs tracking-wide transition cursor-pointer border border-slate-700"
          >
            <Database className="w-4 h-4 text-amber-400" />
            <span>EXPORT SECTOR IN WORLD FACTORY</span>
          </button>

          <button
            onClick={onTitle}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs tracking-wide transition cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>RETURN TO TITLE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
