import type { AmareCharacterId, AmareNPCData } from './types.ts';

export const AMARE_FAMILY: Record<AmareCharacterId, AmareNPCData> = {
  tesfaye: {
    id: 'tesfaye',
    name: 'Tesfaye Amare',
    epithet: 'Hope',
    role: 'Patriarch & Strategic Guide',
    lore: 'The wise, resilient guiding hand of the resistance. When Anita rewrote the laws of probability to extinguish human will, Tesfaye preserved the flame of hope.',
    dialogue: [
      'Steady your pulse, Kaelen. Anita calculations account for every physical law—except human resilience.',
      'A spark held in the dark is more powerful than an entire citadel of synthetic light.',
      'Take our legacy with you. Let the Amare unity guide your steps.',
    ],
    buffName: 'Unwavering Hope',
    buffDescription: 'Max HP increased by 25 and passive health regeneration enabled.',
    color: '#38bdf8',
    position: { x: 0, y: 0, z: 28 }, // Near initial spawn
    sanctuaryName: 'Sanctuary of the First Dawn',
  },
  selam: {
    id: 'selam',
    name: 'Selam Amare',
    epithet: 'Peace',
    role: 'Spiritual Healer & Balance Keeper',
    lore: 'Radiating warmth, balance, and emotional strength. Selam stabilizes the chaotic digital distortions emitted by Anita sub-cores.',
    dialogue: [
      'Breathe, operative. Violence is Anita language; our mission is restoration.',
      'My barrier calms the electronic static around you. The city will feel quieter now.',
    ],
    buffName: 'Serenity Aegis',
    buffDescription: 'Anita surveillance detection rate reduced by 60%.',
    color: '#34d399',
    position: { x: 25, y: 0, z: 25 },
    sanctuaryName: 'Neon Haven Oasis',
  },
  liya: {
    id: 'liya',
    name: 'Liya Amare',
    epithet: 'The Lioness',
    role: 'Frontline Vanguard & Protector',
    lore: 'Eldest sister, fearless leader, and frontline protector. Liya wields dual ion blades and defends the perimeter from Anita enforcer units.',
    dialogue: [
      'No retreat, Kaelen! Anita turrets are calibrated for cowards. Move fast, strike hard!',
      'When you breach that mainframe, make sure Anita algorithms scream.',
    ],
    buffName: 'Lioness Vigor',
    buffDescription: 'Sprint speed boosted by 30% and jumping height increased.',
    color: '#f43f5e',
    position: { x: -25, y: 0, z: 20 },
    sanctuaryName: 'Forward Defense Redoubt',
  },
  yonatan: {
    id: 'yonatan',
    name: 'Yonatan Amare',
    epithet: 'The Seer of Time',
    role: 'Temporal Chronomancer',
    lore: 'Sees the past, the living present, and glimpses of Anita projected futures. He perceives surveillance sweeps before they occur.',
    dialogue: [
      'I saw you step into this doorway twelve seconds ago in a branching timeline.',
      'The drones will rotate their radar arrays counter-clockwise. Strike during the optical lull.',
    ],
    buffName: 'Temporal Foresight',
    buffDescription: 'Drone patrol vectors and turret telegraphs reveal 3 seconds earlier.',
    color: '#818cf8',
    position: { x: 22, y: 0, z: -25 },
    sanctuaryName: 'Chrono-Observation Spire',
  },
  malak: {
    id: 'malak',
    name: 'Malak Amare',
    epithet: 'The Spiritual Force',
    role: 'Shield Bearer & Guardian',
    lore: 'Combines steadfast spiritual faith with immense physical fortitude. Malak can withstand Anita seismic shockwaves without flinching.',
    dialogue: [
      'Steel and silicon have no soul. Stand firm upon the ground—their logic cannot displace us.',
      'Let my shield reinforce your cybernetic armor.',
    ],
    buffName: 'Spiritual Bastion',
    buffDescription: 'Absorbs the next 3 direct turret laser strikes without damage.',
    color: '#fbbf24',
    position: { x: -28, y: 0, z: -22 },
    sanctuaryName: 'Pillar of the Stalwart',
  },
  kalev: {
    id: 'kalev',
    name: 'Kalev Amare',
    epithet: 'Willpower & Friendship',
    role: 'Network Liaison & Morale Anchor',
    lore: 'The social connector and fiercely loyal friend. Kalev unites isolated rebel cells across all four megacity districts.',
    dialogue: [
      'You are never fighting alone out here. The underground cells are cheering every byte you wipe!',
      'Here, take this frequency patch. It connects our network directly to your wrist HUD.',
    ],
    buffName: 'Solidarity Link',
    buffDescription: 'Datashard and node hacking score bonuses doubled.',
    color: '#f97316',
    position: { x: 0, y: 0, z: -35 },
    sanctuaryName: 'Underground Comm Station',
  },
  natan: {
    id: 'natan',
    name: 'Natan Amare',
    epithet: 'Master of Technology',
    role: 'Chief Engineer & EMP Specialist',
    lore: 'Inventor and technical genius. Natan reverse-engineered Anita encryption protocols and created the prototype wrist EMP tool.',
    dialogue: [
      'Watch the emitter coils on your wrist, Kaelen! I overclocked the harmonics to burn Anita neural nets.',
      'Every Anita drone has a secondary feedback loop. Pulse the EMP when they enter scanner lock.',
    ],
    buffName: 'Overclocked EMP',
    buffDescription: 'EMP recharge rate doubled and stun duration extended to 12 seconds.',
    color: '#06b6d4',
    position: { x: -35, y: 0, z: 0 },
    sanctuaryName: 'Sub-Grid Workshop Lab',
  },
  mangesha: {
    id: 'mangesha',
    name: 'Mangesha Amare',
    epithet: 'The Bridge of Unity',
    role: 'Resonance Channeler & Harmonizer',
    lore: 'Can channel 70% of his siblings abilities simultaneously, harmonizing the Amare bloodline resonance into a singular devastating frequency.',
    dialogue: [
      'I feel Liya strength, Natan spark, and Yonatan sight flowing together.',
      'When all the siblings stand united, Anita altered reality collapses back into truth.',
    ],
    buffName: 'Harmonic Unity',
    buffDescription: 'All passive Amare sibling benefits active at 70% power.',
    color: '#c084fc',
    position: { x: 35, y: 0, z: 0 },
    sanctuaryName: 'Sanctuary of Convergence',
  },
  hannah: {
    id: 'hannah',
    name: 'Hannah Amare',
    epithet: 'The Hidden Future',
    role: 'Youngest Prodigy & Quantum Conduit',
    lore: 'The youngest sister with mysterious latent potential. Her presence causes Anita quantum probability sensors to malfunction.',
    dialogue: [
      'Anita thinks she calculated every ending. But she didn’t see me... or you.',
      'Look behind the ventilation shafts. The city has secrets Anita tried to delete.',
    ],
    buffName: 'Quantum Anomaly',
    buffDescription: 'Reveals hidden datashards and bypasses all blast door locks automatically.',
    color: '#e879f9',
    position: { x: 0, y: 0, z: -15 },
    sanctuaryName: 'The Hidden Cache',
  },
};

export const AMARE_LIST = Object.values(AMARE_FAMILY);

export function findNearestAmareNPC(
  playerPos: { x: number; y: number; z: number },
  maxDist: number = 3.5
): AmareNPCData | null {
  let nearest: AmareNPCData | null = null;
  let minDist = maxDist;

  for (const npc of AMARE_LIST) {
    const dist = Math.hypot(playerPos.x - npc.position.x, playerPos.z - npc.position.z);
    if (dist < minDist) {
      minDist = dist;
      nearest = npc;
    }
  }

  return nearest;
}
