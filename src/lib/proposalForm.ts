import { emptyProposal, type ProposalDocument } from './aiContract.ts';

export const PROPOSAL_FIELDS = [
  { key: 'title', label: '企画名', hint: '何を実施・改善する企画か', required: true, max: 120, aliases: ['企画名', 'タイトル'] },
  { key: 'background', label: '背景・課題', hint: '現状と、解決したいこと', required: true, max: 1800, aliases: ['背景・課題', '背景', '課題'] },
  { key: 'objective', label: '目的', hint: '何のために行うか', required: true, max: 1200, aliases: ['目的'] },
  { key: 'proposalOverview', label: '実施内容', hint: '何を、どのように行うか', required: true, max: 1800, aliases: ['実施内容', '内容'] },
  { key: 'implementationDate', label: '実施日時', hint: '予定日・時間。決まっていない場合は「未定」', required: true, max: 200, aliases: ['実施日時', '開催日時', '日時', '日程'] },
  { key: 'location', label: '場所', hint: '棟・部屋・会場。未定の場合は「未定」', required: true, max: 200, aliases: ['開催場所', '実施場所', '場所'] },
  { key: 'targetAudience', label: '対象・人数', hint: '誰が参加するか・予定人数', required: true, max: 400, aliases: ['対象・人数', '対象者', '対象', '参加人数'] },
  { key: 'responsible', label: '担当・役割', hint: '責任者と各担当。未定の役割も記載', required: true, max: 1000, aliases: ['担当・役割', '責任者', '担当者', '担当'] },
  { key: 'actionSteps', label: '準備・当日の手順', hint: '準備、実施、片づけの順に1行ずつ', required: true, max: 1800, aliases: ['準備・当日の手順', '導入手順', '準備手順', '手順'] },
  { key: 'requirements', label: '安全・確認事項', hint: '危険への対策、使用許可、関係者への確認', required: true, max: 1800, aliases: ['安全・確認事項', '安全対策', '確認事項', '安全'] },
  { key: 'totalCostEstimate', label: '予算・調達方法', hint: '概算費用・支出元・必要な物。未確認は「未確認」', required: true, max: 1000, aliases: ['予算・調達方法', '予算', '費用'] },
  { key: 'expectedImpact', label: '成果・振り返り方法', hint: '実施後に何を確認するか', required: false, max: 1000, aliases: ['成果・振り返り方法', '期待する効果', '振り返り', '成果'] },
  { key: 'submittedTo', label: '提出先', hint: '確認・承認を依頼する相手', required: false, max: 200, aliases: ['提出先'] },
  { key: 'submittedDate', label: '提出日', hint: '提出予定日', required: false, max: 100, aliases: ['提出日'] }
] as const;
export type ProposalField = typeof PROPOSAL_FIELDS[number]['key'];
export type ProposalForm = Record<ProposalField, string> & { projectType: 'event' | 'operation' };
export type ProposalAssignment = { field: ProposalField; quote: string };
export const MAX_DISTRIBUTION_INPUT = 2400;
export function newProposalForm(initial = ''): ProposalForm {
  return { ...Object.fromEntries(PROPOSAL_FIELDS.map(field => [field.key, ''])), projectType: 'operation', proposalOverview: initial } as ProposalForm;
}
export function proposalErrors(form: ProposalForm) {
  return PROPOSAL_FIELDS.flatMap(field => field.required && !form[field.key].trim() ? [`${field.label}を入力してください。`] : form[field.key].length > field.max ? [`${field.label}は${field.max}文字以内で入力してください。`] : []);
}
export function formToProposal(form: ProposalForm): ProposalDocument {
  const lines = (text: string) => text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  return { ...emptyProposal(), title: form.title.trim(), projectType: form.projectType, background: form.background.trim(), objective: form.objective.trim(), proposalOverview: form.proposalOverview.trim(), proposalConcept: form.proposalOverview.trim(), implementationDate: form.implementationDate.trim(), responsible: form.responsible.trim(), location: form.location.trim(), targetAudience: form.targetAudience.trim(), actionSteps: lines(form.actionSteps), requirements: lines(form.requirements), totalCostEstimate: form.totalCostEstimate.trim(), expectedImpact: form.expectedImpact.trim(), submittedTo: form.submittedTo.trim(), submittedDate: form.submittedDate.trim(), summaryText: form.objective.trim() };
}
export function localAssignments(text: string): ProposalAssignment[] {
  const aliases = PROPOSAL_FIELDS.flatMap(field => field.aliases.map(alias => ({ alias, field: field.key }))).sort((a, b) => b.alias.length - a.alias.length);
  const regex = new RegExp(`(?:^|[\\n。！？!?、\\s])\\s*(${aliases.map(item => item.alias).join('|')})(?:は|が|[:：])\\s*`, 'g');
  const markers = [...text.matchAll(regex)];
  // A leading free-form sentence must not be dropped by the local shortcut.
  if (!markers.length || text.slice(0, markers[0].index).trim()) return [];
  return markers.map((marker, index) => ({ field: aliases.find(item => item.alias === marker[1])!.field, quote: text.slice(marker.index! + marker[0].length, markers[index + 1]?.index ?? text.length).replace(/[。\s]+$/, '').trim() })).filter(item => item.quote).reduce<ProposalAssignment[]>((result, item) => {
    const existing = result.find(entry => entry.field === item.field);
    if (existing) existing.quote += `\n${item.quote}`; else result.push(item);
    return result;
  }, []);
}
export function isAssignments(value: unknown, text: string): value is ProposalAssignment[] {
  return Array.isArray(value) && value.length > 0 && value.length <= PROPOSAL_FIELDS.length && new Set(value.map(item => item?.field)).size === value.length && value.every(item => item && typeof item === 'object' && PROPOSAL_FIELDS.some(field => field.key === item.field) && typeof item.quote === 'string' && item.quote.trim().length > 0 && item.quote.length <= 300 && text.includes(item.quote));
}
