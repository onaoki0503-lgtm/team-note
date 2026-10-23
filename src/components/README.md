# components

> **最終更新日**: 2026-10-23
> **更新者**: AI (Codex)

## 概要

Hヴィレッジの各画面。重複導線整理、吹き出しと背景、入力保持を改良。

## フォルダ構成

- `AppShell.tsx` — 関連実装・資料
- `IdeaBubble.tsx` — 関連実装・資料
- `InventoryView.tsx` — 備品台帳・資料取り込み・反映前の確認
- `IdeaFlowViews.tsx` — 関連実装・資料
- `ProjectDetailView.tsx` — 関連実装・資料
- `ProjectListView.tsx` — 関連実装・資料
- `README.md` — 関連実装・資料
- `RosterArchiveViews.tsx` — 関連実装・資料
- `ScreenLoading.tsx` — 全画面のスケルトンと描画準備
- `StartIdeaButton.tsx` — 関連実装・資料
- `StepWorkflowView.tsx` — 関連実装・資料
- `VillageScene.tsx` — 関連実装・資料
- `VoiceWorkReport.tsx` — 関連実装・資料
- `WorkStorageViews.tsx` — 関連実装・資料

- 2026-10-18 / AI (Codex): Liquid Glass UI・全画面スケルトン・Workers接続と確認手順を反映。

- 2026-10-16 / AI (Codex): 音声中心の業務報告画面と保存前確認を追加。

- 2026-10-19 / AI (Codex): RosterArchiveViewsの手入力履歴を廃止。VoiceWorkReportを同一本文への追記型音声入力へ変更し、WorkStorageViewsの報告欄へ統合。

- 2026-10-19 / AI (Codex): InventoryView.tsxを追加し、固定の備品サンプル一覧を資料取り込み付き台帳へ置換。

- 2026-10-20 / AI (Codex): InventoryViewの2つの操作をタイトル横へ小さく配置し、取込中・確認時以外の大きなカードを廃止。

- 2026-10-20 / AI (Codex): InventoryViewの静的な登録説明・容量注意書きを削除。

- 2026-10-20 / AI (Codex): IdeaFlowViewsを項目フォーム・音声入力・分配候補確認へ変更し、AppShellの動きボタンを削除。登録後の追加情報も表示。

- 2026-10-20 / AI (Codex): IdeaFlowViewsの項目別マイクを廃止。全体音声入力1つ・正常終了後の自動分配・候補確認へ統一。

- 2026-10-22 / AI (Codex): IdeaBubbleの浮遊周期・開始位相・揺れ幅を投稿IDごとに設定。読んでいる1枚だけを止め、他の吹き出しは漂い続ける。自動交代は読んでいる間停止。

- 2026-10-22 / AI (Codex): IdeaBubbleのランダム交代と既存スロットへの差し替えを廃止。上限内の新規投稿は別の吹き出しとして末尾に追加し、既存本文と位置を維持。12件までスクロールして表示する。

- 2026-10-22 / AI (Codex): IdeaBubbleを1画面の短いプレビューへ変更。6種類の白いSVG輪郭・大きさ・位相を投稿IDから選択。タップで全文・いいね・本人の削除・企画化を開き、閉じると元の吹き出しへフォーカスを戻す。

- 2026-10-22 / AI (Codex): IdeaBubbleで約10秒ごとに1枚だけポップ。可能なら直前と別の投稿を選び、触れている／フォーカス中の投稿は除外する。入力・詳細表示・非表示・減動時にはスケジュールを停止し、再開時の連続発火を避ける。

- 2026-10-22 / AI (Codex): IdeaBubbleでポップ中のポインター進入・フォーカス時に即表示へ復帰し、透明のまま停止する状態を防止。

- 2026-10-22 / AI (Codex): IdeaBubbleの定期ポップ間隔を10000msから4000msへ変更。消失と再出現・操作時停止を維持。

- 2026-10-22 / AI (Codex): IdeaBubbleで保存成功後にだけ入力を空にする。送信中の二重操作を防ぎ、保存失敗の案内と本文保持に対応。

- `ProfileFields.tsx` — 初回・更新共通の名前／役職／棟／階／部屋番号フォーム。
- `SharedLogin.tsx` — 通常のメール認証と初回参加コード。
- `SharedProfile.tsx` — 共有プロフィールの本人編集・他人の閲覧・ログアウト。

2026-10-23 / AI (Codex): 共有モードではなりすまし切替と名簿からの直接追加を隠す。IdeaBubbleは保存成功後だけ入力を消し、接続状態を表示。

2026-10-23 / AI (Codex): AppShellの団体名に操作デモの識別を追加。通常の共有画面には付けない。
