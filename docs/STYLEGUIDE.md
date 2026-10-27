# Team Note styleguide

> **Last updated**: 2026-10-27
> **Updated by**: AI (Codex)

The owner-approved home reference is a white glass surface, large app title and circular profile, white rounded idea cards, one wide blue posting action, and text-only pill tabs. Apply the same composition to Vite and Flutter. No marketing slogans or prototype-only replay controls belong in the app.

## Shared source

- `shared/design-tokens.json`: color and type source of truth.
- `shared/team-note-theme.css`, `mobile/lib/theme/tokens.dart`: mirrored values.
- `src/home-reference.css`: approved shell/home, layered after existing glass styles.
- `mobile/lib/widgets/home_scene.dart`: native header, backdrop, cards, bottom nav and skeleton.

## Color and type

| Use | Value |
|---|---|
| Primary actions / selected tab | #183181 |
| Primary text | #17284E |
| Secondary text | #5B6E91 |
| Main background | #F5F8FF |
| Glass tint | #EEF3FF |
| Surface / on primary | #FFFFFF |

Status colors remain the existing blue/gold/purple/orange/green tokens. Home cards and idea details use white and blue rather than category colors. Brand is 23px/700, view label 16px/400, posting action 17px, nav 13px. Inputs remain at least 16px on Web. Small card previews can use 11–14px when displaying many ideas, with full text available on tap and complete accessible labels.

## Home composition

- Header: app name and 44px circular profile. Keep settings available within the profile flow. Preserve the demo marker when using fictional/local demo data.
- Cards: subtle white gradient, white border, soft shadow, asymmetric 24–32px corners. Large cards for one or two ideas, denser adaptive slots for up to twelve. The selected count must not cause page scrolling or overlap.
- The wide blue “アイデアを投稿” opens an input sheet. Drafts survive closing and failed saves. Close only after a successful save, and restore focus to the trigger.
- Keep direct proposal creation inside the input sheet and idea-to-proposal conversion in the detail view.
- Navigation: four text-only labels inside a white pill. A deep-blue rounded selection surface slides between them; selected text is white.

## Material and performance

Use white translucency and a soft blue/white atmospheric background. The old courtyard photograph and multicolored cloud outlines are removed from the home. Nav and sheets can use bounded blur (Web 20–24px / Flutter sigma16). Moving cards use translucent gradients and shadows without repeatedly filtering the whole background. Native card shapes are code-drawn rounded paths.

## Motion and accessibility

Preserve gentle drift and one card disappearing/popping every four seconds. Pause while editing, viewing details or inactive; respect OS reduced motion and the saved in-app pause setting. Reserve enough space for the maximum drift and scale, including rotated Web card bounds.

Targets are at least 44px. Show complete content in the detail sheet, preserve visible focus and screen-reader names, and keep disabled states clear. The composer must fit the visual viewport when the keyboard reduces available height. Skeletons cover initial/screen loading and match the card/button arrangement.

## Functional boundaries

This change is presentation and interaction only. Existing Auth, profile data, shared ideas, reporting, monthly submissions, roster, inventory, projects and Workers integration keep their storage/API contracts. Keep management monthly-report viewing independent. Existing GitHub Pages / Flutter / Supabase / Workers hosting remains; source changes do not imply Pages publication or a TestFlight upload.
