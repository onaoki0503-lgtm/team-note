import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Search, X, Download } from 'lucide-react';
import { INVENTORY_FIELDS, guessColumns, guessHeader, planInventoryImport, normalise, type ColumnMap, type InventoryItem, type InventorySheet } from '../lib/inventoryImport';
import { loadInventory, saveInventory, type InventoryData } from '../lib/inventoryStorage';
import { createInventoryTemplate } from '../lib/inventoryTemplate';
import { community } from '../lib/community';
import { readInventoryFile } from '../lib/inventoryReader';
import { useSharedIdeas } from '../lib/sharedIdeasContext';
import { listTeamnoteInventory, syncTeamnoteInventory } from '../lib/teamnoteInventory';

const countText = (quantity: number | null, unit: string) => {
  if (quantity === null) return '数量 未記録';
  const amount = quantity.toLocaleString('ja-JP', { maximumSignificantDigits: 15 });
  return unit ? `${amount} ${unit}` : `数量 ${amount}`;
};

export function InventoryView() {
  const shared = useSharedIdeas();
  const [state, setState] = useState<{ data: InventoryData; error: string }>(() => {
    if (shared.enabled) return { data: { version: 1, items: [] }, error: '' };
    try { return { data: loadInventory(), error: '' }; } catch (error) { return { data: { version: 1, items: [] }, error: error instanceof Error ? error.message : '台帳を読み込めません。' }; }
  });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'needs_check'>('all');
  const [sheets, setSheets] = useState<InventorySheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [header, setHeader] = useState(0);
  const [columns, setColumns] = useState<ColumnMap>(() => guessColumns([]));
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [allowValidOnly, setAllowValidOnly] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => pending.current?.abort(), []);

  useEffect(() => {
    if (!shared.enabled) return;
    let cancelled = false;
    void (async () => {
      try {
        const items = await listTeamnoteInventory();
        if (!cancelled) setState({ data: { version: 1, items }, error: '' });
      } catch (err) {
        if (!cancelled) setState({ data: { version: 1, items: [] }, error: err instanceof Error ? err.message : '備品台帳を読み込めませんでした。' });
      }
    })();
    return () => { cancelled = true; };
  }, [shared.enabled]);

  const sheet = sheets[sheetIndex];
  const plan = useMemo(() => sheet ? planInventoryImport(sheet, header, columns, state.data.items, fileName) : null, [sheet, header, columns, state.data, fileName]);
  const reset = () => { pending.current?.abort(); pending.current = null; setBusy(false); setSheets([]); setFileName(''); setError(''); setAllowValidOnly(false); };
  const chooseSheet = (next: InventorySheet[], index: number) => { const row = guessHeader(next[index].rows); setSheetIndex(index); setHeader(row); setColumns(guessColumns(next[index].rows[row] || [])); setAllowValidOnly(false); setError(''); };
  const readFile = async (file: File) => {
    pending.current?.abort(); const controller = new AbortController(); pending.current = controller;
    setFileName(file.name); setSheets([]); setBusy(true); setNotice(''); setError(''); setAllowValidOnly(false);
    try { const result = await readInventoryFile(file, controller.signal); if (controller.signal.aborted) return; setSheets(result); chooseSheet(result, 0); }
    catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : '資料を読み込めませんでした。'); }
    finally { if (pending.current === controller) { pending.current = null; setBusy(false); } }
  };
  const commit = async () => {
    if (!plan || !plan.entries.length || plan.problem || (plan.issues.length && !allowValidOnly) || state.error) return;
    try {
      if (!shared.enabled) {
        const latest = loadInventory();
        if (JSON.stringify(latest) !== JSON.stringify(state.data)) { setState({ data: latest, error: '' }); setError('台帳が更新されました。更新後の内容を確認し、もう一度反映してください。'); return; }
      }
      const now = new Date().toISOString();
      const next = [...state.data.items];
      const changed: InventoryItem[] = [];
      for (const entry of plan.entries) {
        if (entry.kind === '変更なし') continue;
        const item = { ...entry.item, id: entry.kind === '新規' ? crypto.randomUUID() : entry.item.id, updatedAt: now };
        const index = next.findIndex(existing => existing.id === item.id);
        if (index < 0) next.push(item); else next[index] = item;
        changed.push(item);
      }
      if (shared.enabled) {
        setBusy(true);
        const items = await syncTeamnoteInventory(changed);
        setState({ data: { version: 1, items }, error: '' });
        setBusy(false);
      } else {
        const data: InventoryData = { version: 1, items: next };
        saveInventory(data); setState({ data, error: '' });
      }
      const summary = `${plan.entries.filter(entry => entry.kind === '新規').length}件追加・${plan.entries.filter(entry => entry.kind === '更新').length}件更新・${plan.entries.filter(entry => entry.kind === '変更なし').length}件変更なし${plan.issues.length ? `（${plan.issues.length}行は反映せず）` : ''}`;
      reset(); setNotice(`備品台帳に反映しました。${summary}`);
    } catch { setBusy(false); setError('保存できませんでした。現在の台帳は変更していません。内容は残しているので、もう一度お試しください。'); }
  };
  const downloadTemplate = () => {
    const blob = new Blob([createInventoryTemplate(community.name)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = '備品台帳_入力用.csv'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const shown = state.data.items.filter(item => {
    const needsCheck = item.quantity === null || item.quantity === 0 || !['十分', '良好', '正常', '使用可能', '在庫あり', 'good', 'ok', 'available'].includes(item.status.toLowerCase());
    return (filter === 'all' || needsCheck) && normalise(`${item.name} ${item.assetCode} ${item.location} ${item.note}`).includes(normalise(search));
  });
  return <div className="inventory-view">
    <header className="inventory-toolbar">
      <div className="inventory-title"><h2>備品在庫</h2><span>{state.data.items.length}件{shared.enabled ? ' · 共有中' : ''}</span></div>
      <div className="inventory-toolbar-actions" role="group" aria-label="備品台帳の入出力">
        <button type="button" className="glass-primary inventory-toolbar-button" aria-label="Excel・CSVを選択" disabled={busy || !!state.error} onClick={() => fileInput.current?.click()}><Upload size={15} /><span className="inventory-action-full">Excel・CSVを選択</span><span className="inventory-action-short" aria-hidden="true">読み込む</span></button>
        <button type="button" className="glass-secondary inventory-toolbar-button" aria-label="入力用CSV" onClick={downloadTemplate}><Download size={15} />入力用CSV</button>
      </div>
    </header>
    <input ref={fileInput} type="file" aria-label="備品台帳のExcel・CSV" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" hidden onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void readFile(file); }} />
    {notice && <p className="inventory-notice" role="status">{notice}</p>}
    {state.error && !sheet && <p className="inventory-error" role="alert">{state.error}</p>}
    {(busy || error || sheet) && <div className="glass-panel inventory-import">
      {busy && <div className="inventory-reading" role="status">資料を読み込んでいます <button type="button" className="glass-secondary" onClick={reset}>中止</button></div>}
      {error && <p role="alert">{error}</p>}
      {sheet && plan && <section className="inventory-preview" aria-labelledby="inventory-preview-heading">
        <div className="inventory-heading"><h4 id="inventory-preview-heading">反映前の確認</h4><button type="button" className="glass-icon-button" aria-label="取り込みをキャンセル" onClick={reset}><X size={18} /></button></div>
        <p className="inventory-filename">{fileName}</p>
        <div className="inventory-selectors">
          {sheets.length > 1 && <label>取り込むシート<select aria-label="取り込むシート" value={sheetIndex} onChange={event => chooseSheet(sheets, Number(event.target.value))}>{sheets.map((entry, index) => <option key={entry.name} value={index}>{entry.name}</option>)}</select></label>}
          <label>見出し行<select aria-label="見出し行" value={header + 1} onChange={event => { setHeader(Number(event.target.value) - 1); setAllowValidOnly(false); setError(''); }}>{sheet.rows.slice(0, 30).map((_, index) => <option key={index} value={index + 1}>{index + 1}行目</option>)}</select></label>
        </div>
        <div className="inventory-column-map">{INVENTORY_FIELDS.map(field => <label key={field.key}>{field.label}{field.key === 'name' ? '（必須）' : ''}<select aria-label={`${field.label}の列`} value={columns[field.key]} onChange={event => { setColumns({ ...columns, [field.key]: Number(event.target.value) }); setAllowValidOnly(false); setError(''); }}>
          <option value={-1}>使わない</option>
          {(sheet.rows[header] || []).map((cell, index) => <option key={`${field.key}-${index}`} value={index}>{cell || `${index + 1}列目`}</option>)}
        </select></label>)}</div>
        <p className="inventory-summary">{plan.entries.filter(entry => entry.kind === '新規').length}件新規・{plan.entries.filter(entry => entry.kind === '更新').length}件更新・{plan.entries.filter(entry => entry.kind === '変更なし').length}件変更なし</p>
        {plan.issues.length > 0 && <div className="inventory-issues" role="alert"><strong>{plan.issues.length}行に確認が必要です</strong><ul>{plan.issues.slice(0, 12).map(issue => <li key={issue.row}>{issue.row}行目：{issue.message}</li>)}</ul>{plan.issues.length > 12 && <p>ほか{plan.issues.length - 12}行</p>}<label><input type="checkbox" checked={allowValidOnly} onChange={event => setAllowValidOnly(event.target.checked)} />問題のない{plan.entries.length}件だけ取り込む</label></div>}
        <div className="inventory-table-scroll"><table><caption>取り込み内容（先頭20件／{plan.entries.length}件）</caption><thead><tr><th>反映</th><th>備品名</th><th>数量</th><th>場所</th></tr></thead><tbody>{plan.entries.slice(0, 20).map(entry => <tr key={entry.row}><td>{entry.kind}</td><td>{entry.item.name}{entry.item.assetCode && <small>{entry.item.assetCode}</small>}</td><td>{countText(entry.item.quantity, entry.item.unit)}</td><td>{entry.item.location || '未記録'}</td></tr>)}</tbody></table></div>
        <button type="button" className="glass-primary" disabled={busy || !!plan.problem || (plan.issues.length > 0 && !allowValidOnly) || !plan.entries.length} onClick={() => void commit()}>この内容を備品台帳に反映</button>
      </section>}
    </div>}
    <div className="inventory-search glass-panel"><Search size={18} /><input aria-label="備品を検索" placeholder="備品名・管理番号・保管場所" value={search} onChange={event => setSearch(event.target.value)} /></div>
    <div className="inventory-actions">{(['all', 'needs_check'] as const).map(value => <button type="button" key={value} className={filter === value ? 'glass-primary' : 'glass-secondary'} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === 'all' ? 'すべて' : '要確認'}</button>)}</div>
    <div className="inventory-list" aria-label="登録済みの備品">{shown.map(item => <article key={item.id} className="glass-panel inventory-item">
      <div className="inventory-heading"><h3>{item.name}</h3><span>{item.status}</span></div>
      <p>{countText(item.quantity, item.unit)} · {item.location || '場所未記録'}{item.assetCode ? ` · 管理番号 ${item.assetCode}` : ''}</p>
      {item.note && <p className="inventory-note">{item.note}</p>}
    </article>)}</div>
    {!shown.length && <p className="inventory-empty">{state.data.items.length ? '条件に一致する備品はありません。' : '備品はまだ登録されていません。'}</p>}
  </div>;
}
