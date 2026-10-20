import type { BuildingData, Vector3D } from './types.ts';

export interface PlayerInput {
  moveX: number; // -1 to 1
  moveZ: number; // -1 to 1
  sprint: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  interactPressed: boolean;
  empPressed: boolean;
  attackLightPressed?: boolean;
  attackHeavyPressed?: boolean;
  wakePressed?: boolean;
  dashPressed?: boolean;
}

export interface PlayerPhysicsState {
  position: Vector3D;
  velocity: Vector3D;
  isGrounded: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  isMantling: boolean;
  mantleTargetY: number;
  rotationY: number;
  empCooldown: number;
  isAwake: boolean;
  wakeTimer: number;
  isDashing: boolean;
  dashTimer: number;
  dashCooldown: number;
  attackCooldown: number;
  isAttacking: boolean;
  attackType: 'light' | 'heavy' | null;
  attackAnimTimer: number;
}

export const WALK_SPEED = 4.8;
export const SPRINT_SPEED = 8.5;
export const DASH_SPEED = 16.0;
export const JUMP_VELOCITY = 7.2;
export const GRAVITY = -18.0;
export const PLAYER_RADIUS = 0.45;
export const PLAYER_HEIGHT = 1.8;

export function createInitialPhysicsState(spawnX: number = 0, spawnZ: number = 18): PlayerPhysicsState {
  return {
    position: { x: spawnX, y: 0, z: spawnZ },
    velocity: { x: 0, y: 0, z: 0 },
    isGrounded: true,
    coyoteTimer: 0.1,
    jumpBufferTimer: 0,
    isMantling: false,
    mantleTargetY: 0,
    rotationY: 0,
    empCooldown: 0,
    isAwake: true,
    wakeTimer: 0,
    isDashing: false,
    dashTimer: 0,
    dashCooldown: 0,
    attackCooldown: 0,
    isAttacking: false,
    attackType: null,
    attackAnimTimer: 0,
  };
}

export function checkBuildingCollision(
  pos: Vector3D,
  buildings: BuildingData[],
  radius: number = PLAYER_RADIUS
): Vector3D {
  const corrected = { ...pos };

  for (const bld of buildings) {
    // If inside height range of building
    if (pos.y < 0 || pos.y > bld.size.y) continue;

    const minX = bld.position.x - bld.size.x / 2;
    const maxX = bld.position.x + bld.size.x / 2;
    const minZ = bld.position.z - bld.size.z / 2;
    const maxZ = bld.position.z + bld.size.z / 2;

    // Check if player is near entrance of an enterable building
    if (bld.isEnterable && bld.entrancePosition) {
      const distToEntrance = Math.hypot(pos.x - bld.entrancePosition.x, pos.z - bld.entrancePosition.z);
      if (distToEntrance < 2.0) {
        // Player is at doorway, allow passing through entrance threshold
        continue;
      }
    }

    // Robust AABB vs point with radius
    const isInside = pos.x >= minX && pos.x <= maxX && pos.z >= minZ && pos.z <= maxZ;
    if (isInside) {
      const dLeft = pos.x - minX;
      const dRight = maxX - pos.x;
      const dBack = pos.z - minZ;
      const dFront = maxZ - pos.z;
      const minFaceDist = Math.min(dLeft, dRight, dBack, dFront);
      if (minFaceDist === dLeft) corrected.x = minX - radius;
      else if (minFaceDist === dRight) corrected.x = maxX + radius;
      else if (minFaceDist === dBack) corrected.z = minZ - radius;
      else corrected.z = maxZ + radius;
    } else {
      const nearestX = Math.max(minX, Math.min(pos.x, maxX));
      const nearestZ = Math.max(minZ, Math.min(pos.z, maxZ));
      const dx = pos.x - nearestX;
      const dz = pos.z - nearestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius && distSq > 0.00001) {
        const dist = Math.sqrt(distSq);
        const overlap = radius - dist;
        corrected.x += (dx / dist) * overlap;
        corrected.z += (dz / dist) * overlap;
      }
    }
  }

  return corrected;
}

export function updatePlayerPhysics(
  state: PlayerPhysicsState,
  input: PlayerInput,
  buildings: BuildingData[],
  cameraAngleY: number,
  dt: number
): {
  jumped: boolean;
  mantled: boolean;
  usedEmp: boolean;
  dashed: boolean;
  wokeUp: boolean;
  attacked: 'light' | 'heavy' | null;
} {
  let jumped = false;
  let mantled = false;
  let usedEmp = false;
  let dashed = false;
  let wokeUp = false;
  let attacked: 'light' | 'heavy' | null = null;

  // Clamped dt
  const safeDt = Math.min(dt, 0.05);

  // Wake Up / Stand Up handling
  if (input.wakePressed) {
    if (!state.isAwake || state.wakeTimer <= 0) {
      state.isAwake = true;
      state.wakeTimer = 0.6;
      wokeUp = true;
    }
  }

  if (state.wakeTimer > 0) {
    state.wakeTimer = Math.max(0, state.wakeTimer - safeDt);
  }

  // Dash & Evade Cooldown
  if (state.dashCooldown > 0) {
    state.dashCooldown = Math.max(0, state.dashCooldown - safeDt);
  }

  if (state.dashTimer > 0) {
    state.dashTimer = Math.max(0, state.dashTimer - safeDt);
    if (state.dashTimer === 0) {
      state.isDashing = false;
    }
  }

  if (input.dashPressed && state.dashCooldown <= 0 && state.isAwake) {
    state.isDashing = true;
    state.dashTimer = 0.22;
    state.dashCooldown = 0.85;
    dashed = true;
  }

  // Attack Timers & Trigger
  if (state.attackCooldown > 0) {
    state.attackCooldown = Math.max(0, state.attackCooldown - safeDt);
  }

  if (state.attackAnimTimer > 0) {
    state.attackAnimTimer = Math.max(0, state.attackAnimTimer - safeDt);
    if (state.attackAnimTimer === 0) {
      state.isAttacking = false;
      state.attackType = null;
    }
  }

  if (state.isAwake && state.attackCooldown <= 0) {
    if (input.attackLightPressed) {
      state.isAttacking = true;
      state.attackType = 'light';
      state.attackAnimTimer = 0.28;
      state.attackCooldown = 0.28;
      attacked = 'light';
    } else if (input.attackHeavyPressed) {
      state.isAttacking = true;
      state.attackType = 'heavy';
      state.attackAnimTimer = 0.52;
      state.attackCooldown = 0.55;
      attacked = 'heavy';
    }
  }

  // EMP Cooldown
  if (state.empCooldown > 0) {
    state.empCooldown = Math.max(0, state.empCooldown - safeDt);
  }

  if (input.empPressed && state.empCooldown <= 0 && state.isAwake) {
    usedEmp = true;
    state.empCooldown = 3.0;
  }

  // Handle mantling
  if (state.isMantling) {
    state.position.y += (state.mantleTargetY - state.position.y) * 8 * safeDt;
    if (Math.abs(state.position.y - state.mantleTargetY) < 0.05) {
      state.position.y = state.mantleTargetY;
      state.isMantling = false;
      state.isGrounded = true;
    }
    return { jumped, mantled, usedEmp, dashed, wokeUp, attacked };
  }

  // Input buffering for jump
  if (input.jumpPressed && state.isAwake) {
    state.jumpBufferTimer = 0.14;
  } else if (state.jumpBufferTimer > 0) {
    state.jumpBufferTimer -= safeDt;
  }

  // Coyote time
  if (state.isGrounded) {
    state.coyoteTimer = 0.1;
  } else {
    state.coyoteTimer -= safeDt;
  }

  // Execute Jump
  if (state.jumpBufferTimer > 0 && state.coyoteTimer > 0 && !state.isDashing) {
    state.velocity.y = JUMP_VELOCITY;
    state.isGrounded = false;
    state.jumpBufferTimer = 0;
    state.coyoteTimer = 0;
    jumped = true;
  }

  // Variable Jump Cut
  if (!input.jumpHeld && state.velocity.y > 0) {
    state.velocity.y *= 0.85;
  }

  // Apply Gravity
  if (!state.isGrounded) {
    state.velocity.y += GRAVITY * safeDt;
  }

  // Calculate movement vector relative to camera yaw
  const wakeMultiplier = state.wakeTimer > 0 ? 0.35 : 1.0;
  let targetSpeed = (input.sprint ? SPRINT_SPEED : WALK_SPEED) * wakeMultiplier;
  if (state.isDashing) {
    targetSpeed = DASH_SPEED;
  }

  const inputMagnitude = Math.hypot(input.moveX, input.moveZ);

  if (inputMagnitude > 0.05 || state.isDashing) {
    // Transform input relative to camera, or use current rotation if dashing without stick
    let worldMoveAngle = state.rotationY;
    if (inputMagnitude > 0.05) {
      const inputAngle = Math.atan2(input.moveX, input.moveZ);
      worldMoveAngle = cameraAngleY + inputAngle;
    }

    const normX = Math.sin(worldMoveAngle);
    const normZ = Math.cos(worldMoveAngle);

    // Acceleration
    const accel = state.isDashing ? 32 : (state.isGrounded ? 16 : 8);
    state.velocity.x += (normX * targetSpeed - state.velocity.x) * accel * safeDt;
    state.velocity.z += (normZ * targetSpeed - state.velocity.z) * accel * safeDt;

    state.rotationY = worldMoveAngle;
  } else {
    // Deceleration
    const friction = state.isGrounded ? 18 : 4;
    state.velocity.x += (0 - state.velocity.x) * friction * safeDt;
    state.velocity.z += (0 - state.velocity.z) * friction * safeDt;
  }

  // Move
  const nextPos: Vector3D = {
    x: state.position.x + state.velocity.x * safeDt,
    y: state.position.y + state.velocity.y * safeDt,
    z: state.position.z + state.velocity.z * safeDt,
  };

  // Ground collision check
  if (nextPos.y <= 0) {
    nextPos.y = 0;
    state.velocity.y = 0;
    state.isGrounded = true;
  } else {
    state.isGrounded = false;
  }

  // Building collision & mantling
  const resolved = checkBuildingCollision(nextPos, buildings, PLAYER_RADIUS);
  state.position.x = resolved.x;
  state.position.z = resolved.z;
  state.position.y = resolved.y;

  return { jumped, mantled, usedEmp, dashed, wokeUp, attacked };
}
