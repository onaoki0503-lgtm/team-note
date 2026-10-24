# TestFlight checklist (Team Note)

Bundle ID: `com.teamnote.teamNoteMobile`  
Display name: **チームノート**  
Apple signing Team ID: **`T885499W8E`**  
(In Xcode, pick the team that shows this ID — e.g. `Name (T885499W8E)`. Not a personal team.)

---

## One-time setup (Naoki’s Mac)

1. Install **Xcode** (Mac App Store) → open once → accept license  
2. Install **Flutter** (if not already)  
3. Install **Transporter** (Mac App Store)  
4. Signing (once): open `mobile/ios/Runner.xcworkspace` in Xcode → **Signing & Capabilities** →  
   - Team = the one with ID **`T885499W8E`**  
   - Automatically manage signing = on  
   - Quit Xcode  

Sign in to Xcode / Transporter with the Apple ID invited to App Store Connect (**Developer** + Certificates access).

---

## Each TestFlight upload

1. Bump build number in `pubspec.yaml` (e.g. `0.1.7+9` → `0.1.7+10`)  
2. Build:

```bash
cd mobile
flutter pub get
flutter build ipa --release
```

3. **Transporter** (after the build, the IPA is sent into Transporter for you):
   1. Open **Transporter** (sign in with the invited Apple ID if asked)
   2. Confirm **チームノート** / the new build is listed
   3. Click **Deliver**
   4. Wait until upload succeeds (do not quit mid-upload)
4. [App Store Connect](https://appstoreconnect.apple.com) → **Apps** → **チームノート** → **TestFlight**  
   - Wait until the new build appears (often 10–30 minutes)  
   - If asked about encryption: choose **No** (non-exempt encryption not used)  
5. iPhone → open the **TestFlight** app → install / update **チームノート**

---

## Smoke test

Login → 4 tabs → camera / file / location on はたらく → profile photo.

## Notes

- Encryption: `ITSAppUsesNonExemptEncryption = false` (already in Info.plist).  
- Auth deep link: `teamnote://login-callback`  
- Do not commit `.env.local` or secrets.  
- Do not create apps, revoke, or delete certificates in the Apple portal. Only Automatic Signing for this app.  
