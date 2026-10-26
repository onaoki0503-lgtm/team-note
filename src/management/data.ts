import type { ManagementReport } from './types.ts';
import { buildings } from './types.ts';

export function currentMonth() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit' }).format(new Date());
}

export function monthRange(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('invalid_month');
  const [year, m] = month.split('-').map(Number);
  if (year < 2000 || year > 2100) throw new Error('invalid_month');
  return { from: `${month}-01`, before: new Date(Date.UTC(year, m, 1)).toISOString().slice(0, 10) };
}

export function moveMonth(month: string, offset: number) {
  monthRange(month);
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + offset, 1)).toISOString().slice(0, 7);
}

export function monthLabel(month: string) {
  const [year, m] = month.split('-');
  return `${year}年${Number(m)}月`;
}

export function shortDate(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(day)) return '—';
  return `${Number(day.slice(5, 7))}/${Number(day.slice(8, 10))}`;
}

export function jstTime(iso: string | null) {
  if (!iso || Number.isNaN(Date.parse(iso))) return '—';
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function filterReports(reports: ManagementReport[], filters: { query: string; building: string; category: string; status: string; authorId?: string }) {
  const words = filters.query.normalize('NFKC').toLocaleLowerCase('ja').trim().split(/\s+/).filter(Boolean);
  return reports.filter(r => {
    if (filters.authorId && r.author.id !== filters.authorId) return false;
    if (filters.building && r.author.building !== filters.building) return false;
    if (filters.category && r.category !== filters.category) return false;
    if (filters.status === 'pending' && r.review.reviewed) return false;
    if (filters.status === 'reviewed' && !r.review.reviewed) return false;
    const haystack = [r.title, r.body, r.author.name, r.author.role, r.author.unit, buildings[r.author.building] || '', r.locationLabel, r.category].join(' ').normalize('NFKC').toLocaleLowerCase('ja');
    return words.every(w => haystack.includes(w));
  });
}

// Quoting alone does not prevent spreadsheet formula execution.
export function csvCell(value: string) {
  const safe = /^[=+@\-\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function reportsCsv(reports: ManagementReport[]) {
  const header = ['報告日', '提出者', '役職', '棟', '部屋', '業務区分', '件名', '報告内容', '場所', '添付数', '確認状況', '確認者', '確認日時'];
  const lines = reports.map(r => [r.reportDate, r.author.name, r.author.role, buildings[r.author.building] || r.author.building, r.author.unit, r.category, r.title, r.body, r.locationLabel, String(r.attachments.length), r.review.reviewed ? '確認済み' : '未確認', r.review.reviewerName, r.review.reviewedAt || '']);
  return '\uFEFF' + [header, ...lines].map(row => row.map(csvCell).join(',')).join('\r\n');
}

export function managementError(error: unknown) {
  const e = error as { code?: string; message?: string };
  if (e?.code === '42501') return 'このアカウントには管理画面の閲覧権限がありません。';
  if (e?.code === '40001') return 'ほかの管理者が更新しました。最新の状態を読み直してから操作してください。';
  if (e?.code === 'PGRST202' || e?.code === '42883') return '管理画面の接続設定が未完了です。管理者に確認してください。';
  if (e?.code === 'P0002') return '報告書が見つかりません。最新の状態に更新してください。';
  return '読み込みまたは保存に失敗しました。接続を確認して、もう一度お試しください。';
}
