# test/support

> **最終更新日**: 2026-10-28
> **更新者**: AI (Codex)

## 概要

home_preview.dartは検証専用の架空データ画面。Supabaseや認証へ接続しない。配布用の入口には使用せず、リリースはlib/main.dartを指定する。

## フォルダ構成

- `home_preview.dart`
- `README.md` — このフォルダの案内

2026-10-27 / AI (Codex): home_preview.dartは実装と同じTeamNoteHeaderを使用。`--dart-define=PREVIEW_IDEA_COUNT=2` で参考画像に近い2件を表示できる。認証・実DBは初期化しないテスト専用エントリー。

2026-10-28 / AI (Codex): home_preview.dartは40件までの日時付き架空データを提供。投稿しても古い項目を削除しない。
