/** Module metadata is display configuration, never a source of authorization. */
export type OperationId = 'monthly' | 'repairs' | 'bedding' | 'training';
export interface OperationModule {
  id: OperationId; name: string; available: boolean; description: string;
  steps: readonly string[]; records: readonly string[]; decisions: readonly string[];
}
export const operationModules: readonly OperationModule[] = [
  { id: 'monthly', name: '月次報告書', available: true, description: '提出された報告書を月ごとに確認します。', steps: ['入力・提出', '提出者を確認', '報告書の全文を読む'], records: ['対象月・提出者', '提出日時・本文'], decisions: [] },
  { id: 'repairs', name: '破損・設備対応', available: false, description: '写真で報告し、承認から対応完了までつなぎます。', steps: ['写真・場所を登録', '確認・承認', '西松地所へ正式報告', '対応・完了'], records: ['場所・症状・写真', '報告・承認・対応日時', '担当・状態・対応内容'], decisions: ['確認・承認する担当者', '正式な報告先と対応担当', '緊急時の既存連絡手段'] },
  { id: 'bedding', name: '布団の入れ替え', available: false, description: '受け取り・返却を記録し、未対応者への案内をまとめます。', steps: ['対象者・期限を設定', 'QRで実施を記録', '未対応者を確認', '対象者へリマインド'], records: ['実施回・対象者・期限', '受け取りと返却を分けた状態', '処理日時・案内履歴'], decisions: ['返却・受け取りの実際の手順', 'QRを読む人と本人確認の方法', '未対応・対象外・訂正の扱い'] },
  { id: 'training', name: '研修・説明会', available: false, description: '案内・出欠回答・当日の出席をまとめて扱います。', steps: ['対象者へ案内', '出欠・日程の回答', '未回答者へ案内', '当日の出席を記録'], records: ['対象者・開催日時', '出欠回答・実際の出席', '案内・回答・出席の日時'], decisions: ['日程調整と確定日への出欠の区別', '対象となる役職・担当者', '欠席・代理参加・再案内の扱い'] },
];
export type OperationSection = OperationId | 'overview';
export function operationSection(search: string): OperationSection {
  const value = new URLSearchParams(search).get('section');
  return operationModules.some(m => m.id === value) ? value as OperationId : 'overview';
}
