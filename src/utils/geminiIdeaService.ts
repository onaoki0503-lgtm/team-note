import { isAssignments, MAX_DISTRIBUTION_INPUT, type ProposalAssignment } from '../lib/proposalForm';
// Kept as the existing import location; inference now runs exclusively in a Worker.
export type { ExtractedTopic, ProposalDocument, ProposalBudgetItem, ProposalConceptBox, ProposalOperationFlowItem, ProposalStakeholderImpact } from '../lib/aiContract';
import { isProposal, isTopics, MAX_AI_INPUT, type AiTask, type ExtractedTopic, type ProposalDocument } from '../lib/aiContract';
import { teamnoteClient } from '../lib/teamnoteCloud';

const configured = import.meta.env.VITE_AI_WORKER_URL?.trim();
const endpoint = configured ? configured.replace(/\/$/, '') : '/api/ai';
if (configured && !/^https:\/\//.test(configured) && !/^http:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(configured)) throw new Error('AI接続先はHTTPSで指定してください。');
// Retire the old browser-stored provider key without ever reading or sending it.
try { localStorage.removeItem('team_note_gemini_api_key'); } catch { /* Storage may be unavailable. */ }

async function accessToken(): Promise<string | undefined> {
  if (!teamnoteClient) return undefined;
  const { data: { session } } = await teamnoteClient.auth.getSession();
  return session?.access_token;
}

async function requestAi(task: AiTask, sourceText: string, signal?: AbortSignal, topic?: string): Promise<unknown> {
  const text = sourceText.trim();
  const limit = task === 'distribute' ? MAX_DISTRIBUTION_INPUT : MAX_AI_INPUT;
  if (!text || text.length > limit) throw new Error(`本文は1〜${limit.toLocaleString()}文字で入力してください。`);
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const token = await accessToken();
    if (teamnoteClient && !token) throw new Error('ログインしてからAIを利用してください。');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ task, text, ...(topic ? { topic } : {}) }), signal: controller.signal, credentials: 'omit' });
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message = response.status === 401 || response.status === 403 ? 'ログインと寮への参加を確認してから再試行してください。' : response.status === 429 ? '利用が集中しています。少し待って再試行してください。' : response.status === 503 ? 'AIに接続できません。時間をおいて再試行するか、手入力で作成してください。' : '生成できませんでした。入力を残したまま再試行できます。';
      throw new Error(message);
    }
    if (!result || typeof result !== 'object' || !('data' in result)) throw new Error('AIの応答を確認できませんでした。再試行してください。');
    const data = result.data;
    if (task === 'distribute' ? !isAssignments(data, text) : task === 'topics' ? !isTopics(data) : !isProposal(data)) throw new Error('AIの応答を確認できませんでした。再試行してください。');
    return data;
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (controller.signal.aborted) throw new Error('応答に時間がかかっています。再試行してください。');
    if (error instanceof TypeError) throw new Error('通信できません。接続を確認して再試行してください。');
    throw error;
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
}
export const analyzeMeetingNoteWithWorkers = (text: string, signal?: AbortSignal) => requestAi('topics', text, signal) as Promise<ExtractedTopic[]>;
export const generateProposalDirectFromTextWithWorkers = (text: string, signal?: AbortSignal) => requestAi('proposal', text, signal) as Promise<ProposalDocument>;
export const generateProposalFromTopicWithWorkers = (topic: ExtractedTopic, text: string, signal?: AbortSignal) => requestAi('proposal', text, signal, topic.title) as Promise<ProposalDocument>;

export const distributeProposalWithWorkers = (text: string, signal?: AbortSignal) => requestAi('distribute', text, signal) as Promise<ProposalAssignment[]>;
