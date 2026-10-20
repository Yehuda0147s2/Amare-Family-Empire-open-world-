import test from 'node:test';
import assert from 'node:assert/strict';
import { isTargetInMeleeArc, calculateCombatDamage, executeMeleeStrike } from './combat.ts';
import type { AnitaDrone } from './types.ts';

test('isTargetInMeleeArc accurately recognizes targets within frontal arc and range', () => {
  const playerPos = { x: 0, y: 0, z: 0 };
  const playerYaw = 0; // facing +Z axis (dx=0, dz>0)

  // Directly ahead within 3m
  assert.equal(isTargetInMeleeArc(playerPos, playerYaw, { x: 0, y: 0, z: 2 }, 3.5), true);

  // Directly behind (negative Z)
  assert.equal(isTargetInMeleeArc(playerPos, playerYaw, { x: 0, y: 0, z: -2 }, 3.5), false);

  // Directly ahead but too far (10m)
  assert.equal(isTargetInMeleeArc(playerPos, playerYaw, { x: 0, y: 0, z: 10 }, 3.5), false);
});

test('calculateCombatDamage scales with heavy attack and Liya Lioness Vigor buff', () => {
  const light = calculateCombatDamage('light', 0, null);
  const heavy = calculateCombatDamage('heavy', 0, null);

  assert.ok(heavy.damage > light.damage, 'Heavy attack should deal more damage than light');

  const buffed = calculateCombatDamage('light', 0, 'Lioness Vigor');
  // Base light 35 * 1.4 = 49 (or crit)
  assert.ok(buffed.damage >= 45, 'Lioness vigor should apply 40% damage buff');
});

test('executeMeleeStrike damages drones in arc and increments combo', () => {
  const drones: AnitaDrone[] = [
    {
      id: 'target_drone_1',
      position: { x: 0, y: 1.5, z: 2.2 },
      velocity: { x: 0, y: 0, z: 0 },
      patrolCenter: { x: 0, y: 1.5, z: 2.2 },
      patrolRadius: 5,
      angle: 0,
      state: 'patrol',
      detectionProgress: 0,
      disabledTimer: 0,
      spotlightAngle: 0,
      health: 100,
    },
    {
      id: 'far_drone_2',
      position: { x: 50, y: 1.5, z: 50 },
      velocity: { x: 0, y: 0, z: 0 },
      patrolCenter: { x: 50, y: 1.5, z: 50 },
      patrolRadius: 5,
      angle: 0,
      state: 'patrol',
      detectionProgress: 0,
      disabledTimer: 0,
      spotlightAngle: 0,
      health: 100,
    },
  ];

  const res = executeMeleeStrike({ x: 0, y: 0, z: 0 }, 0, 'light', drones, null, 0);
  assert.equal(res.hitDroneIds.length, 1);
  assert.equal(res.hitDroneIds[0], 'target_drone_1');
  assert.equal(res.newCombo, 1);
  assert.ok(drones[0].health < 100, 'Target drone should take damage');
  assert.equal(drones[1].health, 100, 'Far drone should remain unharmed');
});

test('executeMeleeStrike damages and can disable active Anita turrets', () => {
  const turrets = [
    {
      id: 'turret_1',
      position: { x: 0, y: 0, z: 2 },
      rotationY: 0,
      range: 15,
      active: true,
      hacked: false,
      aimAngle: 0,
      telegraphTimer: 0,
      cooldownTimer: 0,
      health: 50,
      maxHealth: 100,
    },
  ];

  const res = executeMeleeStrike({ x: 0, y: 0, z: 0 }, 0, 'heavy', [], null, 0, turrets);
  assert.equal(res.hitTurretIds?.length, 1);
  assert.ok(res.damage >= 50);
  assert.equal(turrets[0].active, false, 'Turret should be disabled when health reaches 0');
});
