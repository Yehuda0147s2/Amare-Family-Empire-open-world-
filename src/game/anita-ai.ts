import type { AnitaDrone, AnitaTurret, Vector3D } from './types.ts';

export const DRONE_VISION_RANGE = 18;
export const DRONE_VISION_FOV = (Math.PI / 3); // 60 degrees
export const DRONE_PATROL_SPEED = 0.8;
export const DRONE_ALERT_SPEED = 2.4;

export function distance3D(a: Vector3D, b: Vector3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function distance2D(a: Vector3D, b: Vector3D): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function canDroneSeePlayer(
  dronePos: Vector3D,
  droneAngle: number,
  playerPos: Vector3D,
  visionRange: number = DRONE_VISION_RANGE,
  fov: number = DRONE_VISION_FOV
): boolean {
  const dist = distance3D(dronePos, playerPos);
  if (dist > visionRange) return false;

  // Vector from drone to player in horizontal plane
  const dx = playerPos.x - dronePos.x;
  const dz = playerPos.z - dronePos.z;
  const angleToPlayer = Math.atan2(dz, dx);

  // Normalize angle difference to [-PI, PI]
  let diff = angleToPlayer - droneAngle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  return Math.abs(diff) <= fov / 2;
}

export function updateDrone(
  drone: AnitaDrone,
  playerPos: Vector3D,
  isPlayerHidden: boolean,
  dt: number
): { detectedPlayer: boolean; triggeredAlert: boolean } {
  if (drone.state === 'disabled') {
    drone.disabledTimer -= dt;
    if (drone.disabledTimer <= 0) {
      drone.state = 'patrol';
      drone.disabledTimer = 0;
    }
    return { detectedPlayer: false, triggeredAlert: false };
  }

  // Patrol movement: circular around patrolCenter
  if (drone.state === 'patrol') {
    drone.angle += DRONE_PATROL_SPEED * 0.5 * dt;
    drone.position.x = drone.patrolCenter.x + Math.cos(drone.angle) * drone.patrolRadius;
    drone.position.z = drone.patrolCenter.z + Math.sin(drone.angle) * drone.patrolRadius;
    drone.spotlightAngle = drone.angle + Math.PI / 2;

    const sees = !isPlayerHidden && canDroneSeePlayer(drone.position, drone.spotlightAngle, playerPos);
    if (sees) {
      drone.detectionProgress = Math.min(1.0, drone.detectionProgress + dt * 1.5);
      if (drone.detectionProgress >= 1.0) {
        drone.state = 'alert';
        return { detectedPlayer: true, triggeredAlert: true };
      }
      return { detectedPlayer: true, triggeredAlert: false };
    } else {
      drone.detectionProgress = Math.max(0.0, drone.detectionProgress - dt * 0.8);
      return { detectedPlayer: false, triggeredAlert: false };
    }
  }

  // Alert state: moves toward player
  if (drone.state === 'alert') {
    const dist = distance2D(drone.position, playerPos);
    if (dist > 3) {
      const dx = (playerPos.x - drone.position.x) / dist;
      const dz = (playerPos.z - drone.position.z) / dist;
      drone.position.x += dx * DRONE_ALERT_SPEED * dt;
      drone.position.z += dz * DRONE_ALERT_SPEED * dt;
      drone.spotlightAngle = Math.atan2(dz, dx);
    }

    // Still in sight?
    const sees = !isPlayerHidden && distance3D(drone.position, playerPos) < DRONE_VISION_RANGE * 1.5;
    if (!sees) {
      drone.detectionProgress = Math.max(0, drone.detectionProgress - dt * 0.3);
      if (drone.detectionProgress <= 0) {
        drone.state = 'patrol';
      }
    }
    return { detectedPlayer: true, triggeredAlert: false };
  }

  return { detectedPlayer: false, triggeredAlert: false };
}

export function applyEMPEffect(
  drones: AnitaDrone[],
  turrets: AnitaTurret[],
  centerPos: Vector3D,
  radius: number = 18,
  duration: number = 7.0
): { dronesStunned: number; turretsStunned: number } {
  let dronesStunned = 0;
  let turretsStunned = 0;

  for (const drone of drones) {
    if (distance3D(drone.position, centerPos) <= radius) {
      drone.state = 'disabled';
      drone.disabledTimer = duration;
      drone.detectionProgress = 0;
      dronesStunned++;
    }
  }

  for (const turret of turrets) {
    if (distance3D(turret.position, centerPos) <= radius) {
      turret.active = false;
      turretsStunned++;
    }
  }

  return { dronesStunned, turretsStunned };
}

export function calculateGlobalAlert(
  currentAlert: number,
  activeAlertDrones: number,
  dt: number
): number {
  if (activeAlertDrones > 0) {
    return Math.min(100, currentAlert + activeAlertDrones * 15 * dt);
  } else {
    // Decays gradually
    return Math.max(0, currentAlert - 4 * dt);
  }
}
