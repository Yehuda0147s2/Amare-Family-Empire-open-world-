import type { BuildingData, CityChunk, DistrictTheme, InteriorFurniture, InteriorRoom, Vector3D } from './types.ts';

// Simple deterministic Mulberry32 PRNG
export function createPRNG(seed: number) {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const CHUNK_SIZE = 70; // 70 meters per chunk
export const ROAD_WIDTH = 10;

export function getDistrictForChunk(chunkX: number, chunkZ: number): DistrictTheme {
  const dist = Math.sqrt(chunkX * chunkX + chunkZ * chunkZ);
  if (dist <= 0.8) return 'citadel_core'; // Central Anita Citadel
  if (chunkX > 0 && chunkZ >= 0) return 'neon_hab';
  if (chunkX <= 0 && chunkZ > 0) return 'industrial_grid';
  return 'underground_slum';
}

export function generateChunk(chunkX: number, chunkZ: number, baseSeed: number = 42): CityChunk {
  const chunkSeed = (baseSeed * 73856093) ^ (chunkX * 19349663) ^ (chunkZ * 83492791);
  const rng = createPRNG(chunkSeed);
  const district = getDistrictForChunk(chunkX, chunkZ);

  const originX = chunkX * CHUNK_SIZE;
  const originZ = chunkZ * CHUNK_SIZE;

  // District color schemes
  const districtPalettes: Record<DistrictTheme, { walls: string[]; accents: string[] }> = {
    citadel_core: {
      walls: ['#1e293b', '#0f172a', '#334155'],
      accents: ['#ef4444', '#dc2626', '#f87171'], // Anita Red
    },
    neon_hab: {
      walls: ['#18181b', '#27272a', '#1e1b4b'],
      accents: ['#06b6d4', '#ec4899', '#a855f7'], // Cyber Cyan/Magenta
    },
    industrial_grid: {
      walls: ['#292524', '#44403c', '#1c1917'],
      accents: ['#f59e0b', '#d97706', '#fbbf24'], // Warning Amber
    },
    underground_slum: {
      walls: ['#172554', '#1e293b', '#111827'],
      accents: ['#10b981', '#14b8a6', '#06b6d4'], // Bio-luminescent Emerald
    },
  };

  const palette = districtPalettes[district];

  // Roads crossing chunk
  const roads = [
    {
      start: { x: originX - CHUNK_SIZE / 2, y: 0.05, z: originZ },
      end: { x: originX + CHUNK_SIZE / 2, y: 0.05, z: originZ },
      width: ROAD_WIDTH,
    },
    {
      start: { x: originX, y: 0.05, z: originZ - CHUNK_SIZE / 2 },
      end: { x: originX, y: 0.05, z: originZ + CHUNK_SIZE / 2 },
      width: ROAD_WIDTH,
    },
  ];

  const buildings: BuildingData[] = [];
  const props: CityChunk['props'] = [];
  const anitaNodes: CityChunk['anitaNodes'] = [];

  // Generate 4 quadrants of buildings per chunk
  const quadrants = [
    { xOff: -CHUNK_SIZE / 4, zOff: -CHUNK_SIZE / 4 },
    { xOff: CHUNK_SIZE / 4, zOff: -CHUNK_SIZE / 4 },
    { xOff: -CHUNK_SIZE / 4, zOff: CHUNK_SIZE / 4 },
    { xOff: CHUNK_SIZE / 4, zOff: CHUNK_SIZE / 4 },
  ];

  quadrants.forEach((quad, qIndex) => {
    const bId = `bld_${chunkX}_${chunkZ}_${qIndex}`;
    const bWidth = 14 + rng() * 8;
    const bDepth = 14 + rng() * 8;
    const isCitadel = district === 'citadel_core';
    const minHeight = isCitadel ? 35 : 18;
    const maxHeight = isCitadel ? 65 : 42;
    const bHeight = minHeight + rng() * (maxHeight - minHeight);
    const floors = Math.max(2, Math.floor(bHeight / 4));

    const bX = originX + quad.xOff + (rng() - 0.5) * 4;
    const bZ = originZ + quad.zOff + (rng() - 0.5) * 4;

    const wallColor = palette.walls[Math.floor(rng() * palette.walls.length)];
    const accentColor = palette.accents[Math.floor(rng() * palette.accents.length)];

    // At least 1 building per quadrant can be enterable
    const isEnterable = (qIndex === 0 || rng() > 0.45);
    const entranceOffsetZ = bDepth / 2;
    const entrancePos: Vector3D = {
      x: bX,
      y: 0,
      z: bZ + entranceOffsetZ,
    };

    const interiorRooms: InteriorRoom[] = [];
    if (isEnterable) {
      // Create ground floor room
      const roomFurniture: InteriorFurniture[] = [
        {
          id: `furn_${bId}_term`,
          type: 'server_rack',
          position: { x: bX - 3, y: 0, z: bZ - 2 },
          rotationY: 0,
          interactive: true,
        },
        {
          id: `furn_${bId}_desk`,
          type: 'desk',
          position: { x: bX + 2, y: 0, z: bZ - 2 },
          rotationY: Math.PI / 2,
        },
        {
          id: `furn_${bId}_crate`,
          type: 'crate',
          position: { x: bX - 3, y: 0, z: bZ + 2 },
          rotationY: rng() * Math.PI,
          interactive: true,
        },
        {
          id: `furn_${bId}_holo`,
          type: 'holo_display',
          position: { x: bX + 3, y: 0, z: bZ + 1 },
          rotationY: 0,
        },
      ];

      interiorRooms.push({
        id: `room_${bId}_f0`,
        floor: 0,
        bounds: {
          min: { x: bX - bWidth / 2 + 0.5, y: 0, z: bZ - bDepth / 2 + 0.5 },
          max: { x: bX + bWidth / 2 - 0.5, y: 4, z: bZ + bDepth / 2 - 0.5 },
        },
        doorPosition: entrancePos,
        doorOpen: false,
        hasTerminal: true,
        terminalHacked: false,
        hasLoot: true,
        lootCollected: false,
        furniture: roomFurniture,
      });

      // Optional Floor 1
      if (floors >= 2) {
        interiorRooms.push({
          id: `room_${bId}_f1`,
          floor: 1,
          bounds: {
            min: { x: bX - bWidth / 2 + 0.5, y: 4, z: bZ - bDepth / 2 + 0.5 },
            max: { x: bX + bWidth / 2 - 0.5, y: 8, z: bZ + bDepth / 2 - 0.5 },
          },
          doorPosition: { x: bX, y: 4, z: bZ + entranceOffsetZ },
          doorOpen: false,
          hasTerminal: rng() > 0.5,
          terminalHacked: false,
          hasLoot: true,
          lootCollected: false,
          furniture: [
            {
              id: `furn_${bId}_gen`,
              type: 'generator',
              position: { x: bX, y: 4, z: bZ },
              rotationY: 0,
              interactive: true,
            },
          ],
        });
      }
    }

    buildings.push({
      id: bId,
      district,
      position: { x: bX, y: bHeight / 2, z: bZ },
      size: { x: bWidth, y: bHeight, z: bDepth },
      floors,
      color: wallColor,
      accentColor,
      isEnterable,
      entrancePosition: isEnterable ? entrancePos : undefined,
      interiorRooms,
      hasRooftopAccess: rng() > 0.5,
      hasAntenna: rng() > 0.4,
    });

    // Street props
    props.push({
      type: 'street_lamp',
      position: { x: bX + (rng() - 0.5) * 8, y: 0, z: originZ + (qIndex < 2 ? -ROAD_WIDTH / 2 - 1.5 : ROAD_WIDTH / 2 + 1.5) },
      rotationY: qIndex < 2 ? 0 : Math.PI,
    });

    if (rng() > 0.5) {
      props.push({
        type: 'neon_sign',
        position: { x: bX, y: 6 + rng() * 8, z: bZ + entranceOffsetZ + 0.3 },
        rotationY: 0,
      });
    }

    // Anita Surveillance / Jammer Node
    if (rng() > 0.6 || isCitadel) {
      anitaNodes.push({
        id: `node_${bId}`,
        position: { x: bX, y: bHeight + 1, z: bZ },
        hacked: false,
        type: isCitadel ? 'subcore' : (rng() > 0.5 ? 'radar' : 'jammer'),
      });
    }
  });

  return {
    chunkX,
    chunkZ,
    seed: chunkSeed,
    district,
    buildings,
    roads,
    props,
    anitaNodes,
  };
}

export function isPointInsideBuilding(
  point: Vector3D,
  building: BuildingData,
  padding: number = 0.5
): boolean {
  const halfX = building.size.x / 2 + padding;
  const halfZ = building.size.z / 2 + padding;
  const minY = 0;
  const maxY = building.size.y;

  return (
    point.x >= building.position.x - halfX &&
    point.x <= building.position.x + halfX &&
    point.z >= building.position.z - halfZ &&
    point.z <= building.position.z + halfZ &&
    point.y >= minY &&
    point.y <= maxY
  );
}

export function findActiveInteriorRoom(
  point: Vector3D,
  buildings: BuildingData[]
): { building: BuildingData; room: InteriorRoom } | null {
  for (const bld of buildings) {
    if (!bld.isEnterable) continue;
    for (const room of bld.interiorRooms) {
      const b = room.bounds;
      if (
        point.x >= b.min.x &&
        point.x <= b.max.x &&
        point.z >= b.min.z &&
        point.z <= b.max.z &&
        point.y >= b.min.y - 0.5 &&
        point.y <= b.max.y + 0.5
      ) {
        return { building: bld, room };
      }
    }
  }
  return null;
}
