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

## ホームの更新（0.1.9+16）

Web版を参照した白いガラス調・淡い中庭背景・6種類の輪郭。最大12件を中央の「企画を作成」の周囲へ配置し、ホームを縦スクロールさせない。全文はタップで表示。投稿は既存の認証済み共有処理を利用し、追加入力と下書き保持を維持する。1枚が4秒ごとに一瞬消えて800msで戻る。入力・詳細・非表示・OS減動・既存の停止設定では動きを止める。

`flutter analyze --no-pub` と `flutter test --no-pub` が成功（計12件）。320×568、390×844、430×932、844×390、768×900で12件の収容と非重複、投稿・失敗時の保持、いいね・本人のみ削除・企画化、文字拡大とキーボードを確認。iPhoneシミュレーターの見た目は架空データで確認。実本人の認証・複数端末DB同期とマイクの通し試験はこの変更では未実施。

検証画面: `flutter run -t test/support/home_preview.dart`。**配布用は `flutter build ipa --release -t lib/main.dart`**。`flutter build ipa`の終了コードだけで書出し成功とせず、IPA生成と署名を確認する。FlutterのビルドだけでTransporterへの送信やTestFlight配信は行われない。

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
