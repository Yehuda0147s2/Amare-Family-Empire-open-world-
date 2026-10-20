import test from 'node:test';
import assert from 'node:assert/strict';
import { AMARE_FAMILY, AMARE_LIST, findNearestAmareNPC } from './amare-lore.ts';

test('AMARE_FAMILY includes all 9 canonical family members', () => {
  assert.equal(AMARE_LIST.length, 9);
  assert.equal(AMARE_FAMILY.tesfaye.epithet, 'Hope');
  assert.equal(AMARE_FAMILY.selam.epithet, 'Peace');
  assert.equal(AMARE_FAMILY.liya.epithet, 'The Lioness');
  assert.equal(AMARE_FAMILY.yonatan.epithet, 'The Seer of Time');
  assert.equal(AMARE_FAMILY.malak.epithet, 'The Spiritual Force');
  assert.equal(AMARE_FAMILY.kalev.epithet, 'Willpower & Friendship');
  assert.equal(AMARE_FAMILY.natan.epithet, 'Master of Technology');
  assert.equal(AMARE_FAMILY.mangesha.epithet, 'The Bridge of Unity');
  assert.equal(AMARE_FAMILY.hannah.epithet, 'The Hidden Future');
});

test('every Amare NPC has valid dialogue and distinct tactical buffs', () => {
  for (const npc of AMARE_LIST) {
    assert.ok(npc.dialogue.length >= 2, `${npc.name} must have at least 2 dialogue lines`);
    assert.ok(npc.buffName.length > 0, `${npc.name} must have a buff name`);
    assert.ok(npc.buffDescription.length > 0, `${npc.name} must have a buff description`);
    assert.ok(npc.sanctuaryName.length > 0, `${npc.name} must have a sanctuary name`);
  }
});

test('findNearestAmareNPC finds NPC within radius and returns null when too far', () => {
  // Tesfaye is at { x: 0, y: 0, z: 28 }
  const nearTesfaye = { x: 0.5, y: 0, z: 28.5 };
  const found = findNearestAmareNPC(nearTesfaye, 3.0);
  assert.ok(found);
  assert.equal(found?.id, 'tesfaye');

  // Way out in the distance
  const farAway = { x: 500, y: 0, z: 500 };
  assert.equal(findNearestAmareNPC(farAway, 3.0), null);
});
