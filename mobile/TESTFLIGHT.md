# TestFlight checklist (Team Note)

Bundle ID (current scaffold): `com.teamnote.teamNoteMobile`  
Display name: **チームノート**

## One-time Apple setup

1. App Store Connect → new app (iOS) with the bundle ID above (or change ID in Xcode to match an existing App ID).
2. Xcode → `ios/Runner.xcworkspace` → Signing & Capabilities → Team (Alan / owner).
3. Bump version in `pubspec.yaml` (`0.1.0+1` → build number `+2`, `+3`, …) before each upload.

## Build & upload

```bash
cd mobile
flutter pub get
flutter build ipa --release \
  --dart-define=SUPABASE_URL="$SUPABASE_URL" \
  --dart-define=SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
```

Upload the IPA via **Transporter** or:

```bash
xcrun altool --upload-app --type ios -f build/ios/ipa/*.ipa \
  --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"
```

## Internal testing

1. App Store Connect → TestFlight → add Alan + owner as internal testers.
2. Install TestFlight on devices, accept invite.
3. Smoke: login (or demo) → 4 tabs → camera / file / location on はたらく → profile photo.

## Notes

- Encryption export compliance: `ITSAppUsesNonExemptEncryption = false` is set in Info.plist.
- Auth deep link scheme: `teamnote://` (add matching Redirect URL in Supabase Auth).
- Do not commit `.env.local` or anon keys into public forks if the repo visibility changes.
