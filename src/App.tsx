/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { GameState, PlayerStats, AmareNPCData } from './game/types.ts';
import { sound } from './game/audio.ts';
import { GameCanvas } from './components/GameCanvas.tsx';
import { TitleScreen } from './components/TitleScreen.tsx';
import { HUD } from './components/HUD.tsx';
import { FactoryModal } from './components/FactoryModal.tsx';
import { PauseModal, GameOverModal, VictoryModal } from './components/Modals.tsx';
import { TouchControls } from './components/TouchControls.tsx';
import { AmareDialogueModal } from './components/AmareDialogueModal.tsx';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('title');
  const [isFactoryOpen, setIsFactoryOpen] = useState(false);
  const [activeSeed, setActiveSeed] = useState(42890);
  const [isMuted, setIsMuted] = useState(false);
  const [interactionPrompt, setInteractionPrompt] = useState<string | null>(null);
  const [activeAmareBuff, setActiveAmareBuff] = useState<string | null>(null);
  const [selectedAmareNPC, setSelectedAmareNPC] = useState<AmareNPCData | null>(null);

  const [stats, setStats] = useState<PlayerStats>({
    hp: 100,
    maxHp: 100,
    empEnergy: 100,
    maxEmpEnergy: 100,
    anitaAlertLevel: 0,
    nodesHacked: 0,
    totalNodesRequired: 3,
    terminalsAccessed: 0,
    datashardsCollected: 0,
    score: 0,
    inInterior: false,
    currentBuildingId: null,
    currentFloor: 0,
    activeAmareBuff: null,
    amareBuffTimer: 0,
    combo: 0,
    comboTimer: 0,
    isAwake: true,
    isDodging: false,
    isAttacking: false,
    attackType: null,
    lastCombatFeedback: null,
  });

  // Check URL params for ?autostart=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' || params.get('play') === '1') {
      startGame();
    }
  }, []);

  // Sync state to body dataset for game shell integration and automated verification
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Global keyboard shortcuts (Pause, Mute)
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (gameState === 'playing') {
          setGameState('paused');
          document.exitPointerLock?.();
        } else if (gameState === 'paused') {
          setGameState('playing');
        }
      }
      if (e.code === 'KeyM') {
        handleToggleMute();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [gameState]);

  const startGame = useCallback(() => {
    setGameState('playing');
    document.body.dataset.state = 'playing';
    sound.startAmbientAtmosphere();
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleRestart = useCallback(() => {
    setActiveSeed((prev) => prev + 1);
    setActiveAmareBuff(null);
    setStats({
      hp: 100,
      maxHp: 100,
      empEnergy: 100,
      maxEmpEnergy: 100,
      anitaAlertLevel: 0,
      nodesHacked: 0,
      totalNodesRequired: 3,
      terminalsAccessed: 0,
      datashardsCollected: 0,
      score: 0,
      inInterior: false,
      currentBuildingId: null,
      currentFloor: 0,
      activeAmareBuff: null,
      amareBuffTimer: 0,
      combo: 0,
      comboTimer: 0,
      isAwake: true,
      isDodging: false,
      isAttacking: false,
      attackType: null,
      lastCombatFeedback: null,
    });
    setGameState('playing');
    document.body.dataset.state = 'playing';
  }, []);

  const handleTitle = useCallback(() => {
    setGameState('title');
    document.body.dataset.state = 'title';
    document.exitPointerLock?.();
    sound.stopAmbientAtmosphere();
  }, []);

  const handleStatsUpdate = useCallback((newStats: PlayerStats) => {
    setStats(newStats);
  }, []);

  const handleTriggerGameOver = useCallback(() => {
    setGameState('gameover');
    document.body.dataset.state = 'gameover';
    document.exitPointerLock?.();
    sound.playAlertKlaxon();
  }, []);

  const handleTriggerVictory = useCallback(() => {
    setGameState('victory');
    document.body.dataset.state = 'gameover'; // game shell standard end state
    document.exitPointerLock?.();
    sound.playHackSuccess();
  }, []);

  // Virtual touch input dispatchers
  const handleVirtualMove = useCallback((moveX: number, moveZ: number) => {
    window.dispatchEvent(new CustomEvent('virtual-move', { detail: { moveX, moveZ } }));
  }, []);

  const handleVirtualLook = useCallback((deltaX: number, deltaY: number) => {
    window.dispatchEvent(new CustomEvent('virtual-look', { detail: { deltaX, deltaY } }));
  }, []);

  const handleVirtualSprint = useCallback((sprint: boolean) => {
    window.dispatchEvent(new CustomEvent('virtual-sprint', { detail: { sprint } }));
  }, []);

  const handleVirtualAttack = useCallback((type: 'light' | 'heavy') => {
    window.dispatchEvent(new CustomEvent('virtual-attack', { detail: { type } }));
  }, []);

  const handleVirtualWake = useCallback(() => {
    window.dispatchEvent(new CustomEvent('virtual-wake'));
  }, []);

  const handleVirtualDash = useCallback(() => {
    window.dispatchEvent(new CustomEvent('virtual-dash'));
  }, []);

  const handleVirtualJump = useCallback(() => {
    window.dispatchEvent(new CustomEvent('virtual-jump'));
  }, []);

  const handleVirtualInteract = useCallback(() => {
    window.dispatchEvent(new CustomEvent('virtual-interact'));
  }, []);

  const handleVirtualEmp = useCallback(() => {
    window.dispatchEvent(new CustomEvent('virtual-emp'));
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Simulation Canvas */}
      <GameCanvas
        gameState={gameState}
        onStatsUpdate={handleStatsUpdate}
        onTriggerGameOver={handleTriggerGameOver}
        onTriggerVictory={handleTriggerVictory}
        onInteractionPrompt={setInteractionPrompt}
        onOpenAmareDialogue={(npc) => setSelectedAmareNPC(npc)}
        activeSeed={activeSeed}
        activeAmareBuff={activeAmareBuff}
      />

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          onStart={startGame}
          onOpenFactory={() => setIsFactoryOpen(true)}
        />
      )}

      {/* Active Playing HUD */}
      {gameState === 'playing' && (
        <>
          <HUD
            stats={stats}
            activeAmareBuff={activeAmareBuff}
            interactionPrompt={interactionPrompt}
            onPause={() => {
              setGameState('paused');
              document.exitPointerLock?.();
            }}
            onOpenFactory={() => setIsFactoryOpen(true)}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />
          <TouchControls
            onVirtualMove={handleVirtualMove}
            onVirtualLook={handleVirtualLook}
            onVirtualSprint={handleVirtualSprint}
            onVirtualAttack={handleVirtualAttack}
            onVirtualWake={handleVirtualWake}
            onVirtualDash={handleVirtualDash}
            onVirtualJump={handleVirtualJump}
            onVirtualInteract={handleVirtualInteract}
            onVirtualEmp={handleVirtualEmp}
            comboCount={stats.combo}
            isAwake={stats.isAwake}
          />
        </>
      )}

      {/* Amare Family Narrative Dialogue Modal */}
      <AmareDialogueModal
        npc={selectedAmareNPC}
        onClose={() => setSelectedAmareNPC(null)}
        onReceiveBuff={(buff) => {
          setActiveAmareBuff(buff);
          setStats((prev) => ({ ...prev, activeAmareBuff: buff }));
        }}
      />

      {/* Pause Modal */}
      <PauseModal
        isOpen={gameState === 'paused'}
        onResume={() => setGameState('playing')}
        onRestart={handleRestart}
        onTitle={handleTitle}
        onOpenFactory={() => setIsFactoryOpen(true)}
      />

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={gameState === 'gameover'}
        stats={stats}
        onRestart={handleRestart}
        onTitle={handleTitle}
      />

      {/* Victory Modal */}
      <VictoryModal
        isOpen={gameState === 'victory'}
        stats={stats}
        onPlayAgain={handleRestart}
        onTitle={handleTitle}
        onOpenFactory={() => setIsFactoryOpen(true)}
      />

      {/* Autonomous 3D World Factory & Architecture Panel */}
      <FactoryModal
        isOpen={isFactoryOpen}
        onClose={() => setIsFactoryOpen(false)}
        activeSeed={activeSeed}
        onApplySeed={(newSeed) => setActiveSeed(newSeed)}
        onPlayNow={() => {
          setIsFactoryOpen(false);
          startGame();
        }}
      />
    </div>
  );
}
