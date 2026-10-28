# Team Note styleguide

> **Last updated**: 2026-10-28
> **Updated by**: AI (Codex)

## Home: original floating bubbles with scrolling

Owner clarification: only add scrolling to the original bubble home. Do not turn it into a messaging UI.

- All ideas use white glass bubbles with varied rounded shapes, gentle tilt, spacing and independent floating phases. No blue own-message bubbles, left/right ownership alignment, author name/avatar, date dividers or time labels. Details also show a generic idea heading.
- Scroll the bubble canvas to revisit old posts. Keep all non-deleted history including legacy capacity/inactivity markers; no client twelve-post cap or seven-day expiry. Explicit deletion remains excluded.
- Open at the latest bubbles. Keep the header, posting action and tabs fixed. Preserve the reader's history position on new Web posts and offer a new-post button.
- Restore gentle drift and one visible bubble briefly disappearing/popping about every four seconds. Stop for input/detail, background/inactive screens, saved pause preference and OS reduced motion. Keep movement inside each padded slot so neighbouring bubbles remain readable.
- Preserve the input sheet, saved drafts, failure/retry behaviour, existing detail actions and proposal conversion. The preview can abbreviate a long body; tapping opens the full body. Accessible names contain the complete text without author/time.
- Primary #183181, text #17284E, muted #5B6E91, background #F5F8FF, glass tint #EEF3FF, white bubbles. Use code/CSS geometry. Retain the text-only pill tabs and bounded sheet/nav blur.
- Targets at least 44px; Web inputs at least 16px. Skeletons use the same soft white shapes. The keyboard must not hide the submit action.

## Storage and release boundaries

Author IDs and creation times remain stored for ownership and chronological sorting; only their presentation is removed. Existing tn_get_board includes non-deleted historical rows. No DB, Auth or RLS changes in this correction. Existing server restrictions on reactions to legacy hidden posts remain a separate follow-up. Preserve GitHub Pages / Flutter / Supabase / Workers. Source changes do not imply a Pages publication or a TestFlight upload.
