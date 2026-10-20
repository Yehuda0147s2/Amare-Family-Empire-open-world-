import type { AnitaDrone, AnitaTurret, Vector3D } from './types.ts';

export interface CombatResult {
  hitDroneIds: string[];
  totalDamageDealt: number;
  destroyedDroneIds: string[];
  hitTurretIds?: string[];
  destroyedTurretIds?: string[];
  isCrit: boolean;
  newCombo: number;
  damage: number;
}

export function isTargetInMeleeArc(
  attackerPos: Vector3D,
  attackerYaw: number,
  targetPos: Vector3D,
  range: number = 3.6,
  arcAngle: number = Math.PI * 0.75 // 135 degrees arc
): boolean {
  const dx = targetPos.x - attackerPos.x;
  const dz = targetPos.z - attackerPos.z;
  const dist = Math.hypot(dx, dz);

  if (dist > range) return false;

  // Attacker forward vector: dx = sin(yaw), dz = cos(yaw)
  const angleToTarget = Math.atan2(dx, dz);
  let diff = angleToTarget - attackerYaw;

  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  return Math.abs(diff) <= arcAngle / 2;
}

export function calculateCombatDamage(
  attackType: 'light' | 'heavy',
  combo: number,
  activeBuff: string | null
): { damage: number; isCrit: boolean } {
  const isHeavy = attackType === 'heavy';
  const baseDamage = isHeavy ? 65 : 35;

  // Combo multiplier: up to 2.0x at 10 hits
  const comboMultiplier = 1.0 + Math.min(1.0, combo * 0.1);

  // Amare family buffs
  let buffMultiplier = 1.0;
  if (activeBuff === 'Lioness Vigor') {
    buffMultiplier = 1.4; // Liya's combat strength
  } else if (activeBuff === 'Harmonic Unity') {
    buffMultiplier = 1.28; // Mangesha 70% of Liya
  }

  // 25% critical strike chance
  const isCrit = Math.random() < 0.25;
  const critMultiplier = isCrit ? 1.75 : 1.0;

  const damage = Math.round(baseDamage * comboMultiplier * buffMultiplier * critMultiplier);
  return { damage, isCrit };
}

export function executeMeleeStrike(
  attackerPos: Vector3D,
  attackerYaw: number,
  attackType: 'light' | 'heavy',
  drones: AnitaDrone[],
  activeBuff: string | null,
  currentCombo: number,
  turrets: AnitaTurret[] = []
): CombatResult {
  const range = attackType === 'heavy' ? 4.5 : 3.4;
  const arc = attackType === 'heavy' ? Math.PI : Math.PI * 0.75;
  const { damage, isCrit } = calculateCombatDamage(attackType, currentCombo, activeBuff);

  const hitDroneIds: string[] = [];
  const destroyedDroneIds: string[] = [];
  const hitTurretIds: string[] = [];
  const destroyedTurretIds: string[] = [];
  let totalDamageDealt = 0;

  for (const drone of drones) {
    if (drone.health <= 0) continue;

    if (isTargetInMeleeArc(attackerPos, attackerYaw, drone.position, range, arc)) {
      drone.health = Math.max(0, drone.health - damage);
      hitDroneIds.push(drone.id);
      totalDamageDealt += damage;

      if (drone.health <= 0) {
        drone.state = 'disabled';
        destroyedDroneIds.push(drone.id);
      }
    }
  }

  for (const turret of turrets) {
    if (!turret.active) continue;
    if (turret.health !== undefined && turret.health <= 0) continue;

    if (isTargetInMeleeArc(attackerPos, attackerYaw, turret.position, range, arc)) {
      if (turret.health === undefined) turret.health = 120;
      turret.health = Math.max(0, turret.health - damage);
      hitTurretIds.push(turret.id);
      totalDamageDealt += damage;

      if (turret.health <= 0) {
        turret.active = false;
        destroyedTurretIds.push(turret.id);
      }
    }
  }

  const hits = hitDroneIds.length + hitTurretIds.length;
  const newCombo = hits > 0 ? currentCombo + hits : currentCombo;

  return {
    hitDroneIds,
    totalDamageDealt,
    destroyedDroneIds,
    hitTurretIds,
    destroyedTurretIds,
    isCrit,
    newCombo,
    damage,
  };
}
