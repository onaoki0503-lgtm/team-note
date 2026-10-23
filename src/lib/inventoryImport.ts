export const INVENTORY_FIELDS = [
  { key: 'assetCode', label: '管理番号', aliases: ['管理番号', '備品番号', '物品番号', '備品id', '資産番号', 'id', 'code', 'assetcode'] },
  { key: 'name', label: '備品名', aliases: ['備品名', '物品名', '品名', '名称', '商品名', '備品', 'name', 'item', 'itemname'] },
  { key: 'quantity', label: '数量', aliases: ['数量', '個数', '在庫数', '在庫', '数', '保有数', '数量個', 'quantity', 'count', 'qty'] },
  { key: 'unit', label: '単位', aliases: ['単位', 'unit'] },
  { key: 'location', label: '保管場所', aliases: ['保管場所', '設置場所', '場所', '保管先', '所在地', 'location'] },
  { key: 'status', label: '状態', aliases: ['状態', '状況', '在庫状況', '備品状態', 'status', 'condition'] },
  { key: 'note', label: '備考', aliases: ['備考', 'メモ', '補足', 'note', 'notes', 'memo'] }
] as const;
export type InventoryField = typeof INVENTORY_FIELDS[number]['key'];
export type ColumnMap = Record<InventoryField, number>;
export type InventoryRow = string[];
export interface InventorySheet { name: string; rows: InventoryRow[] }
export interface InventoryItem {
  id: string; assetCode: string; name: string; quantity: number | null; unit: string; location: string; status: string; note: string;
  updatedAt: string; source: { file: string; sheet: string; row: number };
}
export const normalise = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, '').toLowerCase();
export const emptyMap = (): ColumnMap => ({ assetCode: -1, name: -1, quantity: -1, unit: -1, location: -1, status: -1, note: -1 });
export function guessColumns(row: InventoryRow): ColumnMap {
  const map = emptyMap();
  for (const field of INVENTORY_FIELDS) map[field.key] = row.findIndex(cell => field.aliases.some(alias => normalise(alias) === normalise(cell).replace(/[()（）]/g, '')));
  return map;
}
export function guessHeader(rows: InventoryRow[]): number {
  let best = 0, score = 0;
  rows.slice(0, 30).forEach((row, index) => { const map = guessColumns(row); const next = Object.values(map).filter(value => value >= 0).length + (map.name >= 0 ? 5 : 0); if (next > score) { score = next; best = index; } });
  return best;
}
export function parseCsv(text: string): InventoryRow[] {
  const source = text.replace(/^\uFEFF/, '');
  // Determine the delimiter from the first record, outside quoted cells.
  let quoted = false; const counts = [0, 0, 0], candidates = [',', '\t', ';'];
  for (let i = 0; i < source.length; i++) { const char = source[i]; if (char === '"') { if (quoted && source[i + 1] === '"') { i++; continue; } quoted = !quoted; } if (!quoted) { if (char === '\r' || char === '\n') break; const index = candidates.indexOf(char); if (index >= 0) counts[index]++; } }
  const delimiter = candidates[counts.indexOf(Math.max(...counts))];
  const rows: string[][] = []; let row: string[] = [], cell = '', inQuote = false, closed = false;
  const finishCell = () => { row.push(cell); cell = ''; closed = false; if (row.length > 60) throw new Error('列数は60列まで対応しています。必要な列だけの資料でお試しください。'); };
  const finishRow = () => { finishCell(); rows.push(row); row = []; if (rows.length > 5001) throw new Error('1シート5,000件まで対応しています。ファイルを分けてください。'); };
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (inQuote) { if (char === '"') { if (source[i + 1] === '"') { cell += '"'; i++; } else { inQuote = false; closed = true; } } else cell += char; }
    else if (char === delimiter) finishCell();
    else if (char === '\r' || char === '\n') { if (char === '\r' && source[i + 1] === '\n') i++; finishRow(); }
    else if (char === '"') { if (cell || closed) throw new Error('CSVの引用符を確認してください。'); inQuote = true; }
    else { if (closed && char.trim()) throw new Error('CSVの引用符の後に文字があります。'); if (!closed) cell += char; }
  }
  if (inQuote) throw new Error('CSVの引用符が閉じていません。');
  if (cell || row.length || closed) finishRow();
  return rows;
}
export function planInventoryImport(sheet: InventorySheet, header: number, map: ColumnMap, items: InventoryItem[], file: string) {
  const issues: { row: number; message: string }[] = [];
  const entries: { item: InventoryItem; kind: '新規' | '更新' | '変更なし'; row: number }[] = [];
  const selected = Object.values(map).filter(value => value >= 0);
  if (map.name < 0) return { entries, issues, problem: '備品名の列を選択してください。' };
  if (new Set(selected).size !== selected.length) return { entries, issues, problem: '同じ列が複数の項目に選択されています。' };
  const seen = new Set<string>();
  sheet.rows.slice(header + 1).forEach((row, offset) => {
    const rowNumber = header + offset + 2;
    if (row.every(cell => !cell.trim())) return;
    const value = (key: InventoryField) => map[key] < 0 ? '' : (row[map[key]] || '').trim();
    try {
      if (!value('name')) throw new Error('備品名がありません。');
      if (INVENTORY_FIELDS.some(field => value(field.key).length > (field.key === 'note' ? 2000 : 200))) throw new Error('文字数が上限を超えています（備考2,000文字、その他200文字）。');
      const assetCode = value('assetCode'), name = value('name'), location = value('location');
      let quantity: number | null = null, unit = value('unit');
      if (value('quantity')) {
        const raw = value('quantity').normalize('NFKC');
        if (raw.includes(',') && !/^\d{1,3}(?:,\d{3})+(?:\.\d+)?(?:\s*[^\d,].*)?$/.test(raw)) throw new Error('数量の桁区切りを確認してください。');
        const match = raw.replace(/,/g, '').match(/^((?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)\s*([^\d+.,-].*)?$/i);
        if (!match || !Number.isFinite(Number(match[1])) || Number(match[1]) > 1e9) throw new Error('数量は0以上の数値で入力してください。空欄は未記録として扱います。');
        quantity = Number(match[1]);
        if (match[2]) { if (unit && normalise(unit) !== normalise(match[2])) throw new Error('数量の単位と単位列が一致しません。'); unit ||= match[2].trim(); }
      }
      const codeMatches = assetCode ? items.filter(item => normalise(item.assetCode) === normalise(assetCode)) : [];
      const sameName = items.filter(item => normalise(item.name) === normalise(name) && (map.location < 0 || normalise(item.location) === normalise(location)) && (!assetCode || !item.assetCode));
      const matches = codeMatches.length ? codeMatches : sameName;
      if (matches.length > 1) throw new Error('更新先が複数あります。管理番号で区別してください。');
      const existing = matches[0];
      const key = existing ? `id:${existing.id}` : assetCode ? `code:${normalise(assetCode)}` : `name:${normalise(name)}:${normalise(location)}`;
      if (seen.has(key) || entries.some(entry => (existing && entry.item.id === existing.id) || (assetCode && normalise(entry.item.assetCode) === normalise(assetCode)) || ((!assetCode || !entry.item.assetCode) && normalise(entry.item.name) === normalise(name) && (map.location < 0 || normalise(entry.item.location) === normalise(location))))) throw new Error('同じ備品がファイル内で重複しています。数量は合算しません。');
      seen.add(key);
      const item: InventoryItem = existing ? { ...existing } : { id: `import-row-${rowNumber}`, assetCode: '', name, quantity: null, unit: '', location: '', status: '未確認', note: '', updatedAt: '', source: { file, sheet: sheet.name, row: rowNumber } };
      for (const field of INVENTORY_FIELDS) if (map[field.key] >= 0) {
        if (field.key === 'quantity') item.quantity = quantity;
        else item[field.key] = value(field.key);
      }
      if (map.quantity >= 0 && map.unit < 0 && unit) item.unit = unit;
      item.status ||= '未確認';
      const changed = !existing || INVENTORY_FIELDS.some(field => item[field.key] !== existing[field.key]);
      if (changed) item.source = { file, sheet: sheet.name, row: rowNumber };
      entries.push({ item, kind: !existing ? '新規' : changed ? '更新' : '変更なし', row: rowNumber });
    } catch (error) { issues.push({ row: rowNumber, message: error instanceof Error ? error.message : '内容を確認してください。' }); }
  });
  return { entries, issues, problem: '' };
}
