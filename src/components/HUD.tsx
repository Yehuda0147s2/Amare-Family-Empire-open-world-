import React, { useState } from 'react';
import {
  Shield,
  Zap,
  Radio,
  Terminal,
  Volume2,
  VolumeX,
  Pause,
  Database,
  Compass,
  Swords,
  HelpCircle,
  X,
  Crosshair,
  Wind,
  RotateCcw,
} from 'lucide-react';
import { PlayerStats, RadarEntity } from '../game/types.ts';

interface HUDProps {
  stats: PlayerStats;
  activeAmareBuff: string | null;
  interactionPrompt: string | null;
  onPause: () => void;
  onOpenFactory: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

// Tactical Radar Scope Component
const TacticalRadar: React.FC<{
  playerPos?: { x: number; y: number; z: number };
  playerYaw?: number;
  entities?: RadarEntity[];
  radarRadius?: number; // meters
}> = ({ playerPos = { x: 0, y: 0, z: 0 }, playerYaw = 0, entities = [], radarRadius = 55 }) => {
  const radarSize = 130; // px
  const center = radarSize / 2;
  const scale = (radarSize / 2 - 10) / radarRadius;

  return (
    <div className="relative w-[130px] h-[130px] rounded-full bg-slate-950/90 border-2 border-cyan-500/50 shadow-xl shadow-cyan-950/70 overflow-hidden backdrop-blur-md">
      {/* Radar Sweep Animation */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background:
            'conic-gradient(from 0deg, rgba(6,182,212,0.3) 0deg, rgba(6,182,212,0.02) 60deg, transparent 90deg)',
          animation: 'spin 3s linear infinite',
        }}
      />

      {/* Concentric Distance Rings */}
      <div className="absolute inset-3 rounded-full border border-cyan-500/20 pointer-events-none" />
      <div className="absolute inset-8 rounded-full border border-cyan-500/25 pointer-events-none" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-full h-[1px] bg-cyan-500/20" />
        <div className="h-full w-[1px] bg-cyan-500/20 absolute" />
      </div>

      {/* Compass Headings */}
      <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold text-cyan-400/80">
        N
      </span>
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold text-cyan-400/50">
        S
      </span>
      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-mono font-bold text-cyan-400/50">
        E
      </span>
      <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-mono font-bold text-cyan-400/50">
        W
      </span>

      {/* Radar Entities (relative to player pos) */}
      {entities.map((ent) => {
        const dx = ent.x - playerPos.x;
        const dz = ent.z - playerPos.z;
        const dist = Math.hypot(dx, dz);
        if (dist > radarRadius) return null;

        // Position on radar (dx = right, dz = forward in world; map to screen x, y)
        const px = center + dx * scale;
        const py = center - dz * scale; // inverted Y for north

        let color = 'bg-cyan-400';
        let ringColor = 'border-cyan-300';
        let shapeClass = 'w-2 h-2 rounded-full';

        if (ent.type === 'drone') {
          color = ent.state === 'disabled' ? 'bg-slate-400' : 'bg-rose-500';
          ringColor = ent.state === 'alert' ? 'border-red-400 animate-ping' : 'border-rose-400';
          shapeClass = 'w-2.5 h-2.5 rounded-full';
        } else if (ent.type === 'turret') {
          color = ent.state === 'disabled' ? 'bg-slate-600' : 'bg-red-600';
          ringColor = 'border-red-400';
          shapeClass = 'w-2.5 h-2.5 rotate-45';
        } else if (ent.type === 'amare_npc') {
          color = 'bg-amber-400';
          ringColor = 'border-amber-200 animate-pulse';
          shapeClass = 'w-2.5 h-2.5 rounded-sm ring-1 ring-amber-300';
        } else if (ent.type === 'node') {
          color = 'bg-sky-400';
          shapeClass = 'w-2 h-2 rounded-none';
        } else if (ent.type === 'crate') {
          color = 'bg-purple-400';
          shapeClass = 'w-1.5 h-1.5 rounded-full';
        }

        return (
          <div
            key={ent.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 ${shapeClass} ${color} shadow-sm`}
            style={{ left: `${px}px`, top: `${py}px` }}
            title={`${ent.type}: ${ent.name || ent.id}`}
          />
        );
      })}

      {/* Player Arrow at Center (pointing in playerYaw direction) */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-75"
        style={{
          transform: `translate(-50%, -50%) rotate(${(playerYaw * 180) / Math.PI}deg)`,
        }}
      >
        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[9px] border-b-cyan-300 drop-shadow-[0_0_4px_#22d3ee]" />
      </div>

      <div className="absolute bottom-1 right-2 text-[7px] font-mono text-cyan-400/60 uppercase">
        {radarRadius}M RADAR
      </div>
    </div>
  );
};

export const HUD: React.FC<HUDProps> = ({
  stats,
  activeAmareBuff,
  interactionPrompt,
  onPause,
  onOpenFactory,
  isMuted,
  onToggleMute,
}) => {
  const [showControlsHelp, setShowControlsHelp] = useState(false);

  const hpPercent = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
  const empPercent = Math.max(0, Math.min(100, (stats.empEnergy / stats.maxEmpEnergy) * 100));
  const isAnitaHighAlert = stats.anitaAlertLevel > 50;

  // Combat rank name based on current combo streak
  const getComboRank = (combo: number) => {
    if (combo >= 8) return 'LION OF AMARE';
    if (combo >= 5) return 'ANITA SLAYER';
    if (combo >= 3) return 'CYBER INFILTRATOR';
    return 'REBEL INITIATE';
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-3 sm:p-5 text-slate-100 font-mono select-none">
      {/* Top Bar: Left (Health/EMP/Alert/Combat) and Right (Radar/Objectives/Utilities) */}
      <div className="flex items-start justify-between gap-3">
        {/* Top Left: Operative Status, Health, EMP, and Combo Gauge */}
        <div className="flex flex-col gap-2 max-w-xs sm:max-w-sm pointer-events-auto">
          {/* Health & Suit Shield Card */}
          <div className="bg-slate-950/85 border border-cyan-500/30 p-2.5 rounded-lg shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <Shield className="w-3.5 h-3.5" />
                <span>EXO SUIT HP</span>
              </span>
              <span className="tabular-nums font-bold text-slate-200">
                {Math.round(stats.hp)} / {stats.maxHp}
              </span>
            </div>
            {/* HP Bar */}
            <div className="w-44 sm:w-56 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-150 ${
                  hpPercent > 35 ? 'bg-gradient-to-r from-cyan-500 to-sky-400' : 'bg-rose-500 animate-pulse'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>

            {/* EMP Charge Bar */}
            <div className="flex items-center justify-between text-xs mt-2 mb-1">
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Zap className="w-3.5 h-3.5" />
                <span>EMP ENERGY [F]</span>
              </span>
              <span className="tabular-nums font-bold text-slate-300">
                {Math.round(empPercent)}%
              </span>
            </div>
            <div className="w-44 sm:w-56 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-150 ${
                  empPercent >= 100 ? 'shadow-[0_0_8px_#f59e0b]' : ''
                }`}
                style={{ width: `${empPercent}%` }}
              />
            </div>

            {/* Stance & Wake status */}
            <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
              <span className="text-slate-400 flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    stats.isAwake ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                STANCE:
              </span>
              <span className="font-bold text-cyan-300">
                {stats.isAwake ? 'COMBAT READY' : 'REBOOTING / WAKE'}
              </span>
            </div>

            {/* Active Amare Family Resonance Buff */}
            {activeAmareBuff && (
              <div className="mt-1 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                <span className="text-cyan-300 font-bold">AMARE RESONANCE:</span>
                <span className="text-amber-300 font-bold">{activeAmareBuff}</span>
              </div>
            )}
          </div>

          {/* Combat Combo Streak HUD (Visible when fighting or combo active) */}
          {stats.combo > 0 && (
            <div className="bg-gradient-to-r from-rose-950/90 via-slate-950/90 to-amber-950/90 border border-rose-500/60 p-2 rounded-lg shadow-lg flex items-center justify-between animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-rose-400 animate-bounce" />
                <div>
                  <div className="text-[10px] text-rose-300 uppercase font-black tracking-wider">
                    {getComboRank(stats.combo)}
                  </div>
                  <div className="text-xs font-bold text-white">
                    <span className="text-amber-300 tabular-nums text-sm">{stats.combo}x</span> COMBO STRIKE
                  </div>
                </div>
              </div>
              <div className="w-16 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-rose-800">
                <div
                  className="h-full bg-rose-500 transition-all duration-75"
                  style={{ width: `${Math.max(0, (stats.comboTimer / 3.5) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Anita AI Threat Meter */}
          <div
            className={`p-2 rounded-lg border shadow-lg transition-colors ${
              isAnitaHighAlert
                ? 'bg-rose-950/90 border-rose-600 text-rose-200 shadow-rose-900/30'
                : 'bg-slate-950/85 border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5 font-bold">
                <Radio
                  className={`w-3.5 h-3.5 ${
                    isAnitaHighAlert ? 'text-rose-400 animate-spin' : 'text-slate-400'
                  }`}
                />
                <span>ANITA SURVEILLANCE</span>
              </span>
              <span className="tabular-nums font-bold">
                {Math.round(stats.anitaAlertLevel)}%
              </span>
            </div>
            <div className="w-44 sm:w-56 h-1.5 bg-slate-900 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  isAnitaHighAlert ? 'bg-rose-500' : 'bg-amber-500'
                }`}
                style={{ width: `${stats.anitaAlertLevel}%` }}
              />
            </div>
            {stats.inInterior && (
              <div className="text-[9px] text-emerald-400 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>INDOORS: OCCLUSION CONCEALED</span>
              </div>
            )}
          </div>
        </div>

        {/* Top Center: Live Combat Action Banner Toast */}
        {stats.lastCombatFeedback && (
          <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950/90 border border-cyan-400/60 text-cyan-200 text-xs font-bold tracking-wider shadow-xl shadow-cyan-950/50 backdrop-blur-md animate-pulse pointer-events-none">
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span>{stats.lastCombatFeedback}</span>
          </div>
        )}

        {/* Top Right: Tactical Minimap, Objective Tracker & Quick Utilities */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          {/* Tactical Minimap Scanner */}
          <TacticalRadar
            playerPos={stats.playerPos}
            playerYaw={stats.playerYaw}
            entities={stats.radarEntities}
            radarRadius={50}
          />

          {/* Mission Tracker */}
          <div className="bg-slate-950/85 border border-cyan-500/30 p-2 rounded-lg shadow-lg text-right max-w-xs backdrop-blur-md">
            <div className="text-[10px] text-cyan-400 font-bold flex items-center justify-end gap-1.5 mb-0.5">
              <Terminal className="w-3 h-3" />
              <span>PRIMARY MISSION OBJECTIVE</span>
            </div>
            <div className="text-xs text-slate-200">
              Override Anita Sub-Cores:{' '}
              <span className="text-cyan-400 font-bold tabular-nums">
                {stats.nodesHacked} / {stats.totalNodesRequired}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Datashards: <span className="tabular-nums text-amber-400 font-bold">{stats.datashardsCollected}</span> · Score:{' '}
              <span className="tabular-nums text-slate-100 font-bold">{stats.score}</span>
            </div>
          </div>

          {/* Quick Header Utility Bar */}
          <div className="flex items-center gap-1.5">
            {/* Controls Help Guide */}
            <button
              onClick={() => setShowControlsHelp(true)}
              className="p-1.5 rounded-md bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-300 transition cursor-pointer"
              aria-label="Controls Guide"
              title="Controls & Combat Guide"
            >
              <HelpCircle className="w-4 h-4 text-cyan-400" />
            </button>

            {/* Mute Audio */}
            <button
              onClick={onToggleMute}
              className="p-1.5 rounded-md bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              aria-label="Toggle Audio"
              title="Toggle Audio [M]"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            {/* World Factory */}
            <button
              onClick={onOpenFactory}
              className="p-1.5 rounded-md bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              aria-label="World Factory"
              title="3D World Factory"
            >
              <Database className="w-4 h-4 text-amber-400" />
            </button>

            {/* Pause Game */}
            <button
              onClick={onPause}
              className="p-1.5 rounded-md bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              aria-label="Pause Game"
              title="Pause Game [Esc]"
            >
              <Pause className="w-4 h-4 text-slate-200" />
            </button>
          </div>
        </div>
      </div>

      {/* Center Reticle / Screen Interaction Prompt */}
      {interactionPrompt && (
        <div className="self-center mb-8 pointer-events-auto animate-bounce">
          <div className="px-5 py-2.5 rounded-lg bg-cyan-950/95 border-2 border-cyan-400 text-cyan-200 text-sm font-bold tracking-wider shadow-2xl shadow-cyan-500/40 backdrop-blur-md">
            {interactionPrompt}
          </div>
        </div>
      )}

      {/* Bottom Bar: Combat & Control Guide (Desktop view) */}
      <div className="hidden lg:flex items-center justify-between text-xs text-slate-400 border-t border-slate-900/80 pt-2 pointer-events-auto bg-slate-950/40 px-3 py-1 rounded backdrop-blur-xs">
        <div className="flex items-center gap-4">
          <span className="text-slate-400">WASD Move</span>
          <span className="text-slate-400">Shift Sprint</span>
          <span className="text-slate-400">Space Jump</span>
          <span className="text-cyan-400 font-bold">L-Click / [J] Fight (Melee Blade)</span>
          <span className="text-amber-400 font-bold">R-Click / [K] Heavy Power Strike</span>
          <span className="text-emerald-400">[C] Dash Evade</span>
          <span className="text-purple-400">[Z] Wake / Stand Up</span>
          <span className="text-sky-400">[E] Hack / Door</span>
          <span className="text-amber-400">[F] EMP Pulse</span>
        </div>
        <div className="text-[11px] text-cyan-400/80 font-bold">
          SECTOR: {stats.inInterior ? `BLD INTERIOR [FL ${stats.currentFloor}]` : 'CENTRAL HIGHWAY · ANITA CITADEL'}
        </div>
      </div>

      {/* Interactive Controls & Combat Modal */}
      {showControlsHelp && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-slate-900 border-2 border-cyan-500 rounded-xl p-6 max-w-lg w-full text-slate-100 shadow-2xl shadow-cyan-950/80">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-lg">
                <Swords className="w-5 h-5" />
                <span>HUMANS VS. ANITA // COMBAT & CONTROLS</span>
              </div>
              <button
                onClick={() => setShowControlsHelp(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <h4 className="text-cyan-400 font-bold uppercase mb-1.5 flex items-center gap-1.5">
                  <Crosshair className="w-4 h-4" />
                  <span>Desktop Controls</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded border border-slate-800">
                  <div><span className="text-cyan-300 font-bold">W, A, S, D</span> — Walk / Directional Run</div>
                  <div><span className="text-cyan-300 font-bold">Shift</span> — Fast Sprint</div>
                  <div><span className="text-cyan-300 font-bold">Left Click / J</span> — Melee Strike (Combo)</div>
                  <div><span className="text-cyan-300 font-bold">Right Click / K</span> — Heavy Power Strike</div>
                  <div><span className="text-cyan-300 font-bold">C / L-Ctrl</span> — Tactical Dash / Evade</div>
                  <div><span className="text-cyan-300 font-bold">Z / R</span> — Wake Up / Stand Up</div>
                  <div><span className="text-cyan-300 font-bold">Space</span> — Jump & Mantle</div>
                  <div><span className="text-cyan-300 font-bold">E</span> — Hack Terminal / Open Door / Talk</div>
                  <div><span className="text-cyan-300 font-bold">F</span> — EMP Shockwave (Stun Drones)</div>
                  <div><span className="text-cyan-300 font-bold">Esc / P</span> — Pause Game</div>
                </div>
              </div>

              <div>
                <h4 className="text-amber-400 font-bold uppercase mb-1.5 flex items-center gap-1.5">
                  <Wind className="w-4 h-4" />
                  <span>Touch Screen Mobile / Tablet Controls</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded border border-slate-800">
                  <div><span className="text-amber-300 font-bold">Left Joystick</span> — 360° Analog Movement</div>
                  <div><span className="text-amber-300 font-bold">Right Drag</span> — Orbit Camera (Yaw & Pitch)</div>
                  <div><span className="text-amber-300 font-bold">FIGHT Button</span> — Light Cyber Blade Attack</div>
                  <div><span className="text-amber-300 font-bold">HEAVY Button</span> — Charged Plasma Shockwave</div>
                  <div><span className="text-amber-300 font-bold">WAKE Button</span> — Reboot / Stand Up Recovery</div>
                  <div><span className="text-amber-300 font-bold">DASH Button</span> — High-speed Jet Dodge</div>
                  <div><span className="text-amber-300 font-bold">JUMP Button</span> — Leap & Mantle Obstacles</div>
                  <div><span className="text-amber-300 font-bold">EMP / HACK</span> — Pulse & Terminal Overrides</div>
                </div>
              </div>

              <div className="p-2.5 rounded bg-cyan-950/40 border border-cyan-800/60 text-cyan-300 text-[11px]">
                <strong className="text-white">COMBAT TIP:</strong> Chain melee attacks to build your combo multiplier up to 2.0x damage. Use Liya Amare's buff for +40% attack power or Natan's buff for instant EMP regeneration!
              </div>
            </div>

            <button
              onClick={() => setShowControlsHelp(false)}
              className="mt-4 w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg transition cursor-pointer"
            >
              CLOSE COMBAT GUIDE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
