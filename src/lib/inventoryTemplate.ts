import { INVENTORY_FIELDS } from './inventoryImport';

export function inventoryCsv(rows: readonly (readonly string[])[]) {
  return '\uFEFF' + rows.map(row => row.map(value => /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value).join(',')).join('\r\n') + '\r\n';
}

export function createInventoryTemplate(communityName: string) {
  const width = INVENTORY_FIELDS.length;
  const pad = (values: string[]) => [...values, ...Array(Math.max(0, width - values.length)).fill('')];
  return inventoryCsv([
    pad([`${communityName} 備品台帳（入力用）`]),
    pad(['入力方法', '8行目以降に1行1備品で入力してください。7行目の見出しは変更しないでください。']),
    pad(['入力条件', '備品名は必須です。数量は0以上の数値のみ。単位は別の列に入力してください。数量の空欄は未記録、0は在庫なしとして扱います。']),
    pad(['更新方法', '管理番号は備品ごとに重複させず、BI-0001のような文字と数字の組み合わせを推奨します。同じ番号は数量を足さず更新します。']),
    [
      '列の説明：備品を区別する番号（任意）',
      '備品の正式名称（必須）',
      '保有数・在庫数（任意／0以上の数値）',
      '個・台・本・脚・巻・セット・Lなど（任意）',
      '棟・階・部屋・倉庫など（任意）',
      '良好・要点検・修理中・使用不可・要補充など（任意）',
      '型番・用途・点検事項など（任意）'
    ],
    ['記入例：BI-0001（この行は取り込み対象外）', 'パイプ椅子', '12', '脚', 'ローズマリー棟1階・共用倉庫', '良好', '折りたたみ式。行事の設営で使用。'],
    INVENTORY_FIELDS.map(field => field.label),
    ...Array.from({ length: 20 }, () => Array<string>(width).fill(''))
  ]);
}
