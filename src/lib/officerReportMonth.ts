/** Officers often file the previous month on/before the 5th deadline. */
export function defaultOfficerReportMonth(now: Date): string {
  const base = now.getDate() <= 5 ? new Date(now.getFullYear(), now.getMonth() - 1, 1) : new Date(now.getFullYear(), now.getMonth(), 1);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`;
}

export function reportsForMonth<T extends { date?: string }>(reports: T[], month: string): T[] {
  const slash = month.replace('-', '/');
  return reports.filter((r) => !!r.date && (r.date.startsWith(month) || r.date.startsWith(slash)));
}
