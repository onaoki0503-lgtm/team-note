# lib

> **最終更新日**: 2026-10-28
> **更新者**: AI (Codex)

## 概要

既存データ層に加え、団体表示設定community.tsと画面履歴navigation.tsxを管理。

## フォルダ構成

- `README.md` — 関連実装・資料
- `activityHistory.ts` — スタッフ参加記録から読み取り専用の活動履歴を生成
- `aiContract.ts` — Workerと共有するAI出力型・検証
- `community.ts` — 関連実装・資料
- `database.types.ts` — 関連実装・資料
- `db.ts` — 関連実装・資料
- `ideaBoard.ts` — 吹き出しの追加・表示期限・12件上限・非表示記録
- `ideaValidation.ts` — 投稿内容の検証
- `inventoryImport.ts` — CSV解析・列対応・備品の照合・検証
- `inventoryReader.ts` — ファイル読み込み・中止・タイムアウト
- `inventoryReader.worker.ts` — Excel・CSVを別Workerで解析
- `inventoryTemplate.ts` — 入力案内・記入例・入力欄付きCSVの生成
- `inventoryStorage.ts` — 団体IDごとの端末保存
- `navigation.tsx` — 関連実装・資料
- `proposalForm.ts` — 企画項目・分配と検証・企画書への整形
- `proposalDraft.ts` — 利用者別下書きの復元
- `supabase.ts` — 関連実装・資料
- `useIdeaBoardSync.ts` — 同一オリジンの別タブ同期・Web Locksによる保存・エラー保持
- `useCalendarDay.ts` — 日付更新の追従
- `useSpeechInput.ts` — 関連実装・資料
- `workReportVoice.ts` — 関連実装・資料

- 2026-10-18 / AI (Codex): Liquid Glass UI・全画面スケルトン・Workers接続と確認手順を反映。

- 2026-10-16 / AI (Codex): 音声入力の制御・日付解釈・報告本文生成、端末保存の追加型情報を管理。

- 2026-10-19 / AI (Codex): activityHistory.tsでスタッフ参加から表示内容を生成。離脱・スタッフ削除時の参加記録を保持し、プロフィールから経歴を変更する経路を除去。

- 2026-10-19 / AI (Codex): 備品ファイルのWorker解析、列対応・照合・行エラー検証と団体IDごとの端末保存を追加。

- 2026-10-20 / AI (Codex): inventoryTemplate.tsで入力案内・記入例・空欄付きCSVを生成し、正しいCSVエスケープを共通化。

- 2026-10-20 / AI (Codex): proposalForm.tsで項目定義・端末内分類・原文一致の検証・企画書への整形を共有。proposalDraft.tsで利用者別の下書きを復元。

- 2026-10-20 / AI (Codex): useSpeechInputに正常終了時の完了通知を追加。確定した全体メモを一度だけ分配し、認識失敗や画面離脱では通知しない。既存の報告入力は維持。

- 2026-10-20 / AI (Codex): 項目名より前に自由な文章がある場合は端末内分類で捨てず、全体をWorkers分類へ渡す。

- 2026-10-22 / AI (Codex): ideaBoard.tsで表示対象・作成順・7日間の無反応・12件上限を共通管理。反応日時のない旧データは一度だけ観測開始日を保存し、表示終了後も原文を保持。community.tsに上限・期間を設定。

- 2026-10-22 / AI (Codex): useIdeaBoardSyncを追加。同一端末・同一オリジンの別タブへ即時反映し、Web Locksで同時更新を直列化。別端末共有は未接続。

- `teamnoteCloud.ts` — 専用の公開接続変数・認証クライアント・共有応答検証・12秒の通信制限。
- `SharedIdeas.tsx` — 認証／所属ゲート・Realtime・再同期・同じIDでの再送。
- `sharedIdeasContext.ts` — 共有状態と操作のコンテキスト。

2026-10-23 / AI (Codex): 共有モードでは端末のデモ投稿を読込・上書きしない。旧dbServiceと別クライアントに分け、プロフィールとアイデアだけ実DBへ接続。本人ログイン後の実接続確認は未完了。

2026-10-23 / AI (Codex): teamnoteCloud.tsはdemo=1の場合に共有クライアントを作らず端末内デモを選択する。認証情報や所属RLSには変更なし。

2026-10-26 / AI (Codex): `teamnoteReports.ts` に `tn_submit_monthly_report` 呼出しを追加。本文・対象月と応答を検証し、失敗を成功扱いしない。

2026-10-28 / AI (Codex): ideaBoard.tsは保存済みの全投稿を安定した日時順に返し、旧capacity／inactiveフラグでは隠さない。useIdeaBoardSync.tsは件数・期限の自動処理を廃止。削除済み投稿はAPI／保存データから除かれ、復元対象外。
