# チームノート Mobile

> **最終更新日**: 2026-10-26
> **更新者**: AI (Codex)

Native Flutter (iOS / Android). Supabase Auth + data. Not a WebView of the Vite app.

## Setup

1. Apply SQL (restaurant Supabase SQL Editor, in order):
   - `../supabase/teamnote_realtime.sql` (if not already)
   - `../supabase/teamnote_extend_v2.sql`
2. Auth: see [../docs/OWNER_AUTH_SETUP.md](../docs/OWNER_AUTH_SETUP.md) — Email + Google, redirect `teamnote://login-callback`, **Manual linking OFF**.
3. Env:

```bash
cp .env.example assets/config/.env.local
# fill SUPABASE_URL + SUPABASE_ANON_KEY (+ GOOGLE_WEB_CLIENT_ID / GOOGLE_IOS_CLIENT_ID)
# iOS: add reversed Google client ID URL scheme to ios/Runner/Info.plist
flutter pub get
flutter run
```

## Auth flow (same as web)

Login / signup (email or Google) → if not in `tn_members` → join with invite + profile → ready.

Google uses Supabase `signInWithIdToken`. Same confirmed email can use email or Google (automatic identity linking).

## Tabs

白いガラス調の下部ナビ: アイデア · 進行中 · はたらく · 保管する。既存の設定・プロフィールをヘッダーから開く。

## TestFlight

See [TESTFLIGHT.md](TESTFLIGHT.md). Bump `pubspec.yaml` version before each upload.

## 最近のモバイル更新（0.1.13+20）

- Face ID 設定をログアウト後も保持
- アプリアイコン黒表示を修正（不透明 8-bit 再生成）
- はたらく: 添付を `tn-files` へアップロード、西松地所レポート（コピー / 共有 / メール）、音声・区分ログのWeb寄せ

**配布用は `flutter build ipa --release -t lib/main.dart`**。`flutter build ipa`の終了コードだけで書出し成功とせず、IPA生成と署名を確認する。FlutterのビルドだけでTransporterへの送信やTestFlight配信は行われない。

## 公開構成

既存アプリの画面改修としてGitHub（onaoki0503-lgtm/team-note）・Flutterネイティブ／TestFlight・既存Supabaseと専用Workersを継続する。Webは既存GitHub Pages。基盤移行やDB・認証スキーマ変更は行わない。

## フォルダ構成

- `README.md`
- `TESTFLIGHT.md`
- `analysis_options.yaml`
- `android/`
- `assets/`
- `ios/`
- `lib/`
- `pubspec.lock`
- `pubspec.yaml`
- `test/`

## Monthly submission (2026-10-26)

The existing Nishimatsu monthly sheet now has a “管理側に提出” action. It submits the full reviewed text via `tn_submit_monthly_report`; one author/community/month is stored and resubmission replaces that document. The monthly snapshot is separate from daily reports. Connection failures are shown without claiming success. The management Web view reads these monthly submissions only.

Requires `../supabase/migrations/20261026044814_monthly_report_submissions.sql` (already applied to the existing shared project). No manager accounts have been added. Source version remains 0.1.13+20; unsigned build validation does not mean a new TestFlight upload. Alan's latest home change 4af73a0 is also included.

Validation: Flutter analysis and the existing 12 tests pass after a small flexible-width fix for the home count/update row at 320px and 1.6x text. Daily reporting, existing sharing actions, and native navigation are retained.
