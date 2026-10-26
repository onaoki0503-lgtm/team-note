import type { ManagementReport, ManagerContext } from './types';
export const demoManager: ManagerContext = { communityId: 'h-village', communityName: 'Hヴィレッジ', userId: 'demo-manager', name: '管理担当', organization: '寮運営' };
const authors = [
  { id: 'a', name: '寮生A', role: 'HL', building: 'rosemary', unit: '301-A' },
  { id: 'b', name: '寮生B', role: 'FL', building: 'basil', unit: '202-B' },
  { id: 'c', name: '寮生C', role: 'HL', building: 'turmeric', unit: '104-A' },
  { id: 'd', name: '寮生D', role: 'FL', building: 'paprika', unit: '401-B' },
];
export function createDemoReports(month: string): ManagementReport[] {
  return authors.map((author, i) => ({
    id: `demo-monthly-${author.id}`, month, submittedAt: `${month}-${String(26 - i).padStart(2, '0')}T03:30:00Z`, author,
    body: `西松地所株式会社 御中\nHヴィレッジ 役職者活動報告書 ${month.replace('-', '年')}月分\n\n【基本情報】\n氏名: ${author.name}　役職: ${author.role}\n部屋: ${author.unit}\n不在日・期間: なし\n\n1. 活動報告\n■ 役職固有業務\n共用キッチンの清掃と備品の確認を行いました。\n\n■ 役職連携業務\n他棟の担当者と連携して、新入寮生に共用施設の使い方を案内しました。\n\n■ 役職共通業務\nフロアミーティングを実施し、ゴミ分別のルールを確認しました。\n\n2. トラブル対応など報告\n廊下の照明の点滅を確認し、寮母さんに共有しました。交換対応済みです。\n\n3. ユニット立ち入り記録\n該当なし\n\n4. 学生寮について気づいたこと・要望・意見など\n${i % 2 === 0 ? '清掃用の洗剤の補充をお願いします。' : '特になし'}`,
  }));
}
