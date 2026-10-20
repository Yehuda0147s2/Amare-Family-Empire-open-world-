import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialPhysicsState,
  checkBuildingCollision,
  updatePlayerPhysics,
  WALK_SPEED,
  SPRINT_SPEED,
} from './player-controller.ts';
import type { BuildingData } from './types.ts';

test('createInitialPhysicsState sets grounded player with default spawn', () => {
  const state = createInitialPhysicsState(5, 10);
  assert.equal(state.position.x, 5);
  assert.equal(state.position.z, 10);
  assert.equal(state.isGrounded, true);
  assert.equal(state.velocity.y, 0);
});

test('checkBuildingCollision pushes player outside building perimeter', () => {
  const buildings: BuildingData[] = [
    {
      id: 'b1',
      district: 'neon_hab',
      position: { x: 0, y: 10, z: 0 },
      size: { x: 10, y: 20, z: 10 },
      floors: 4,
      color: '#111',
      accentColor: '#0ff',
      isEnterable: false,
      interiorRooms: [],
      hasRooftopAccess: false,
      hasAntenna: false,
    },
  ];

  // Player attempting to penetrate building at x=4.9 (center is 0, extent is ±5)
  const penetratingPos = { x: 4.8, y: 1, z: 0 };
  const corrected = checkBuildingCollision(penetratingPos, buildings, 0.5);

  // Corrected X should be pushed out to at least >= 5.0 + 0.5 = 5.5
  assert.ok(corrected.x >= 5.45, `Expected corrected.x >= 5.45, got ${corrected.x}`);
});

test('updatePlayerPhysics integrates movement and accelerates toward target speed', () => {
  const state = createInitialPhysicsState(0, 0);
  const input = {
    moveX: 0,
    moveZ: 1, // forward
    sprint: false,
    jumpPressed: false,
    jumpHeld: false,
    interactPressed: false,
    empPressed: false,
  };

  // Step physics forward 10 frames
  for (let i = 0; i < 10; i++) {
    updatePlayerPhysics(state, input, [], 0, 0.03);
  }

  // Velocity Z should be positive and approaching WALK_SPEED
  assert.ok(state.velocity.z > 2.0, `Expected velocity.z > 2.0, got ${state.velocity.z}`);
  assert.ok(state.velocity.z <= WALK_SPEED + 0.1);
  assert.ok(state.position.z > 0.5);
});

test('updatePlayerPhysics triggers jump and respects gravity', () => {
  const state = createInitialPhysicsState(0, 0);
  const input = {
    moveX: 0,
    moveZ: 0,
    sprint: false,
    jumpPressed: true,
    jumpHeld: true,
    interactPressed: false,
    empPressed: false,
  };

  const res = updatePlayerPhysics(state, input, [], 0, 0.02);
  assert.equal(res.jumped, true);
  assert.ok(state.velocity.y > 5.0);
  assert.equal(state.isGrounded, false);

  // Advance time to apex and falling phase (t = 0.5s)
  input.jumpPressed = false;
  for (let i = 0; i < 10; i++) {
    updatePlayerPhysics(state, input, [], 0, 0.05);
  }

  // After 0.5s (apex was at ~0.4s), gravity has accelerated player downward
  assert.ok(state.velocity.y < 0, `Expected negative velocity.y while falling, got ${state.velocity.y}`);
  assert.ok(state.position.y > 0, `Expected player still in midair, got ${state.position.y}`);
});

test('updatePlayerPhysics triggers wake and stand-up recovery timer', () => {
  const state = createInitialPhysicsState(0, 0);
  state.isAwake = false;
  state.wakeTimer = 0;

  const input = {
    moveX: 0,
    moveZ: 0,
    sprint: false,
    jumpPressed: false,
    jumpHeld: false,
    interactPressed: false,
    empPressed: false,
    wakePressed: true,
  };

  const res = updatePlayerPhysics(state, input, [], 0, 0.02);
  assert.equal(res.wokeUp, true);
  assert.equal(state.isAwake, true);
  assert.ok(state.wakeTimer > 0);
});

test('updatePlayerPhysics triggers dash burst and accelerates rapidly', () => {
  const state = createInitialPhysicsState(0, 0);
  const input = {
    moveX: 0,
    moveZ: 1,
    sprint: false,
    jumpPressed: false,
    jumpHeld: false,
    interactPressed: false,
    empPressed: false,
    dashPressed: true,
  };

  const res = updatePlayerPhysics(state, input, [], 0, 0.05);
  assert.equal(res.dashed, true);
  assert.equal(state.isDashing, true);
  assert.ok(state.velocity.z > 5.0, `Expected high dash velocity, got ${state.velocity.z}`);
});

test('updatePlayerPhysics triggers light and heavy melee attack states', () => {
  const state = createInitialPhysicsState(0, 0);
  const lightInput = {
    moveX: 0,
    moveZ: 0,
    sprint: false,
    jumpPressed: false,
    jumpHeld: false,
    interactPressed: false,
    empPressed: false,
    attackLightPressed: true,
  };

  const resLight = updatePlayerPhysics(state, lightInput, [], 0, 0.02);
  assert.equal(resLight.attacked, 'light');
  assert.equal(state.isAttacking, true);
  assert.equal(state.attackType, 'light');

  // Advance time past cooldown
  state.attackCooldown = 0;
  state.attackAnimTimer = 0;

  const heavyInput = {
    moveX: 0,
    moveZ: 0,
    sprint: false,
    jumpPressed: false,
    jumpHeld: false,
    interactPressed: false,
    empPressed: false,
    attackHeavyPressed: true,
  };

  const resHeavy = updatePlayerPhysics(state, heavyInput, [], 0, 0.02);
  assert.equal(resHeavy.attacked, 'heavy');
  assert.equal(state.isAttacking, true);
  assert.equal(state.attackType, 'heavy');
});

