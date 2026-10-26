import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthRange, moveMonth, filterReports, reportsCsv } from '../src/management/data.ts';
import { createDemoReports } from '../src/management/demo.ts';

test('month ranges use an exclusive upper bound over leap months and year boundaries', () => {
  assert.deepEqual(monthRange('2024-02'), { from: '2024-02-01', before: '2024-03-01' });
  assert.deepEqual(monthRange('2026-12'), { from: '2026-12-01', before: '2027-01-01' });
  assert.equal(moveMonth('2026-01', -1), '2025-12');
  assert.throws(() => monthRange('2026-13'));
  assert.throws(() => monthRange('1999-12'));
});
test('filters intersect month data, categories, review status and normalized multiple search words', () => {
  const rows = createDemoReports('2026-10');
  const filtered = filterReports(rows, { query: 'ＨＬ キッチン', building: 'rosemary', category: '役職固有業務', status: 'pending' });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'demo-report-1');
  rows[1].author = { ...rows[1].author, name: rows[0].author.name };
  const authorRows = filterReports(rows, { query: '', building: '', category: '', status: '', authorId: 'a' });
  assert.equal(authorRows.length, 6);
  assert.ok(authorRows.every(r => r.author.id === 'a'));
  assert.equal(filterReports(rows, { query: '', building: '', category: '', status: 'pending' }).length, 8);
});
test('CSV protects formulas, preserves newlines and quote characters, and exports all matched rows', () => {
  const rows = createDemoReports('2026-10');
  rows[0].title = '@SUM(1,2)'; rows[0].body = '確認した"備品"\n次の行';
  const csv = reportsCsv(rows);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\'@SUM(1,2)"'));
  assert.ok(csv.includes('"確認した""備品""\n次の行"'));
  assert.ok(csv.includes('2026-10-02'));
});
