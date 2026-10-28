# Google Auth for Team Note (web + mobile)

Email/password already works. Google is wired in the **web login** and **Flutter login** (“Googleで続ける”). Same email can use either method after the email is confirmed (multi-provider via Supabase automatic linking — same as TeamKaikei).

Keep secrets out of git. Use the gitignored env files below.

## What you must add in Supabase

Project **`yccdpqafbdhfjjkpiowo`**.

### 1. Enable Google provider

**Authentication → Providers → Google**

| Setting | Value |
|---------|--------|
| Enable | **ON** |
| Client IDs | Web client ID (optionally comma-separate iOS / Android client IDs) |
| Client Secret | Web client secret |
| Skip nonce checks | **ON** (required for native iOS `signInWithIdToken`) |

Save.

### 2. Multi-provider (email ↔ Google) — required

**Authentication → Providers → (or Auth settings / User signups)**

| Setting | Value | Why |
|---------|--------|-----|
| **Manual linking** | **OFF** (disabled) | Same verified email automatically links Google + email into **one** `auth.users` row (TeamKaikei pattern). Membership stays on that user. |
| Email confirmations | **ON** (recommended) | Linking only works reliably after the email identity is confirmed. |

Do **not** turn Manual linking on unless you also build an in-app “link Google” flow while already signed in. With Manual linking on, signing in with Google after email signup creates a **different** user and the dorm membership will not carry over.

### 3. Redirect URLs

**Authentication → URL Configuration**

Add these to **Redirect URLs** (exact origins you use):

- `teamnote://login-callback` (Flutter deep link)
- Local Vite, e.g. `http://127.0.0.1:5173/**` or `http://localhost:5173/**`
- Production / GitHub Pages origin, e.g. `https://onaoki0503-lgtm.github.io/team-note/**`

**Site URL** can stay your main production URL.

## Google Cloud Console

1. [Credentials](https://console.cloud.google.com/apis/credentials)
2. Same Google Cloud project — create OAuth clients:

| Client type | Settings |
|-------------|----------|
| **Web** | Authorized redirect URI: `https://yccdpqafbdhfjjkpiowo.supabase.co/auth/v1/callback` |
| **iOS** | Bundle ID: `com.teamnote.teamNoteMobile` |
| **Android** (can wait) | Package: `com.teamnote.team_note_mobile` + SHA-1 of upload keystore |

## Mobile app credentials

```bash
cd mobile
cp .env.example assets/config/.env.local
```

Edit `mobile/assets/config/.env.local` (gitignored):

```text
SUPABASE_URL=https://yccdpqafbdhfjjkpiowo.supabase.co
SUPABASE_ANON_KEY=…   # same as web VITE_TEAMNOTE_* anon/publishable key
ORG_LABEL=H-Village
GOOGLE_WEB_CLIENT_ID=….apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=….apps.googleusercontent.com
```

### iOS Info.plist (required once you have the iOS client ID)

Google Sign-In needs the **reversed** iOS client ID as a URL scheme.

If `GOOGLE_IOS_CLIENT_ID` is `123456789-abcdef.apps.googleusercontent.com`, the reversed scheme is `com.googleusercontent.apps.123456789-abcdef`.

In `mobile/ios/Runner/Info.plist`, under `CFBundleURLTypes`, add a second dict (keep the existing `teamnote` scheme):

```xml
<dict>
  <key>CFBundleURLName</key>
  <string>Google Sign In</string>
  <key>CFBundleURLSchemes</key>
  <array>
    <string>com.googleusercontent.apps.YOUR-IOS-CLIENT-PREFIX</string>
  </array>
</dict>
```

Optionally add:

```xml
<key>GIDClientID</key>
<string>YOUR-IOS-CLIENT-ID.apps.googleusercontent.com</string>
```

Then:

```bash
flutter pub get
flutter run
```

## Web

No Google client ID in the Vite env. Web uses Supabase `signInWithOAuth({ provider: 'google' })`. Only the Supabase Google provider + redirect URLs above are required. Existing:

```text
VITE_TEAMNOTE_SUPABASE_URL=
VITE_TEAMNOTE_SUPABASE_PUBLISHABLE_KEY=
```

## How multi-provider behaves

1. User signs up with email/password → confirms email.
2. Later taps **Googleで続ける** with the **same Gmail/email**.
3. Supabase (manual linking **off**) attaches Google to the existing user → same `user.id` → existing `tn_members` row still applies.
4. Either method works on next visit.

If they try Google **before** confirming email, linking may fail; show them the confirmation mail first.

## Apple (native iOS — required if Google is offered on the App Store)

App Store guideline: if the iOS app offers a third-party login (Google), it must also offer **Sign in with Apple**. Team Note uses **native** Sign in with Apple only (not the web OAuth / Services ID flow). That avoids Apple’s 6‑month secret-key rotation.

Follow the same nonce pattern as APS / TeamKaikei (worked after long debugging): Apple gets the SHA-256 nonce; Supabase `signInWithIdToken` gets the **raw** nonce. Never send Apple’s authorization code as an access token.

### 1. Apple Developer

1. [Identifiers → App IDs](https://developer.apple.com/account/resources/identifiers/list/bundleId) → App ID for **`com.teamnote.teamNoteMobile`**
2. Capabilities → enable **Sign in with Apple** (leave Server-to-Server endpoint blank)
3. Xcode already has `Runner/Runner.entitlements` with `com.apple.developer.applesignin = Default` and `CODE_SIGN_ENTITLEMENTS` wired. Confirm **Signing & Capabilities** still shows Sign in with Apple for team `T885499W8E`.

No Services ID / `.p8` key is required for **native-only** Sign in with Apple.

### 2. Supabase Apple provider

Project **`yccdpqafbdhfjjkpiowo`** → **Authentication → Providers → Apple**

| Setting | Value |
|---------|--------|
| Enable | **ON** |
| Client IDs | `com.teamnote.teamNoteMobile` (bundle ID = token audience). If you later add web Apple OAuth, put the **Services ID first**, then the bundle ID. |
| Secret Key / Team ID / Key ID | Leave empty for native-only |

Save. Keep **Manual linking OFF** (same as Google) so a confirmed email can link Apple + Google + email into one user.

### 3. What the app does

- Login shows the black **Appleで続ける** button on iOS when `SignInWithApple.isAvailable()`
- `signInWithIdToken(provider: apple, idToken, nonce: rawNonce)`
- On first authorization only, given/family name → `user_metadata.full_name` via `updateUser`
- Cancelled sheet is ignored (no error toast)

### 4. Verify on device

1. Real iPhone (simulator Apple ID can be flaky) with a build signed by team `T885499W8E`
2. Tap **Appleで続ける** → complete Apple sheet → land on join or home
3. Sign out → Apple again → should return without asking for name again
4. Optional: same Apple email after email confirmation should link to the existing member

If you see `unacceptable audience` / provider errors: Client IDs in Supabase must include `com.teamnote.teamNoteMobile`, and the App ID must have Sign in with Apple enabled.

Web Apple login is **not** wired yet (would need Services ID + secret rotation). Residents use the Flutter app.

## Already in the codebase

- Web: Google button on login + PKCE session detection
- Flutter: Google + **Apple** buttons on login + `signInWithIdToken`
- Deep link scheme: `teamnote://login-callback`
- Env loading: `mobile/assets/config/.env.local`
- iOS entitlements: Sign in with Apple (`Runner.entitlements`)
