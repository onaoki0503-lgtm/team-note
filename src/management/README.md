# 管理ダッシュボード

> **最終更新日**: 2026-10-26
> **更新者**: AI (Codex)

西松地所・寮母向けのWeb画面。入口は`?view=management`。寮生用の4タブとは別の画面で、同じ認証と既存の提出報告書を使用する。管理者はresident参加・プロフィール役職ではなく、DBの専用許可リストで判定する。

## 機能

月別一覧・全文検索・棟／業務／確認状態の絞り込み、提出者別集計、報告全文と添付、確認済み／未確認への変更、確認者と日時、CSV、詳細印刷。確認状態は版番号で競合を検出し、元の報告本文を編集しない。添付は権限確認付き60秒の署名URLを使う。画面を表示している間は60秒ごととウィンドウ復帰時に更新する。

白いLiquid Glass、青い操作ボタン（#183181）、浮遊背景・カードと行の登場・グラフ・モーダルの動き、画面全体のスケルトンを実装。OSの動きを減らす設定に対応。みずほのコズミックブルーは https://www.mizuho-fg.co.jp/company/info/brand/b_logo.html を参考にした。銀行のロゴ等は使用しない。

## 確認

`npm run dev -- --port 5177` → http://127.0.0.1:5177/?view=management&demo=1 。架空の24件を使い、共有DBに接続しない。デモの変更は画面内だけ。本番は`demo=1`を付けずに開く。

`npm run test:management:data`、`npm run test:management`、`npm run build`、`npm run lint`。

## 管理者の登録

代表の回答に従い、メールアドレスは後で登録する。今回、実アカウントへ管理者権限を付与していない。本人が確認済みのAuthアカウントを作成した後、プロジェクト管理者がSQL Editorから`teamnote_private.management_reviewers`へcommunity_id・user_id・display_name・organizationを登録する。ユーザー編集可能なプロフィールやuser_metadataのroleは認可に使わない。登録を一般アプリから行うAPIは設けていない。利用停止は同じ行のactiveをfalseにする。

## DB

`supabase/migrations/20261026004612_management_dashboard.sql`。2026-10-26に既存restaurantプロジェクトへSQL Editorから適用済み。管理者一覧と確認状態の2テーブルはprivateスキーマ内でRLSを有効化、直接の利用権限を与えない。公開RPCは認証済みユーザーだけ実行でき、内部で管理者の所属・有効状態とauth.uid()を毎回検証する。添付の許可は同じ寮の報告に実際に添付されたtn-files/reports配下だけ。既存の寮生向けRPC・Auth設定・レストランのデータは変更していない。

`tests/management-rls.sql`は実DBで実行済み。22項目を検証し全変更をrollback。実行後は報告4件・管理者0・確認状態0・検証用報告0を確認した。管理者未登録なので、本物の管理者ログインからの通し試験は未実施。署名URLの操作はブラウザの模擬APIと実DBの権限ヘルパーで検証し、実ファイルの取得は未実施。

## ファイル

- `ManagementApp.tsx` — 管理用認証と権限のゲート
- `ManagementDashboard.tsx` — 一覧・集計・詳細・確認操作と全画面スケルトン
- `api.ts` — 専用RPC・署名URL
- `data.ts` — 期間・絞り込み・CSVの安全な生成
- `demo.ts` — 架空データのみ
- `types.ts` — 管理画面のデータ形式
- `management.css` — 独立した表示・動き・レスポンシブ・印刷
- `README.md` — この案内
