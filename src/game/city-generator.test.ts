import test from 'node:test';
import assert from 'node:assert/strict';
import { generateChunk, isPointInsideBuilding, getDistrictForChunk, createPRNG } from './city-generator.ts';

test('createPRNG generates deterministic pseudo-random sequence', () => {
  const rng1 = createPRNG(12345);
  const rng2 = createPRNG(12345);
  const val1 = [rng1(), rng1(), rng1()];
  const val2 = [rng2(), rng2(), rng2()];
  assert.deepEqual(val1, val2);
});

test('getDistrictForChunk maps center to citadel and quadrants properly', () => {
  assert.equal(getDistrictForChunk(0, 0), 'citadel_core');
  assert.equal(getDistrictForChunk(1, 1), 'neon_hab');
  assert.equal(getDistrictForChunk(-1, 1), 'industrial_grid');
  assert.equal(getDistrictForChunk(-1, -1), 'underground_slum');
});

test('generateChunk produces expected chunk structure and enterable buildings', () => {
  const chunk = generateChunk(0, 0, 42);
  assert.equal(chunk.chunkX, 0);
  assert.equal(chunk.chunkZ, 0);
  assert.equal(chunk.district, 'citadel_core');
  assert.ok(chunk.buildings.length >= 4);
  assert.ok(chunk.roads.length >= 2);

  // Check that at least one building has enterable interior rooms
  const enterable = chunk.buildings.find((b) => b.isEnterable);
  assert.ok(enterable, 'Should have at least one enterable building');
  assert.ok(enterable!.interiorRooms.length >= 1, 'Enterable building must have interior rooms');
  assert.ok(enterable!.interiorRooms[0].furniture.length > 0, 'Interior room must have furniture');
});

test('isPointInsideBuilding accurately detects inclusion and exclusion', () => {
  const building = {
    id: 'test_bld',
    district: 'neon_hab' as const,
    position: { x: 10, y: 10, z: 10 },
    size: { x: 10, y: 20, z: 10 },
    floors: 4,
    color: '#000000',
    accentColor: '#00ffff',
    isEnterable: true,
    interiorRooms: [],
    hasRooftopAccess: false,
    hasAntenna: false,
  };

  // Inside
  assert.equal(isPointInsideBuilding({ x: 10, y: 5, z: 10 }, building), true);
  // Outside X
  assert.equal(isPointInsideBuilding({ x: 30, y: 5, z: 10 }, building), false);
  // Outside Y (above height)
  assert.equal(isPointInsideBuilding({ x: 10, y: 25, z: 10 }, building), false);
});
