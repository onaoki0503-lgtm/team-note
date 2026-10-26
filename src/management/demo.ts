import type { ManagementReport, ManagerContext } from './types';

export const demoManager: ManagerContext = { communityId: 'h-village', communityName: 'Hヴィレッジ', userId: 'demo-manager', name: '管理担当', organization: '寮運営' };
const authors = [
  { id: 'a', name: '寮生A', role: 'HL', building: 'rosemary', unit: '301-A' },
  { id: 'b', name: '寮生B', role: 'FL', building: 'basil', unit: '202-B' },
  { id: 'c', name: '寮生C', role: 'HL', building: 'turmeric', unit: '104-A' },
  { id: 'd', name: '寮生D', role: 'FL', building: 'paprika', unit: '401-B' },
];
const examples = [
  ['共用キッチンの清掃・備品確認', '役職固有業務', '共用キッチンの床・作業台・排水口を清掃しました。\n消耗品を確認し、不足していた洗剤を補充しました。\n設備の異常はありません。', '共用キッチン'],
  ['共用廊下の照明不具合', 'トラブル対応', '3階廊下の照明が点滅していました。\n安全を確認し、寮母さんに状況を共有しました。\n交換対応の確認をお願いします。', '3階共用廊下'],
  ['フロアミーティングの実施', '役職共通業務', '今月のフロアミーティングを実施しました。\nゴミ分別と共用スペースの利用について確認しました。', '談話室'],
  ['新入寮生への生活案内', '役職連携業務', '担当FLと連携して、新入寮生への生活案内を行いました。\n共用施設・緊急時の連絡先・清掃ルールを案内しました。', '共用ラウンジ'],
  ['ユニット設備の確認立ち入り', 'ユニット立ち入り', '事前に本人の了承を得て、設備確認のため立ち入りました。\n漏水や異常がないことを確認し、施錠して退室しました。', '301-A / 設備の確認'],
  ['共用ラウンジの整理', '役職固有業務', '共用ラウンジを整理し、忘れ物を所定の場所へ移しました。\nテーブルと椅子を清掃しました。', '共用ラウンジ'],
  ['備品の棚卸し', '役職連携業務', '他棟の担当者と備品を棚卸ししました。\n貸出中の備品を確認し、台帳を更新しました。', '備品庫'],
  ['夜間の騒音への対応', 'トラブル対応', '共用スペースの利用音について相談がありました。\n利用者に状況を伝え、静かな利用に協力いただきました。\nその後、同様の相談はありません。', '談話室'],
];

export function createDemoReports(month: string): ManagementReport[] {
  return Array.from({ length: 24 }, (_, i) => {
    const e = examples[i % examples.length], author = authors[i % authors.length];
    const day = String(25 - i).padStart(2, '0');
    return { id: `demo-report-${i + 1}`, title: e[0], category: e[1], body: e[2], reportDate: `${month}-${day}`, submittedAt: `${month}-${day}T06:30:00Z`, author, attachments: i % 3 === 0 ? [{ kind: 'file', label: '作業記録.pdf', path: 'demo/reports/sample.pdf' }] : [], locationLabel: e[3], review: { reviewed: i % 3 !== 0, reviewedAt: i % 3 !== 0 ? `${month}-${day}T08:00:00Z` : null, reviewerName: i % 3 !== 0 ? '管理担当' : '', version: i % 3 !== 0 ? 1 : 0 } };
  });
}
