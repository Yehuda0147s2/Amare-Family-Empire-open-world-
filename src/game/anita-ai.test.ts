import test from 'node:test';
import assert from 'node:assert/strict';
import { canDroneSeePlayer, updateDrone, applyEMPEffect, calculateGlobalAlert } from './anita-ai.ts';
import type { AnitaDrone, AnitaTurret } from './types.ts';

test('canDroneSeePlayer evaluates distance and FOV angle accurately', () => {
  const dronePos = { x: 0, y: 5, z: 0 };
  const droneAngle = 0; // facing +X axis

  // Player in front within range
  const playerInFront = { x: 10, y: 0, z: 0 };
  assert.equal(canDroneSeePlayer(dronePos, droneAngle, playerInFront, 20, Math.PI / 3), true);

  // Player behind drone
  const playerBehind = { x: -10, y: 0, z: 0 };
  assert.equal(canDroneSeePlayer(dronePos, droneAngle, playerBehind, 20, Math.PI / 3), false);

  // Player too far away
  const playerTooFar = { x: 50, y: 0, z: 0 };
  assert.equal(canDroneSeePlayer(dronePos, droneAngle, playerTooFar, 20, Math.PI / 3), false);
});

test('updateDrone increments detection when player is seen and transitions to alert', () => {
  const drone: AnitaDrone = {
    id: 'test_drone',
    position: { x: 0, y: 3, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    patrolCenter: { x: 0, y: 3, z: 0 },
    patrolRadius: 10,
    angle: 0,
    state: 'patrol',
    detectionProgress: 0,
    disabledTimer: 0,
    spotlightAngle: Math.PI / 2, // facing +Z
    health: 100,
  };

  const playerPos = { x: 10, y: 0, z: 6 }; // Directly in front of spotlight (+Z)

  // Update drone multiple times while seeing player
  let alertTriggered = false;
  for (let i = 0; i < 20; i++) {
    const res = updateDrone(drone, playerPos, false, 0.1);
    if (res.triggeredAlert) {
      alertTriggered = true;
      break;
    }
  }

  assert.equal(alertTriggered, true);
  assert.equal(drone.state, 'alert');
});

test('applyEMPEffect stuns nearby drones and turrets for specified duration', () => {
  const drones: AnitaDrone[] = [
    {
      id: 'd1',
      position: { x: 2, y: 2, z: 2 },
      velocity: { x: 0, y: 0, z: 0 },
      patrolCenter: { x: 0, y: 0, z: 0 },
      patrolRadius: 5,
      angle: 0,
      state: 'patrol',
      detectionProgress: 0.5,
      disabledTimer: 0,
      spotlightAngle: 0,
      health: 100,
    },
    {
      id: 'd2',
      position: { x: 50, y: 2, z: 50 }, // far away
      velocity: { x: 0, y: 0, z: 0 },
      patrolCenter: { x: 50, y: 0, z: 50 },
      patrolRadius: 5,
      angle: 0,
      state: 'patrol',
      detectionProgress: 0,
      disabledTimer: 0,
      spotlightAngle: 0,
      health: 100,
    },
  ];

  const turrets: AnitaTurret[] = [
    {
      id: 't1',
      position: { x: 1, y: 0, z: 1 },
      rotationY: 0,
      range: 15,
      active: true,
      hacked: false,
      aimAngle: 0,
      telegraphTimer: 0,
      cooldownTimer: 0,
    },
  ];

  const res = applyEMPEffect(drones, turrets, { x: 0, y: 0, z: 0 }, 10, 6.0);
  assert.equal(res.dronesStunned, 1);
  assert.equal(res.turretsStunned, 1);
  assert.equal(drones[0].state, 'disabled');
  assert.equal(drones[0].disabledTimer, 6.0);
  assert.equal(drones[1].state, 'patrol'); // unaffected
  assert.equal(turrets[0].active, false);
});

test('calculateGlobalAlert rises with active alerts and decays over time', () => {
  const risen = calculateGlobalAlert(20, 2, 1.0);
  assert.equal(risen, 50); // 20 + 2*15*1

  const decayed = calculateGlobalAlert(50, 0, 2.0);
  assert.equal(decayed, 42); // 50 - 4*2
});
