# チームノート Mobile

> **最終更新日**: 2026-10-24
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

## 最近のモバイル更新

- **0.1.12+19**: Face ID 設定をログアウト後も保持。はたらく入力の不具合修正・アイコン黒表示修正は次コミット。
- **はたらく**: 添付を `tn-files` へアップロード、西松地所レポート（コピー / 共有 / メール）、音声・区分ログのWeb寄せ。

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
