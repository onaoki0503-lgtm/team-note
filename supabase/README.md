# Supabase定義

> **最終更新日**: 2026-10-26
> **更新者**: AI (Codex)

## 適用順

1. `teamnote_realtime.sql` — 初回（members / ideas / reactions / RLS / board RPCs + Realtime publication）
2. `teamnote_extend_v2.sql` — プロフィール拡張（bio・avatar）＋企画（`tn_projects`）・報告（`tn_work_reports`）・備品（`tn_inventory_items`）・資料
3. 既存DBへ reactions の Realtime だけ追加する場合: `teamnote_realtime_reactions.sql`

`schema.sql` / `seed.sql` は旧試作。共有restaurantへ実行しない。命名メモ: アプリが使うのは `tn_projects` / `tn_inventory_items`（`tn_proposals` / `tn_inventory` という別名テーブルはない）。

## Auth（web + モバイル）

詳しくは `../docs/OWNER_AUTH_SETUP.md`。

Supabase Dashboard → Authentication → Providers:

- Email（既存）
- Google（有効化 + Web Client ID/Secret、Skip nonce checks ON）
- Apple（ネイティブ iOS：Client IDs に `com.teamnote.teamNoteMobile`。Services ID / Secret は不要）

**Manual linking = OFF**（同じ確認済みメールで email ↔ Google ↔ Apple を自動リンク）

Redirect URLs: `teamnote://login-callback` + web origins

Storage buckets created by v2: `tn-avatars` (public), `tn-files` (private).

## 権限検証

`../tests/teamnote-cloud-rls.sql`（ROLLBACK）。v2テーブル用の追加試験は未作成。

## 2026-10-26：管理ダッシュボード

- `migrations/20261026004612_management_dashboard.sql` — 管理者のサーバー側許可リスト・報告確認用RPC・添付ポリシー

- `migrations/20261026044814_monthly_report_submissions.sql` — 提出時点の月次文書を日常ログから分離して保存し、管理者へ月別に返す。実DB適用・21項目のrollback試験済み。既存管理権限とポリシーは元の定義を維持。
