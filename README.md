# チームノート公開成果物

> **最終更新日**: 2026-10-29
> **更新者**: AI (Codex)

既存GitHub Pages用のビルド成果物。ソースはmain d1bcac14861cde6074c3bed002d7ba6a5e8988ac。GitHub Pages／Supabase／専用Workers構成を維持。JWTを送るWebとJWT所属確認Workerを同日に更新する。TestFlightは別配信。

## フォルダ構成

- `index.html` — アプリ入口
- `assets/` — ハッシュ付きJS・CSS・Worker
- `release.json` — ソース版・ビルド日時
- `.nojekyll` — 静的成果物をそのまま配信
- `README.md` — この案内
- `manifest.json`、`favicon.svg`、`icons.svg`、各画像 — 既存の公開素材

公開キーはブラウザ用publishableキーだけを使用。service_role・秘密鍵・個人セッションは含まない。
