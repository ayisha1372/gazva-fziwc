import test from 'node:test';
import assert from 'node:assert/strict';
import { assignRanks, ordinal } from '../src/utils/ranking.js';

test('ordinal suffixes', () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 111].map(ordinal), ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '101st', '111th']);
});

test('higher points rank higher; ties share a rank and the next rank is skipped', () => {
  const out = assignRanks([
    { name: 'D', points: 100 }, { name: 'B', points: 300 }, { name: 'C', points: 300 }, { name: 'A', points: 500 }, { name: 'E', points: 50 },
  ]);
  assert.deepEqual(out.map((o) => [o.name, o.rank, o.position]), [
    ['A', 1, '1st'], ['B', 2, 'T-2nd'], ['C', 2, 'T-2nd'], ['D', 4, '4th'], ['E', 5, '5th'],
  ]);
});

test('ties are ordered alphabetically so the list is stable', () => {
  const out = assignRanks([{ name: 'Zoya', points: 10 }, { name: 'aisha', points: 10 }, { name: 'Maryam', points: 10 }]);
  assert.deepEqual(out.map((o) => o.name), ['aisha', 'Maryam', 'Zoya']);
  assert.ok(out.every((o) => o.rank === 1 && o.tied));
});

test('everyone on zero points shares rank 1; empty list is fine', () => {
  assert.ok(assignRanks([{ name: 'a', points: 0 }, { name: 'b' }]).every((o) => o.rank === 1));
  assert.deepEqual(assignRanks([]), []);
});
