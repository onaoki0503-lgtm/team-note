# Team Note styleguide

> **Last updated**: 2026-10-28
> **Updated by**: AI (Codex)

## Home: chronological conversation

The owner replaced the floating board with a LINE-like scrollable conversation. Keep the white glass shell, circular profile and text-only pill tabs. No slogans or prototype replay controls.

- Order: oldest to newest. Open at the latest message; scroll upwards for history. Show date separators, author names and local times. Never truncate the body.
- Own messages: right aligned, deep blue #183181, white text. Other members: left aligned, white with dark text #17284E and a small author avatar/name.
- Preserve every non-deleted post, including legacy capacity/inactivity markers. No twelve-item display cap, no seven-day display expiry. Explicitly deleted posts stay deleted.
- Only the conversation scrolls. Keep the header, blue posting button and bottom tabs reachable. New messages follow when already near the bottom. While reading history, keep the position and show a new-message button.
- Do not float, rotate, periodically hide or pop messages. Sheets and navigation retain short transitions, respecting reduced motion.
- The posting button opens a sheet. Preserve drafts on closing/failure; close and clear only on confirmed success. Keep proposal creation and detail actions.
- Skeletons match the conversation rather than the former floating board. Targets at least 44px; Web input font at least 16px; bodies 15px with generous line height.

## Shared appearance

Primary #183181, text #17284E, muted #5B6E91, background #F5F8FF, tint #EEF3FF, white surface. Token source: shared/design-tokens.json. Web home: src/home-reference.css. Flutter: mobile/lib/widgets/home_scene.dart and mobile/lib/screens/ideas_screen.dart.

## Boundaries

Existing GitHub Pages / Flutter / Supabase / Workers remain. tn_get_board already includes non-deleted historical rows, so clients can show them without changing RLS or the database. Legacy hidden markers remain stored for compatibility; they no longer suppress history. This work does not upload a TestFlight build, alter authentication or publish the website. Existing server rules may still restrict reactions on legacy hidden posts; that is separate from history retrieval and must be coordinated before changing the shared database.
