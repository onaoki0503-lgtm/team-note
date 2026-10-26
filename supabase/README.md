# Supabase定義

> **最終更新日**: 2026-10-26
> **更新者**: AI (Codex)

## 適用順

1. `teamnote_realtime.sql` — 初回（members / ideas / RLS / board RPCs）
2. `teamnote_extend_v2.sql` — プロフィール拡張（bio・avatar）＋企画・報告・備品・資料

`schema.sql` / `seed.sql` は旧試作。共有restaurantへ実行しない。

## Auth（web + モバイル）

詳しくは `../docs/OWNER_AUTH_SETUP.md`。

Supabase Dashboard → Authentication → Providers:

- Email（既存）
- Google（有効化 + Web Client ID/Secret、Skip nonce checks ON）
- Apple（任意）

**Manual linking = OFF**（同じ確認済みメールで email ↔ Google を自動リンク）

Redirect URLs: `teamnote://login-callback` + web origins

Storage buckets created by v2: `tn-avatars` (public), `tn-files` (private).

## 権限検証

`../tests/teamnote-cloud-rls.sql`（ROLLBACK）。v2テーブル用の追加試験は未作成。

## 2026-10-26：管理ダッシュボード

- `migrations/20261026004612_management_dashboard.sql` — 管理者のサーバー側許可リスト・報告確認用RPC・添付ポリシー
