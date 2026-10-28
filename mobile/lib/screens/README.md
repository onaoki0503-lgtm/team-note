# lib/screens

> **最終更新日**: 2026-10-28
> **更新者**: AI (Codex)

## 概要

利用者向け画面。ideas_screen.dartは共有データの操作を維持した白いガラス調ホーム、shell_screen.dartは共通ヘッダーと4タブを管理する。

## フォルダ構成

- `archive_screen.dart`
- `archives_list_screen.dart`
- `ideas_screen.dart`
- `inventory_screen.dart`
- `join_screen.dart`
- `login_screen.dart`
- `profile_screen.dart`
- `project_detail_screen.dart`
- `projects_screen.dart`
- `proposal_screen.dart`
- `roster_screen.dart`
- `settings_screen.dart`
- `shell_screen.dart`
- `step_workflow_screen.dart`
- `work_screen.dart`
- `README.md` — このフォルダの案内

2026-10-26 / AI (Codex): Alanの4af73a0を取得。320px・文字拡大・キーボード表示で件数と更新ボタンの行がはみ出したため、件数側を可変幅にして省略表示を追加。読み上げ用の件数は全文を保持する。

2026-10-27 / AI (Codex): ideas_screenは青い投稿ボタンから入力シートを表示。shell_screenは共通の大きなアプリ名・白いプロフィール・文字タブを使用。profile_screenへ設定入口を移し、プロフィール表示中の背景モーションを停止する。

2026-10-28 / AI (Codex): ideas_screen.dartでIdeaTimelineを使用し、投稿欄・タブを固定。入力シートと詳細操作は維持。

2026-10-28 / AI (Codex): 代表の訂正を反映し、LINE風の発言者・日時・左右色分けを撤去。元の白い吹き出しと浮遊・4秒の消失ポップを復元し、過去へのスクロールだけを継続。詳細にも投稿者を表示しない。投稿者IDや作成日時の保存・権限判定は維持。画面・入力・減動時の停止を維持。
