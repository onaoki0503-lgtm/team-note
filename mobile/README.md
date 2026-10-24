# チームノート Mobile

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

Material `NavigationBar`: アイデア · 進行中 · はたらく · 保管する

## TestFlight

See [TESTFLIGHT.md](TESTFLIGHT.md). Bump `pubspec.yaml` version before each upload.
