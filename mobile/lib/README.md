# lib

> **最終更新日**: 2026-10-27
> **更新者**: AI (Codex)

## 概要

アプリ起動・認証と各画面の実装。main.dartは認証読込中のホーム用スケルトンを使用する。

## フォルダ構成

- `config/`
- `data/`
- `forms/`
- `main.dart`
- `models/`
- `providers/`
- `routing/`
- `screens/`
- `services/`
- `theme/`
- `widgets/`
- `README.md` — このフォルダの案内

2026-10-26 / AI (Codex): `services/teamnote_api.dart` と `widgets/nishimatsu_report_sheet.dart` に月次文書の提出保存を接続。管理側のWeb表示と同じ月次保存先を使用する。

2026-10-27 / AI (Codex): shell／ideas／profileとhome_sceneの共通UIを承認画像に合わせて更新。設定をプロフィールへ移し、投稿シートの入力状態はシート自身が管理して画面遷移時の破棄済み参照を防ぐ。
