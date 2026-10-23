# Owner request: Google (and Apple) Auth for Team Note mobile

The Flutter app is ready to sign in with **email** (already works with Supabase) plus **Google** and **Apple** via Supabase Auth.

We do **not** have Google Cloud OAuth credentials. Please create them under your Google Cloud / Apple accounts and send the values below (Slack/DM is fine — **do not** commit secrets into the public repo).

## Google (required for “Googleで続ける”)

1. [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create OAuth clients (same Google Cloud project):

| Client type | Settings |
|-------------|----------|
| **Web** | Authorized redirect URI: `https://yccdpqafbdhfjjkpiowo.supabase.co/auth/v1/callback` |
| **iOS** | Bundle ID: `com.teamnote.teamNoteMobile` |
| **Android** (can wait) | Package: `com.teamnote.team_note_mobile` + SHA-1 of upload keystore |

3. In **Supabase** (project `yccdpqafbdhfjjkpiowo`) → Authentication → Providers → **Google**:
   - Enable
   - **Client IDs** = Web client ID (optionally comma-separate iOS/Android IDs)
   - **Client Secret** = Web client secret
   - **Skip nonce checks** = **ON** (needed for native iOS)
   - Save

4. Send to the engineer (private channel):

```text
GOOGLE_WEB_CLIENT_ID=….apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=….apps.googleusercontent.com
# optional later:
# GOOGLE_ANDROID_CLIENT_ID=….apps.googleusercontent.com
```

Also confirm the existing **Supabase URL + publishable/anon key** for Team Note (same as web `VITE_TEAMNOTE_*`) so TestFlight builds can use real auth.

## Apple (optional for this week)

Supabase → Providers → Apple, plus Apple Developer “Sign in with Apple” for App ID `com.teamnote.teamNoteMobile`.  
Can follow after Google if you want email-only first.

## Already done on our side

- SQL `supabase/teamnote_extend_v2.sql` applied (or pending your confirm)
- Flutter: email / Google / Apple sign-in code + join/profile flow
- Deep link scheme: `teamnote://login-callback`
- PR: mobile app + schema docs

## After you send the values

Engineer will put them in local `mobile/assets/config/.env.local` (gitignored) and cut a TestFlight build with Google enabled.
