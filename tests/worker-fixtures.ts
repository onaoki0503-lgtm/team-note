import { localAssignments } from '../src/lib/proposalForm.ts';
import { emptyProposal } from '../src/lib/aiContract.ts';
// Test-only upstream responses. This file is never imported by the production Worker.
export function fixtureProposal() {
  return { ...emptyProposal(), title: '中庭の上映会', projectType: 'event' as const, background: '寮生の交流を目的とした上映会。', location: '中庭', targetAudience: '寮生', objective: '寮生の交流', actionSteps: ['担当者に実施条件を確認する', '上映と片づけの担当を決める'], issues: ['利用時間の確認'], proposalOverview: '中庭で上映会を行う。', proposalConcept: '中庭で上映会を行う。', submittedDate: '未確認', submittedTo: '未確認' };
}
export const fixtureAi = {
  async run(_model: string, input: Record<string, unknown>) {
    const messages = input.messages as { content: string }[];
    const text = messages.at(-1)?.content || '';
    await new Promise(resolve => setTimeout(resolve, text.includes('応答待ち') ? 1800 : 450));
    if (text.includes('接続失敗')) throw new Error('Test upstream unavailable');
    if (text.includes('不正応答')) return { response: '{"title":null}' };
    if (messages[0].content.includes('分類だけ')) { if (text.includes('捏造のテスト')) return { response: JSON.stringify({ assignments: [{ field: 'title', quote: '存在しない内容' }] }) }; const found = localAssignments(text); return { response: JSON.stringify({ assignments: found.length ? found.map(item => ({ ...item, quote: item.quote.split('\n')[0] })) : [{ field: 'proposalOverview', quote: text.split('。')[0] }] }) }; }
    if (messages[0].content.includes('topicsに')) return { response: JSON.stringify({ topics: [{ id: 'topic-1', title: '中庭の上映会', projectType: 'event', summary: '中庭で寮生向けの上映会を検討する。', keyPoints: ['実施条件', '片づけ'] }] }) };
    return { response: JSON.stringify(fixtureProposal()) };
  }
};
