# 追加マイグレーション

> **最終更新日**: 2026-10-26
> **更新者**: AI (Codex)

- `20261026004612_management_dashboard.sql` — 既存teamnote_realtime.sql／teamnote_extend_v2.sqlの後に適用。管理用の2つのprivateテーブル・専用RPC・報告添付の読み取りポリシーを追加。管理者の実アカウントは一切登録しない。
- `README.md` — この案内。

Supabase CLIのmigration newで作成。対象yccdpqafbdhfjjkpiowoへSQL Editorから手動適用済みであり、CLIのmigration履歴へ自動登録したとは扱わない。再実行可能な構成。旧試作schema.sql／seed.sqlを共有DBに実行しない。
