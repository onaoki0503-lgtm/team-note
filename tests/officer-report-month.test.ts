import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultOfficerReportMonth } from '../src/lib/officerReportMonth.ts';

test('on/before the 5th defaults to previous calendar month', () => {
  assert.equal(defaultOfficerReportMonth(new Date(2026, 10, 5)), '2026-10');
  assert.equal(defaultOfficerReportMonth(new Date(2026, 0, 1)), '2025-12');
});

test('after the 5th defaults to the current calendar month', () => {
  assert.equal(defaultOfficerReportMonth(new Date(2026, 10, 6)), '2026-11');
  assert.equal(defaultOfficerReportMonth(new Date(2026, 9, 26)), '2026-10');
});
