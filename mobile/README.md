# チームノート Mobile

> **最終更新日**: 2026-10-28
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

## 最近のモバイル更新（0.1.16+24）

- Appleで続ける：Runner に Sign in with Apple entitlements を配線（TestFlightの unknown 修正）
- ネイティブ Sign in with Apple → Supabase、初回名の保存
- 承認済みの白いガラス調ホーム／月次レポート管理側提出

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

Requires `../supabase/migrations/20261026044814_monthly_report_submissions.sql` (already applied to the existing shared project). No manager accounts have been added. Source version is 0.1.16+24 for this TestFlight upload.

Validation: Flutter analysis and the existing 12 tests pass after a small flexible-width fix for the home count/update row at 320px and 1.6x text. Daily reporting, existing sharing actions, and native navigation are retained.

## Approved home reference (2026-10-27)

The selected reference is now implemented in the Flutter source: a large app name, white circular profile, white translucent rounded idea cards, a wide #183181 posting action, and text-only pill navigation. The posting action opens a sheet with retained drafts and error handling. Direct proposal creation remains inside that sheet; converting an existing idea remains in its detail view. Settings are accessible from the profile sheet. Home motion pauses while a profile or composer is open.

One or two ideas use large staggered cards; up to 12 use adaptive non-overlapping slots without page scrolling. Four-second disappear/pop motion and reduced-motion settings remain. Shared colors and typography are mirrored from `shared/design-tokens.json`. Shipped as native 0.1.16+24 (Apple Sign-In entitlements on Runner). Check the development record for validation and distribution status.

2026-10-27 / AI (Codex): 検証結果 — ホーム16件、既存画面29件、共有4件、管理画面11件は今回の実行／再試行の合計で合格。吹き出し保存規則6件、Flutter解析・13件・署名なしiOSリリースビルド、Web build・lintが成功。重いビルドとブラウザの同時実行でタイムアウトした項目は順次再試行して合格を確認。既知の備品取り込み11件は今回の回帰から除外しており、アプリ全体の全件合格という意味ではない。シミュレーターのコールドビルドは負荷回避で中断し、実機表示・配信確認は未実施。TestFlightの署名／送信とWeb公開は行っていない。

2026-10-28 / AI (Composer): 備品取り込み11件はWeb側で全件合格に復帰。モバイルは `AppDataProvider` で `tn_ideas` / `tn_reactions` / `tn_members` の Realtime 購読を開始（pull refresh の安全網は維持）。

2026-10-28 / AI (Codex): IdeaTimelineの遅延構築ListViewで過去へスクロール。AppDataProviderは旧hiddenAtを履歴から除外しない。新規配信はせず、ソースの番号は既存0.1.15+22のまま。

2026-10-28 / AI (Codex): 代表の訂正を反映し、LINE風の発言者・日時・左右色分けを撤去。元の白い吹き出しと浮遊・4秒の消失ポップを復元し、過去へのスクロールだけを継続。詳細にも投稿者を表示しない。投稿者IDや作成日時の保存・権限判定は維持。画面・入力・減動時の停止を維持。
