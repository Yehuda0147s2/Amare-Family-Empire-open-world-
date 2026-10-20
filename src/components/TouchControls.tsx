import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Zap,
  KeyRound,
  ChevronUp,
  Swords,
  Flame,
  RotateCcw,
  Wind,
  Gauge,
  Eye,
  EyeOff,
} from 'lucide-react';

interface TouchControlsProps {
  onVirtualMove: (moveX: number, moveZ: number) => void;
  onVirtualLook: (deltaX: number, deltaY: number) => void;
  onVirtualSprint: (sprint: boolean) => void;
  onVirtualAttack: (type: 'light' | 'heavy') => void;
  onVirtualWake: () => void;
  onVirtualDash: () => void;
  onVirtualJump: () => void;
  onVirtualInteract: () => void;
  onVirtualEmp: () => void;
  comboCount?: number;
  isAwake?: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onVirtualMove,
  onVirtualLook,
  onVirtualSprint,
  onVirtualAttack,
  onVirtualWake,
  onVirtualDash,
  onVirtualJump,
  onVirtualInteract,
  onVirtualEmp,
  comboCount = 0,
  isAwake = true,
}) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const lookPadRef = useRef<HTMLDivElement>(null);

  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const [isSprintLocked, setIsSprintLocked] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  // Active touch tracking for look pad
  const lookTouchIdRef = useRef<number | null>(null);
  const lastLookPosRef = useRef<{ x: number; y: number } | null>(null);

  // Force show on touch devices or small screens, but also allow user override
  const [hasTouchCapability, setHasTouchCapability] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      const touchCapable =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.innerWidth <= 1024;
      setHasTouchCapability(touchCapable);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // Sync sprint lock with canvas
  const handleToggleSprint = useCallback(() => {
    setIsSprintLocked((prev) => {
      const next = !prev;
      onVirtualSprint(next);
      return next;
    });
  }, [onVirtualSprint]);

  // Virtual Joystick Movement
  const handleJoystickTouchMove = (e: React.TouchEvent) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const maxRadius = rect.width / 2;
    const dist = Math.hypot(dx, dy);

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const stickX = Math.cos(angle) * clampedDist;
    const stickY = Math.sin(angle) * clampedDist;

    setStickPos({ x: stickX, y: stickY });

    // Normalized move vector (-1 to 1)
    const normX = stickX / maxRadius;
    const normZ = -stickY / maxRadius; // invert Y for forward (Z+)

    // If pushed to edge (>80% distance), auto-sprint
    if (dist > maxRadius * 0.85 && !isSprintLocked) {
      onVirtualSprint(true);
    } else if (!isSprintLocked) {
      onVirtualSprint(false);
    }

    onVirtualMove(normX, normZ);
  };

  const handleJoystickTouchEnd = () => {
    setStickPos({ x: 0, y: 0 });
    onVirtualMove(0, 0);
    if (!isSprintLocked) {
      onVirtualSprint(false);
    }
  };

  // Right-Side Touchpad Look / Camera Orbit
  const handleLookTouchStart = (e: React.TouchEvent) => {
    // Avoid capturing if touching action buttons
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    const touch = e.changedTouches[0];
    lookTouchIdRef.current = touch.identifier;
    lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleLookTouchMove = (e: React.TouchEvent) => {
    if (lookTouchIdRef.current === null || !lastLookPosRef.current) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current) {
        const dx = touch.clientX - lastLookPosRef.current.x;
        const dy = touch.clientY - lastLookPosRef.current.y;

        lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };

        // Dispatch camera rotation delta
        onVirtualLook(dx, dy);
        break;
      }
    }
  };

  const handleLookTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
        lastLookPosRef.current = null;
        break;
      }
    }
  };

  if (!hasTouchCapability && !controlsVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-30 select-none">
      {/* Visibility Toggle for desktop touch-testing or minimal HUD */}
      <div className="absolute top-16 right-4 pointer-events-auto">
        <button
          onClick={() => setControlsVisible((prev) => !prev)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono tracking-wider bg-slate-900/85 hover:bg-slate-800 border border-cyan-500/40 text-cyan-400 rounded-md shadow-lg backdrop-blur cursor-pointer active:scale-95 transition"
          aria-label="Toggle Touch Controls"
        >
          {controlsVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>TOUCH {controlsVisible ? 'HIDE' : 'SHOW'}</span>
        </button>
      </div>

      {controlsVisible && (
        <>
          {/* Right-Side Camera Look Drag Area */}
          <div
            ref={lookPadRef}
            onTouchStart={handleLookTouchStart}
            onTouchMove={handleLookTouchMove}
            onTouchEnd={handleLookTouchEnd}
            onTouchCancel={handleLookTouchEnd}
            className="absolute top-20 right-0 w-1/2 bottom-36 pointer-events-auto touch-none"
            aria-label="Camera Orbit Touchpad"
          >
            <div className="absolute top-2 right-4 text-[10px] font-mono text-cyan-400/40 tracking-widest uppercase pointer-events-none select-none">
              [DRAG HERE TO ORBIT CAMERA]
            </div>
          </div>

          {/* Bottom Controls Bar */}
          <div className="absolute inset-x-0 bottom-0 p-4 pb-6 flex justify-between items-end pointer-events-none">
            {/* Left Zone: Virtual Joystick & Sprint Lock */}
            <div className="flex flex-col items-center gap-3 pointer-events-auto ml-2 mb-2">
              {/* Sprint Lock Toggle */}
              <button
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleToggleSprint();
                }}
                onClick={handleToggleSprint}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono tracking-wider shadow-md backdrop-blur transition-all active:scale-95 cursor-pointer ${
                  isSprintLocked
                    ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold shadow-amber-500/40 ring-2 ring-amber-400/50'
                    : 'bg-slate-900/80 text-cyan-300 border-cyan-700/60'
                }`}
                aria-label="Sprint Lock"
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>SPRINT: {isSprintLocked ? 'LOCKED' : 'WALK'}</span>
              </button>

              {/* Virtual Joystick */}
              <div
                ref={joystickRef}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleJoystickTouchMove(e);
                }}
                onTouchMove={(e) => {
                  e.preventDefault();
                  handleJoystickTouchMove(e);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleJoystickTouchEnd();
                }}
                onTouchCancel={(e) => {
                  e.preventDefault();
                  handleJoystickTouchEnd();
                }}
                className="w-32 h-32 rounded-full bg-slate-950/70 border-2 border-cyan-500/40 relative flex items-center justify-center touch-none backdrop-blur-md shadow-2xl shadow-cyan-950/60"
              >
                {/* Crosshairs & Direction rings */}
                <div className="absolute inset-2 rounded-full border border-dashed border-cyan-500/20 pointer-events-none" />
                <div className="absolute w-full h-[1px] bg-cyan-500/20 pointer-events-none" />
                <div className="absolute h-full w-[1px] bg-cyan-500/20 pointer-events-none" />

                {/* Thumb Stick Knob */}
                <div
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-700 border-2 border-cyan-200 shadow-lg shadow-cyan-500/70 absolute flex items-center justify-center pointer-events-none transition-transform duration-75"
                  style={{
                    transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
                  }}
                >
                  <div className="w-4 h-4 rounded-full bg-white/90 shadow-inner" />
                </div>
              </div>
            </div>

            {/* Right Zone: Action & Combat Clusters */}
            <div className="flex flex-col items-end gap-3 pointer-events-auto mr-2 mb-1">
              {/* Secondary Utility Row (EMP, Hack/Interact, Wake/Recovery, Dash) */}
              <div className="flex items-center gap-2">
                {/* Wake / Stand Up / Combat Stance Button */}
                <button
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onVirtualWake();
                  }}
                  onClick={onVirtualWake}
                  className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-purple-950/80 border border-purple-400/80 text-purple-200 active:scale-90 transition shadow-lg shadow-purple-900/30 cursor-pointer backdrop-blur"
                  aria-label="Wake Up & Combat Stance"
                  title="Wake Up / Stand Up"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-[9px] font-mono tracking-tight uppercase font-semibold">
                    WAKE
                  </span>
                </button>

                {/* Dash / Evade Button */}
                <button
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onVirtualDash();
                  }}
                  onClick={onVirtualDash}
                  className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-400/80 text-emerald-200 active:scale-90 transition shadow-lg shadow-emerald-900/30 cursor-pointer backdrop-blur"
                  aria-label="Dash & Evade"
                  title="Dash / Evade"
                >
                  <Wind className="w-4 h-4" />
                  <span className="text-[9px] font-mono tracking-tight uppercase font-semibold">
                    DASH
                  </span>
                </button>

                {/* EMP Shockwave */}
                <button
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onVirtualEmp();
                  }}
                  onClick={onVirtualEmp}
                  className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-amber-950/80 border border-amber-400/80 text-amber-300 active:scale-90 transition shadow-lg shadow-amber-900/30 cursor-pointer backdrop-blur"
                  aria-label="EMP Shockwave"
                  title="EMP Pulse (30 Energy)"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span className="text-[9px] font-mono tracking-tight uppercase font-semibold">
                    EMP
                  </span>
                </button>

                {/* Interact / Hack */}
                <button
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onVirtualInteract();
                  }}
                  onClick={onVirtualInteract}
                  className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-400/80 text-cyan-200 active:scale-90 transition shadow-lg shadow-cyan-900/30 cursor-pointer backdrop-blur"
                  aria-label="Interact / Hack"
                  title="Interact / Hack Terminal"
                >
                  <KeyRound className="w-4 h-4" />
                  <span className="text-[9px] font-mono tracking-tight uppercase font-semibold">
                    HACK
                  </span>
                </button>
              </div>

              {/* Primary Combat & Jump Cluster */}
              <div className="flex items-center gap-3">
                {/* Heavy / Power Strike */}
                <button
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onVirtualAttack('heavy');
                  }}
                  onClick={() => onVirtualAttack('heavy')}
                  className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-700 to-rose-600 border-2 border-amber-300 text-white active:scale-90 transition shadow-xl shadow-amber-600/40 cursor-pointer"
                  aria-label="Heavy Power Strike"
                  title="Heavy Cyber Strike"
                >
                  <Flame className="w-5 h-5 fill-current text-amber-200" />
                  <span className="text-[9px] font-mono tracking-widest font-black uppercase mt-0.5">
                    HEAVY
                  </span>
                </button>

                {/* Primary Light Strike / Fight Blade Combo */}
                <button
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onVirtualAttack('light');
                  }}
                  onClick={() => onVirtualAttack('light')}
                  className="relative flex flex-col items-center justify-center w-18 h-18 rounded-2xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-cyan-300 border-2 border-cyan-100 text-slate-950 active:scale-90 transition shadow-2xl shadow-cyan-500/50 cursor-pointer ring-2 ring-cyan-400/40"
                  aria-label="Strike / Fight Attack"
                  title="Cyber Blade Strike (Light)"
                >
                  <Swords className="w-7 h-7 stroke-[2.5]" />
                  <span className="text-[10px] font-mono font-black tracking-widest uppercase mt-0.5">
                    FIGHT
                  </span>
                  {comboCount > 0 && (
                    <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-rose-600 border border-white text-white text-[10px] font-mono font-black rounded-full shadow-md animate-pulse">
                      {comboCount}x
                    </span>
                  )}
                </button>

                {/* Jump Button */}
                <button
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onVirtualJump();
                  }}
                  onClick={onVirtualJump}
                  className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-slate-900/90 border-2 border-cyan-400 text-cyan-300 active:scale-90 transition shadow-xl shadow-cyan-950/50 cursor-pointer backdrop-blur"
                  aria-label="Jump"
                  title="Jump"
                >
                  <ChevronUp className="w-6 h-6 stroke-[3]" />
                  <span className="text-[9px] font-mono tracking-widest uppercase font-bold">
                    JUMP
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
