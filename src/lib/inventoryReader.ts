import type { InventorySheet } from './inventoryImport';
export function readInventoryFile(file: File, signal: AbortSignal): Promise<InventorySheet[]> {
  if (!/\.(xlsx|csv)$/i.test(file.name)) return Promise.reject(new Error('Excel（.xlsx）またはCSVを選択してください。.xls・PDF・Wordは.xlsxかCSVへ変換してください。'));
  if (file.size > 2 * 1024 * 1024) return Promise.reject(new Error('ファイルは2MBまでです。必要な表だけに分けてください。'));
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./inventoryReader.worker.ts', import.meta.url), { type: 'module' });
    const cleanup = () => { clearTimeout(timeout); worker.terminate(); signal.removeEventListener('abort', abort); };
    const abort = () => { cleanup(); reject(new DOMException('Aborted', 'AbortError')); };
    const timeout = setTimeout(() => { cleanup(); reject(new Error('読み込みに時間がかかっています。必要な表だけの資料でお試しください。')); }, 20000);
    worker.onmessage = ({ data }: MessageEvent<{ sheets?: InventorySheet[]; error?: string }>) => { cleanup(); if (data.sheets) resolve(data.sheets); else reject(new Error(data.error || '資料を読み込めませんでした。')); };
    worker.onerror = () => { cleanup(); reject(new Error('資料を読み込めませんでした。ファイルの形式を確認してください。')); };
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort(); else worker.postMessage(file);
  });
}
