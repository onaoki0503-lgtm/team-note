# 追加マイグレーション

> **最終更新日**: 2026-10-26
> **更新者**: AI (Codex)

- `20261026004612_management_dashboard.sql` — 既存teamnote_realtime.sql／teamnote_extend_v2.sqlの後に適用。管理用の2つのprivateテーブル・専用RPC・報告添付の読み取りポリシーを追加。管理者の実アカウントは一切登録しない。
- `README.md` — この案内。

Supabase CLIのmigration newで作成。対象yccdpqafbdhfjjkpiowoへSQL Editorから手動適用済みであり、CLIのmigration履歴へ自動登録したとは扱わない。再実行可能な構成。旧試作schema.sql／seed.sqlを共有DBに実行しない。

- `20261026044814_monthly_report_submissions.sql` — 月次提出文書のprivateテーブルと寮生の提出／管理者の閲覧RPC。SQL Editorから適用済み。旧管理APIと添付ポリシーは最終的に元の権限を維持。新しい管理者の登録や既存報告の月次提出扱いはしない。

新しい月次定義の検証は `../../tests/monthly-report-rls.sql`。21項目成功、全テスト変更rollback。最終状態は月次0件・従来の業務報告4件・管理者0人。
