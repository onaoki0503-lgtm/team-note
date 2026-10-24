# Google (and Apple) Auth for Team Note mobile

The Flutter app is ready to sign in with **email** (already works with Supabase) plus **Google** and **Apple** via Supabase Auth.

You can create the Google Cloud / Apple credentials **and** wire them into the mobile app yourself. Keep secrets out of git — use the gitignored env file below.

## Google (required for “Googleで続ける”)

### 1. Google Cloud Console

1. [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create OAuth clients (same Google Cloud project):

| Client type | Settings |
|-------------|----------|
| **Web** | Authorized redirect URI: `https://yccdpqafbdhfjjkpiowo.supabase.co/auth/v1/callback` |
| **iOS** | Bundle ID: `com.teamnote.teamNoteMobile` |
| **Android** (can wait) | Package: `com.teamnote.team_note_mobile` + SHA-1 of upload keystore |

### 2. Supabase

In project **`yccdpqafbdhfjjkpiowo`** → **Authentication → Providers → Google**:

- Enable
- **Client IDs** = Web client ID (optionally comma-separate iOS/Android IDs)
- **Client Secret** = Web client secret
- **Skip nonce checks** = **ON** (needed for native iOS)
- Save

Redirect / deep link for the app: `teamnote://login-callback`

### 3. Put credentials in the mobile app

```bash
cd mobile
cp .env.example assets/config/.env.local
```

Edit `mobile/assets/config/.env.local` (gitignored — **do not commit**):

```text
SUPABASE_URL=https://yccdpqafbdhfjjkpiowo.supabase.co
SUPABASE_ANON_KEY=…   # same as web VITE_TEAMNOTE_* anon/publishable key
ORG_LABEL=H-Village
GOOGLE_WEB_CLIENT_ID=….apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=….apps.googleusercontent.com
# optional later:
# GOOGLE_ANDROID_CLIENT_ID=….apps.googleusercontent.com
```

Then run / build:

```bash
flutter pub get
flutter run
# or cut TestFlight — see mobile/TESTFLIGHT.md
```

## Apple (optional for this week)

Supabase → Providers → Apple, plus Apple Developer “Sign in with Apple” for App ID `com.teamnote.teamNoteMobile`.  
Can follow after Google if you want email-only first.

## Already in the codebase

- SQL `supabase/teamnote_extend_v2.sql` (apply in Supabase if not already)
- Flutter: email / Google / Apple sign-in + join/profile flow
- Deep link scheme: `teamnote://login-callback`
- Env loading via `assets/config/.env.local` (`mobile/lib/config/environment.dart`)
