import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthRange, moveMonth } from '../src/management/data.ts';
import { createDemoReports } from '../src/management/demo.ts';

test('month ranges handle leap months and year boundaries, and reject invalid input', () => {
  assert.deepEqual(monthRange('2024-02'), { from: '2024-02-01', before: '2024-03-01' });
  assert.deepEqual(monthRange('2026-12'), { from: '2026-12-01', before: '2027-01-01' });
  assert.equal(moveMonth('2026-01', -1), '2025-12');
  assert.throws(() => monthRange('2026-13'));
  assert.throws(() => monthRange('1999-12'));
});
test('demo contains one complete monthly document per author, with no daily or review rows', () => {
  const rows = createDemoReports('2026-10');
  assert.equal(new Set(rows.map(r => r.author.id)).size, rows.length);
  assert.ok(rows.every(r => r.month === '2026-10' && r.body.includes('4. 学生寮')));
  assert.ok(rows.every(r => !('review' in r) && !('category' in r)));
});
