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

export function jstTime(iso: string | null) {
  if (!iso || Number.isNaN(Date.parse(iso))) return '—';
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function managementError(error: unknown) {
  const e = error as { code?: string };
  if (e?.code === '42501') return 'このアカウントには管理画面の閲覧権限がありません。';
  if (e?.code === 'PGRST202' || e?.code === '42883') return '月次報告書の接続設定が未完了です。管理者に確認してください。';
  return '報告書を読み込めませんでした。接続を確認して、もう一度お試しください。';
}
