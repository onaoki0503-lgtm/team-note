# Supabase定義

> **最終更新日**: 2026-10-23
> **更新者**: AI (Codex)

## フォルダ構成

- `schema.sql` — 旧試作のスキーマ。共有restaurantへ実行しない。
- `seed.sql` — 旧試作の初期データ。共有restaurantへ実行しない。
- `teamnote_realtime.sql` — 今回適用済みの追加専用スキーマ・所属RLS・RPC・Realtime対象。
- `README.md` — 運用案内。

既存restaurantのテーブル・Auth設定・課金を変更せず、tn_テーブルとteamnote_privateを追加。実参加コード・秘密キーはソースへ記録しない。CLIのmigration履歴とは別の管理画面適用用SQL。権限検証は../tests/teamnote-cloud-rls.sqlで全体をROLLBACKする。本人ログイン後の通し確認は未完了。
