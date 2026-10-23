import readExcelFile from 'read-excel-file/web-worker';
import { parseCsv, type InventorySheet } from './inventoryImport';
const scope = self as unknown as { onmessage: (event: MessageEvent<File>) => void; postMessage: (value: unknown) => void };
scope.onmessage = async ({ data: file }) => {
  try {
    const buffer = await file.arrayBuffer(); let sheets: InventorySheet[];
    if (/\.csv$/i.test(file.name)) {
      let text: string;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer); } catch { text = new TextDecoder('shift_jis', { fatal: true }).decode(buffer); }
      sheets = [{ name: 'CSV', rows: parseCsv(text) }];
    } else {
      const workbook = await readExcelFile(buffer);
      sheets = workbook.map(sheet => ({ name: sheet.sheet, rows: sheet.data.map(row => row.map(cell => cell instanceof Date ? cell.toISOString().slice(0, 10) : cell == null ? '' : String(cell))) }));
    }
    if (!sheets.length || sheets.every(sheet => !sheet.rows.some(row => row.some(cell => cell.trim())))) throw new Error('読み込める表がありません。');
    if (sheets.length > 20 || sheets.some(sheet => sheet.rows.length > 5001 || sheet.rows.some(row => row.length > 60))) throw new Error('20シート・1シート5,000件・60列まで対応しています。必要な表だけの資料でお試しください。');
    scope.postMessage({ sheets });
  } catch (error) { const message = error instanceof Error ? error.message : ''; scope.postMessage({ error: /\.csv$/i.test(file.name) || /^(20シート|読み込める表)/.test(message) ? message || 'CSVを読み込めませんでした。' : 'Excelを読み込めません。パスワードを解除し、.xlsx形式で保存し直してください。' }); }
};
