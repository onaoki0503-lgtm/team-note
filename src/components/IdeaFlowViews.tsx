import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Printer, Check, Save, ArrowRight } from 'lucide-react';
import { useScreenState } from '../lib/navigation';
import { useSpeechInput } from '../lib/useSpeechInput';
import { PROPOSAL_FIELDS, MAX_DISTRIBUTION_INPUT, newProposalForm, proposalErrors, formToProposal, localAssignments, type ProposalField, type ProposalForm, type ProposalAssignment } from '../lib/proposalForm';
import { loadProposalDraft } from '../lib/proposalDraft';
import { distributeProposalWithWorkers } from '../utils/geminiIdeaService';
import type { ProposalDocument } from '../lib/aiContract';

export interface IdeaDraftData {
  projectType: 'event' | 'operation'; title: string; content: string; attachedFile?: string; meetingNote?: string; proposalDocument?: ProposalDocument;
}
interface Props { currentUserId: string; initialText: string; onCreateProject: (draft: IdeaDraftData, nodes: { id: string; label: string; category: string }[]) => Promise<void> }
export function IdeaFlowViews({ currentUserId, initialText, onCreateProject }: Props) {
  const draftKey = `tn_proposal_form:${currentUserId}:v1`;
  const [form, setForm] = useScreenState<ProposalForm>(`proposal-form:${currentUserId}`, () => loadProposalDraft(draftKey, initialText), false);
  const [memo, setMemo] = useScreenState(`proposal-memo:${currentUserId}`, '', false);
  const [stage, setStage] = useScreenState<1 | 3>('idea-stage', 1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [missing, setMissing] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [candidates, setCandidates] = useState<ProposalAssignment[]>([]);
  const [selected, setSelected] = useState<ProposalField[]>([]);
  const speech = useSpeechInput();
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; request.current?.abort(); }; }, []);
  const invalidate = () => { request.current?.abort(); request.current = null; setDistributing(false); setCandidates([]); setSelected([]); setError(''); setNotice(''); setMissing([]); };
  const update = (key: ProposalField, value: string) => { invalidate(); setForm(current => ({ ...current, [key]: value })); };
  const updateMemo = (value: string) => { invalidate(); setMemo(value); };
  const proposeAssignments = (items: ProposalAssignment[]) => {
    setCandidates(items); setSelected(items.filter(item => !form[item.field].trim() && item.quote.length <= PROPOSAL_FIELDS.find(field => field.key === item.field)!.max).map(item => item.field));
  };
  const distribute = async (text: string) => {
    invalidate();
    if (!text.trim() || text.length > MAX_DISTRIBUTION_INPUT) { setError(`振り分ける内容を${MAX_DISTRIBUTION_INPUT}文字以内で入力してください。`); return; }
    const local = localAssignments(text);
    if (local.length) {
      proposeAssignments(local); setNotice('項目名から振り分けました。反映する内容を確認してください。'); return;
    }
    const controller = new AbortController(); request.current = controller; setDistributing(true);
    try { const items = await distributeProposalWithWorkers(text, controller.signal); if (mounted.current && !controller.signal.aborted) { proposeAssignments(items); setNotice('振り分け候補を確認してください。入力済みの項目は自動選択しません。'); } }
    catch (err) { if (mounted.current && !controller.signal.aborted) setError(err instanceof Error ? err.message : '振り分けできませんでした。'); }
    finally { if (mounted.current && request.current === controller) { request.current = null; setDistributing(false); } }
  };
  const apply = () => {
    const items = candidates.filter(item => selected.includes(item.field));
    if (items.some(item => item.quote.length > PROPOSAL_FIELDS.find(field => field.key === item.field)!.max)) { setError('項目の文字数上限を超えています。メモを短くして振り分け直してください。'); return; }
    setForm(current => ({ ...current, ...Object.fromEntries(items.map(item => [item.field, item.quote])) })); invalidate(); setNotice(`${items.length}項目に反映しました。`);
  };
  const saveDraft = () => {
    const tooLong = PROPOSAL_FIELDS.find(field => form[field.key].length > field.max);
    if (tooLong) { setError(`${tooLong.label}は${tooLong.max}文字以内に直してから保存してください。入力は残しています。`); return; }
    try { localStorage.setItem(draftKey, JSON.stringify({ version: 1, form })); setNotice('この端末に下書きを保存しました。'); setError(''); }
    catch { setError('下書きを保存できませんでした。入力内容はこの画面に残しています。'); }
  };
  const preview = () => { const errors = proposalErrors(form); setMissing(errors); if (!errors.length) { setStage(3); setError(''); } };
  const confirm = async () => {
    if (submitting || speech.busy) return;
    const errors = proposalErrors(form); if (errors.length) { setMissing(errors); setStage(1); return; }
    setSubmitting(true); setError('');
    try {
      const doc = formToProposal(form);
      await onCreateProject({ projectType: form.projectType, title: form.title.trim(), content: form.proposalOverview.trim(), proposalDocument: doc }, []);
      try { localStorage.removeItem(draftKey); } catch { /* Registration has already succeeded. */ }
      setForm(newProposalForm()); setMemo('');
    } catch { if (mounted.current) setError('登録できませんでした。入力内容は残しています。もう一度お試しください。'); }
    finally { if (mounted.current) setSubmitting(false); }
  };
  const listen = () => {
    if (speech.busy) { speech.stop(); return; }
    invalidate();
    speech.start(memo, updateMemo, text => { void distribute(text); });
  };
  return <div className="proposal-builder">
    <div className="proposal-flow-steps" aria-label="作成手順"><span aria-current={stage === 1 ? 'step' : undefined}>1 項目を入力</span><ArrowRight size={14} /><span aria-current={stage === 3 ? 'step' : undefined}>2 確認・登録</span></div>
    {error && <p role="alert" className="voice-error">{error}</p>}
    {notice && <p role="status" className="voice-saved">{notice}</p>}
    {stage === 1 ? <>
      <div className="proposal-builder-heading"><h2>企画書を作成</h2><button type="button" className="glass-secondary" disabled={speech.busy || distributing} onClick={saveDraft}><Save size={15} />下書きを保存</button></div>
      <p className="proposal-help">項目に入力した内容を、そのまま企画書に反映します。未定の項目は「未定」と記載してください。</p>
      {speech.error && <p role="alert" className="voice-error">{speech.error}</p>}
      {speech.busy && <div className="proposal-listening" role="status">{speech.interim || '聞いています。話し終わったら停止してください。'}</div>}
      {!speech.supported && <p className="voice-fallback">このブラウザでは音声入力を使えません。各項目に文字入力できます。</p>}
      {speech.supported && <p className="voice-privacy">音声はブラウザの音声認識サービスで処理される場合があります。原音は保存しません。</p>}
      <section className="glass-panel proposal-distribution" aria-label="企画全体の音声入力">
        <h3>企画全体をまとめて話す</h3>
        <p>背景・目的・実施内容・日時・場所・担当・予算などをまとめて話してください。音声入力の終了後、各項目に自動で振り分けます。</p>
        <div className="proposal-field-heading"><label htmlFor="proposal-memo">まとめて入力</label><button type="button" className="glass-primary proposal-mic" aria-label={speech.busy ? '音声入力を止める' : '企画全体を音声入力'} aria-pressed={speech.busy} disabled={!speech.supported || speech.status === 'stopping'} onClick={listen}>{speech.busy ? <Square size={16} /> : <Mic size={16} />}{speech.busy ? '終了して自動分配' : '音声入力を開始'}</button></div>
        <textarea id="proposal-memo" aria-label="振り分け用の音声・メモ" maxLength={MAX_DISTRIBUTION_INPUT} rows={5} value={memo} disabled={speech.busy} onChange={event => updateMemo(event.target.value)} />
        <small>{memo.length} / {MAX_DISTRIBUTION_INPUT}文字</small>
        <div className="proposal-controls"><button type="button" className="glass-secondary" disabled={speech.busy || distributing || !memo.trim()} onClick={() => void distribute(memo)}>入力内容を自動分配</button></div>
        <p>文字入力・修正もできます。項目名がある文章は端末内で、自由な文章はAIで分類します。反映前に候補を確認できます。</p>
        {distributing && <div role="status" className="proposal-controls">項目に振り分けています<button type="button" className="glass-secondary" onClick={invalidate}>振り分けを中止</button></div>}
        {candidates.length > 0 && <section className="proposal-assignment-review" aria-label="振り分け候補">
          <p>入力済みの項目を選ぶと、その内容を置き換えます。</p>
          {candidates.map(item => <label key={item.field} className="proposal-assignment"><input type="checkbox" aria-label={`${PROPOSAL_FIELDS.find(field => field.key === item.field)!.label}へ反映`} checked={selected.includes(item.field)} onChange={event => setSelected(current => event.target.checked ? [...current, item.field] : current.filter(key => key !== item.field))} /><div><strong>{PROPOSAL_FIELDS.find(field => field.key === item.field)!.label}</strong>{form[item.field].trim() && <p>入力済み：{form[item.field]}</p>}<p>候補：{item.quote}</p></div></label>)}
          <button type="button" className="glass-primary" disabled={!selected.length} onClick={apply}>選択した項目に反映</button>
        </section>}
      </section>
      {missing.length > 0 && <div role="alert" className="voice-error"><ul>{missing.map(message => <li key={message}>{message}</li>)}</ul></div>}
      <form onSubmit={event => { event.preventDefault(); preview(); }} noValidate className="glass-panel proposal-input-form">
        <label className="proposal-kind">企画の種類<select aria-label="企画の種類" disabled={speech.busy} value={form.projectType} onChange={event => { invalidate(); setForm(current => ({ ...current, projectType: event.target.value as 'operation' | 'event' })); }}><option value="operation">日常運営・改善</option><option value="event">イベント</option></select></label>
        {PROPOSAL_FIELDS.map(field => <div key={field.key} className="proposal-field">
          <div className="proposal-field-heading"><label htmlFor={`proposal-${field.key}`}>{field.label}{field.required && <small>必須</small>}</label></div>
          <p id={`proposal-hint-${field.key}`}>{field.hint}</p>
          <textarea id={`proposal-${field.key}`} aria-label={`企画書の${field.label}`} aria-describedby={`proposal-hint-${field.key}`} rows={field.max <= 400 ? 2 : 3} value={form[field.key]} maxLength={field.max} required={field.required} disabled={speech.busy} onChange={event => update(field.key, event.target.value)} />
        </div>)}
        <button className="glass-primary" type="submit" disabled={speech.busy || distributing}>企画書を確認</button>
      </form>
    </> : <>
      <div className="proposal-controls"><button className="glass-secondary" type="button" disabled={submitting} onClick={() => setStage(1)}>入力内容を直す</button><button type="button" className="glass-secondary" onClick={() => window.print()}><Printer size={16} />PDF印刷・保存</button></div>
      <article id="printable-proposal-document" className="glass-panel proposal-document" aria-label="企画書プレビュー"><span>企画提案書</span><h1>{form.title}</h1><p>{form.projectType === 'event' ? 'イベント' : '日常運営・改善'}</p>{PROPOSAL_FIELDS.filter(field => field.key !== 'title').map(field => <section key={field.key}><h3>{field.label}</h3><p>{form[field.key].trim() || '未記入'}</p></section>)}</article>
      <button type="button" className="glass-primary proposal-register" onClick={() => void confirm()} disabled={submitting}><Check size={17} />{submitting ? '登録しています' : 'この内容で企画を登録'}</button>
    </>}
  </div>;
}
