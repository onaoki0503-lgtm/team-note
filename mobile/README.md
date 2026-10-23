# チームノート Mobile (Flutter)

iOS / Android client for Team Note. Streamlined UI (less copy), Supabase auth + data, camera / file / location on reports and proposals.

**Separate from TeamKaikei** — patterns inspired by that app, but this repo’s own code and bundle IDs.

## Stack

- Flutter 3.8+
- Supabase Auth + Postgres (same `tn_*` / RPC surface as the web app when configured)
- Shared look: `../shared/design-tokens.json` → `lib/theme/tokens.dart`

## Quick start

```bash
cd mobile
cp .env.example assets/config/.env.local   # optional; fill SUPABASE_*
flutter pub get
flutter run                                # pick iOS sim / Android / device
```

Without Supabase env, the app opens in **demo mode** (local ideas / seeded projects).

Dart-define alternative:

```bash
flutter run --dart-define=SUPABASE_URL=https://xxx.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=eyJ...
```

## Tabs

1. **アイデア** — post / like (cloud RPC when configured)
2. **進行中** — project list + create
3. **はたらく** — work report + photo / file / location pins
4. **保管する** — roster / inventory / docs (shell links for next phase)

## TestFlight

See [TESTFLIGHT.md](TESTFLIGHT.md).

## Owner review

Point reviewers at demo mode first, then a build with real `SUPABASE_*` once Auth redirect `teamnote://login-callback` is added in the Supabase project.
