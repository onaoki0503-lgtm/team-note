# チームノート Mobile

Native Flutter (iOS / Android). Supabase Auth + data. Not a WebView of the Vite app.

## Setup

1. Apply SQL (restaurant Supabase SQL Editor, in order):
   - `../supabase/teamnote_realtime.sql` (if not already)
   - `../supabase/teamnote_extend_v2.sql`
2. Auth providers in Supabase: Email, Google, Apple. Redirect: `teamnote://login-callback`
3. Env:

```bash
cp .env.example assets/config/.env.local
# fill SUPABASE_URL + SUPABASE_ANON_KEY (same as web VITE_TEAMNOTE_*)
flutter pub get
flutter run
```

## Auth flow (same as web)

Login / signup → if not in `tn_members` → join with invite + profile → ready.

Google / Apple use Supabase `signInWithIdToken`. Enable providers + Apple capability in Xcode (entitlements included).

## Tabs

Material `NavigationBar`: アイデア · 進行中 · はたらく · 保管する

## TestFlight

See [TESTFLIGHT.md](TESTFLIGHT.md). Bump `pubspec.yaml` version before each upload.
