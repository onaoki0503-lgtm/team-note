# チームノート AI Worker

> **最終更新日**: 2026-10-23
> **更新者**: AI (Codex)

Cloudflare Workersの`POST /api/ai`が議題抽出・企画書生成を受け、Workers AIバインディングで推論する。ブラウザにプロバイダーのAPIキーを保存・配信しない。サイト本体のホスティングは移行しない。

## 起動と確認

アプリ直下から`npm run worker:dev`、別ターミナルで`npm run dev`。Viteの`/api/ai`は127.0.0.1:8787へ転送する。WranglerのCloudflare認証が必要。ローカルでもWorkers AIの推論はCloudflare上で実行される。

`npm run worker:check`は型と正式バンドルの検査のみで、アップロードしない。`npm run test`はテスト専用の別ポート・別ブラウザ環境を使う。実モデルの確認と、試験用AI応答による回帰試験を区別する。

## 接続設定

- `wrangler.jsonc`: AIモデル、Workers AIバインディング、10回／60秒のIP別レート制限、許可Originを設定。
- 本番URLを使う場合は、そのOriginを明示し、アプリ側の`VITE_AI_WORKER_URL`に`https://.../api/ai`を設定する。ワイルドカードOriginは使わない。
- 本文は12,000文字、HTTP本文は65,536バイトまで。タスクは`distribute`（現在の企画フォーム用）、`topics`と`proposal`（旧互換）。AIのJSONはサーバー・クライアント両側で検証。
- 生ログ・本文をログへ書かず、応答は`no-store`。入力にない予算・日付・承認を確認済みとして生成させない。
- 現時点のOrigin制限・レート制限は団体別の本人認証ではない。多団体向け本番化で所属確認と利用上限を接続する。
- 公開操作は今回未実施。`workers_dev: false`を維持し、今回の認証・開発サーバー起動を外部公開と混同しない。

## 参照

- [Cloudflare：Workers AI bindings](https://developers.cloudflare.com/workers-ai/configuration/bindings/)
- [Cloudflare：JSON Mode](https://developers.cloudflare.com/workers-ai/features/json-mode/)
- [Cloudflare：Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)

## フォルダ構成

- `README.md` — 本案内
- `src/` — 本番Worker
- `tsconfig.json` — Workerの型検査
- `wrangler.jsonc` — Cloudflareの実行設定

- 2026-10-18 / AI (Codex): Cloudflare認証保存と実AIの議題抽出・企画書生成（両方HTTP 200）を確認。Worker契約試験14件、実Chrome操作試験20件が合格。外部への公開操作は未実施。

- 2026-10-20 / AI (Codex): distributeタスクは2,400文字・出力900トークン上限。原文に一致する抜粋だけを返し、補完や全文生成を避ける。通常作成ではAIを呼ばない。

- 2026-10-20 / AI (Codex): 最終Worker17件が全件合格。実ブラウザから短い分類distributeのHTTP 200を確認（1,872ms）。通常の再接続で開発環境を復旧済み。

## 2026-10-23：公開接続

代表の最新版公開指示により、team-note-aiを既存Cloudflareアカウントへ初回配備する。wrangler.jsoncにアカウントを明示しworkers_devをtrueへ、preview_urlsはfalse。許可Originへhttps://onaoki0503-lgtm.github.ioを追加。既存の他サービスは更新しない。クライアント側VITE_AI_WORKER_URLには配備結果のHTTPS URL＋/api/aiをビルド時に指定。公開後の接続結果は案件READMEへ記録する。上記「未公開」「workers_dev:false」は10月20日時点の履歴。

2026-10-23 / AI (Codex): 専用Workerをhttps://team-note-ai.o-naoki0503.workers.devへ初回配備済み。公開Originのプリフライト204を確認。実モデルが一部の抜粋を言い換える場合は、その候補だけ除外し原文一致の候補を維持する修正を追加。架空の試験文で診断し、利用者の文章はログに保存していない。
