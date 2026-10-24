# Team Note styleguide

Shared visual language for **web** (Vite / React) and **mobile** (Flutter). Web Liquid Glass is the reference; mobile mirrors the same tokens and glass shell patterns.

**Source of truth:** [`shared/design-tokens.json`](../shared/design-tokens.json)  
**Web CSS:** [`shared/team-note-theme.css`](../shared/team-note-theme.css) + [`src/glass.css`](../src/glass.css)  
**Flutter tokens:** [`mobile/lib/theme/tokens.dart`](../mobile/lib/theme/tokens.dart) + [`mobile/lib/theme/app_theme.dart`](../mobile/lib/theme/app_theme.dart)  
**Flutter glass shell:** [`mobile/lib/widgets/home_scene.dart`](../mobile/lib/widgets/home_scene.dart) (`GlassBackdrop`, `GlassSurface`, `GlassBottomNav`) + [`mobile/lib/screens/shell_screen.dart`](../mobile/lib/screens/shell_screen.dart)

When changing look-and-feel: edit `design-tokens.json` first, then update CSS and Dart to match before review. Glass chrome and idea-bubble tones live in `glass.css` / `home_scene.dart` — keep those pairs in sync even when they are not yet in the JSON token file.

---

## 1. Brand & feel

| Principle | Guidance |
|-----------|----------|
| **White Liquid Glass** | Soft white / cool-blue translucency, light borders, gentle shadows. Not dark mode. |
| **Calm primary** | Deep blue `#285782` — trust and clarity, not loud marketing color. |
| **No slogan chrome** | Screens show product UI; avoid decorative catchphrases in chrome. |
| **Phone-first** | Primary content width ~440px; bottom nav is the main wayfinding. |
| **Motion with purpose** | Soft arrivals, nav lens slide, bubble drift, atmosphere orbs — never noisy or blocking. |

**Atmosphere (both platforms):** base `#FBFDFF` (web may use `#fff → #fafcff → #fff`). Soft drifting orbs in cool blue / lavender / mint (`#dceaff`, `#e7e1fa`, `#d9f1f4`). Mobile may layer a faint monochrome courtyard banner under the orbs. Solid `bgMain` (`#F7FAFC`) remains the token for non-glass scaffolds and Material theme fallbacks.

---

## 2. Color

### Core

| Token | Hex / value | Use |
|-------|-------------|-----|
| `bgMain` | `#F7FAFC` | Non-glass scaffold / Material theme background |
| Atmosphere base | `#FBFDFF` | Glass shell backdrop (home / shell) |
| `bgSurface` | `#FFFFFF` | Cards, sheets, opaque panels |
| `bgTint` | `#E6EFFA` | Selected nav lens, soft fills |
| `textMain` | `#202734` | Body and titles |
| `textMuted` | `#626E80` | Captions, help, secondary |
| `border` | `rgba(170,187,208,0.32)` | Panel and input edges |
| `primary` | `#285782` | Primary actions, brand accent |
| `onPrimary` | `#FFFFFF` | Text/icons on primary |
| `navInactive` | `#687180` | Unselected tab |
| `navActive` | `#244F78` | Selected tab |

### Accents (status / category chips)

| Token | Hex | Typical use |
|-------|-----|-------------|
| `accentBlue` | `#3B82F6` | Info / link emphasis |
| `accentGold` | `#C9A227` | Attention / milestone |
| `accentPurple` | `#7C6BCF` | Secondary category |
| `accentOrange` | `#E67E22` | Warning-ish / leadership |
| `accentGreen` | `#2F9E6B` | Success / complete |

### Idea bubble tones (home board)

Six rotating tones shared by web `.idea-card--tone-*` and Flutter cloud bubbles. Prefer these over inventing new pastel sets.

| Tone | Fill (approx) | Stroke | Ink |
|------|---------------|--------|-----|
| Coral | `#FFF1EA` | `#EFB089` / `#F0B089` | `#9A4E1F` |
| Blue | `#EAF4FF` / `#EEF6FF` | `#8FB6E2` / `#9FC0EA` | `#2A5688` |
| Gold | `#FFF7E6` / `#FFF8E8` | `#DFC06A` / `#E4C878` | `#785C20` |
| Green | `#EAF8F0` / `#EEFAF3` | `#7FC4A3` / `#8DCEB0` | `#1F6E4B` |
| Violet | `#F3EDFF` / `#F5F0FF` | `#C4ADE6` / `#CBB6EC` | `#5F458F` |
| Cyan | `#E8F8FB` / `#EDFAFC` | `#87CFDB` / `#9BD8E2` | `#276270` |

Bubble body text ~12px (home) / 14px (list cards), weight ~650; reaction meta ~9–10px at reduced opacity.

### Error

| Token | Hex |
|-------|-----|
| `errorBg` | `#FFF5F5` |
| `errorText` | `#92364B` |
| `errorBorder` | `#EED4D7` |

### Glass (optical material — web and mobile shell)

Prefer shared tokens for ink and primary. Glass panels may use:

- Panel fill ≈ `rgba(255,255,255,0.73–0.92)` gradient + `backdrop-filter` / `ImageFilter.blur`
  - Web: blur **20–24px**, `saturate(1.35–1.4)`
  - Flutter `GlassSurface`: blur sigma **~16**, fill `#ECFFFFFF → #BDFFFFFF`, white border ~1.2px
- Inset fill ≈ `rgba(244,248,253,0.76)`
- Fallback when blur unsupported, `prefers-reduced-transparency`, or expensive screens: solid `#FFFFFF` / `bgSurface`

Non-glass Flutter screens (work, archive, settings sheets) may stay opaque; the **shell + home** path should match web glass.

---

## 3. Typography

**Font stack (web):** system UI + Japanese  
`-apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif`

**Flutter:** platform default (SF / Roboto) is fine; keep sizes and weights aligned.

| Role | Size | Weight | Notes |
|------|------|--------|-------|
| Brand | 15px | ~750 | App name in toolbar; letter-spacing ≈ −0.5px |
| Title / view heading | 22–23px | ~750 | Letter-spacing ≈ −0.6px |
| Body | 15px | 400–650 | Comfortable reading |
| Button label | 14px | ~650 | Primary / secondary |
| Caption / muted | 12px | 400–600 | Help, meta, counters |
| Nav label | 11px | 600–700 | Bottom tabs |
| Micro label | 10px | 600 | Org line under brand, bubble meta |

**Inputs:** use **16px** minimum on web (and prefer the same on mobile) to avoid iOS zoom-on-focus.

**Line height:** body ≈ 1.6.

---

## 4. Spacing

| Token | px |
|-------|----|
| `xs` | 4 |
| `sm` | 8 |
| `md` | 12 |
| `lg` | 16 |
| `xl` | 20 |
| `xxl` | 28 |

Common shell padding: **12px** (phone can tighten to **8px**). Toolbar inset ≈ **8–12** top. Bottom clearance for floating nav: ~**110–112px** (or `SafeArea` + nav padding on Flutter).

---

## 5. Radius

| Token | px | Use |
|-------|-----|-----|
| `sm` | 12 | Compact controls, skeleton blocks |
| `md` | 16 | Error banners, medium chips of UI |
| Input / icon button | **14–15** | Fields, secondary buttons, icon hit targets |
| `lg` | 24 | Default cards / glass panels |
| Toolbar glass | **25** (phone **~22**) | Sticky top capsule |
| `xl` / nav shell | **28–30** | Bottom nav capsule, large sheets |
| `pill` | 999 | Filter chips |

Cards and primary content blocks default to **24px** (web may drop to **20px** under 480px width). Flutter `GlassSurface` default radius is **26** — acceptable for chrome; content cards should still prefer **24**.

---

## 6. Elevation & shadow

| Token | Role |
|-------|------|
| `shadow.card` | Panels, cards, secondary buttons — soft dual layer |
| `shadow.nav` | Nav lens / small chrome |
| Glass chrome | Soft primary-tinted shadow (e.g. Flutter `primary @ 0.065`, blur 24, y 8) |
| Inset highlight | Optional `inset 0 1px 0 #fff` on glass (web) |

Card shadow reference:

`0 12px 38px rgba(43,64,94,0.07), 0 2px 6px rgba(43,64,94,0.035)`

Hover lift on tappable panels: translateY **−2px**, slightly deeper shadow — do not invent heavy multi-layer glows.

---

## 7. Layout

| Token | Value | Use |
|-------|-------|-----|
| `maxContentWidth` | **440px** | Bottom nav max width; phone content column |
| Wider reading | up to ~780–1180px | Toolbars / home board on large screens |
| `navHeight` | **64px** (shell ~58–68 with padding) | Bottom navigation |
| `toolbarMinHeight` | **72px** (phone ~66; compact home ~44) | Sticky top glass toolbar |

Safe areas: pad bottom nav with `env(safe-area-inset-bottom)` (web) / `MediaQuery` / `SafeArea` (Flutter).

---

## 8. Components

### Card / panel

- Background: surface or glass panel  
- Border: 1px `border` (glass may use white edge)  
- Radius: `lg` (24)  
- Shadow: `card`  
- Classes: `.tn-card` / `.glass-panel` (web); Flutter `GlassSurface` or `Card` with `TnTokens`

### Primary button

- Min height **46px** (touch target prefer ≥ **44px**)  
- Padding **11 × 16**  
- Radius **15**  
- Fill `primary`, text `onPrimary`, weight ~650, size 14  
- Web: `.tn-btn-primary` / `.glass-primary`

### Secondary button

- Same size as primary  
- Surface fill, `primary` text, 1px border, card shadow  
- Web: `.tn-btn-secondary` / `.glass-secondary`

### Chip

- Padding **6 × 14**, pill radius, caption size, weight 600  
- Default: surface + muted text  
- Active: primary fill + onPrimary  
- Web: `.tn-chip` / `.tn-chip.is-active`

### Brand mark / avatar

| Element | Desktop | Phone / mobile shell |
|---------|---------|----------------------|
| Brand mark | **42×42**, radius **~14** | **~34–36×36–40**, radius **12–13** |
| Avatar | **48** (web) / **44** (Flutter shell) | Compact home may use **32** |

Brand mark: light white→cool gradient, 1px white border, primary icon. Avatar: circle, 2px white border, tint fill or photo.

### Bottom navigation

- Fixed glass capsule, max-width 440, 4 equal columns, radius **30**  
- Inactive `#687180`, active `#244F78`  
- Active lens: tinted glass pill (web `.nav-lens`; Flutter animated indicator over `bgTint` → white)  
- Label 11px; selected weight bolder  
- Web: `.glass-nav`; Flutter: `GlassBottomNav` — do not use stock Material `NavigationBar` for the main shell

### Glass toolbar

- Sticky / top glass capsule, radius **25** (phone **~22**)  
- Brand + org micro-label + settings + avatar  
- Web: `.glass-toolbar`; Flutter: `GlassSurface` in `ShellScreen`

### Inputs

- Radius **14**, fill near-white / surface  
- Focus: border toward `#82A5C7` / primary, soft ring `0 0 0 4px` light blue  
- Error state: use error colors above, not red-on-white ad hoc

### Error banner

- Padding **12 × 15**, radius **16**, bg/text/border from error tokens  
- Web: `.glass-error`

### Modal / sheet

- Scrim: cool translucent blue-gray + blur when available  
- Sheet: near-opaque white, radius **28**, strong soft shadow  
- Arrive animation ~320ms (respect reduced motion)

### Loading

- Full-screen / route skeletons with shimmer blocks (web pattern)  
- Flutter: `HomeLoadingScaffold` (glass + skeleton surfaces) for auth gate  
- Prefer skeleton over spinner-only for route changes and AI waits

---

## 9. Motion

| Token / cue | Value |
|-------------|--------|
| Ease | `cubic-bezier(0.2, 0.85, 0.25, 1.1)` (`--glass-ease`) |
| Atmosphere drift | ~24s ease-in-out alternate |
| Press | scale ≈ **0.96** on active buttons |
| Screen enter | ~350ms fade + slight rise |
| Panel enter | ~450ms rise |
| Nav lens | ~450ms translate |
| Focus ring | **3px** `#74A7D7`, offset 3px |

**Always honor:**

- `prefers-reduced-motion` / in-app motion toggle → no ambient animation (Flutter: `AppPrefs` motion paused + `MediaQuery.disableAnimations`)  
- `prefers-reduced-transparency` → solid white panels  
- Pause atmosphere when keyboard is open or tab is inactive  

Do not drive layout or networking from animation frames.

---

## 10. Accessibility & interaction

- Interactive targets ≥ **44px** height (and width where icon-only)  
- Visible `:focus-visible` / Flutter focus indicators  
- Disabled: `not-allowed` cursor (web); reduce opacity, no press scale  
- Color is not the only signal (icons + text for status)  
- Japanese copy: short, concrete labels; avoid decorative English slogans in chrome

---

## 11. Platform checklist

### Web

1. Import `shared/team-note-theme.css` for shared variables and `.tn-*` primitives.  
2. Screen chrome and Liquid Glass details live in `src/glass.css`.  
3. Prefer CSS variables (`--tn-*` / bridged `--glass-*`) over hard-coded hex in components.

### Flutter

1. Use `TnTokens` for color, space, type, radius.  
2. Shell + home: compose with `GlassBackdrop` / `GlassSurface` / `GlassBottomNav` from `home_scene.dart`.  
3. Theme via `AppTheme.light` for Material defaults on non-glass screens — extend it rather than one-off colors; when touching `AppTheme`, align radii/heights toward this guide (inputs/buttons ~14–15, primary height ~46).  
4. Match web semantics (primary button, card border, nav colors, bubble tones) even if Material widgets differ slightly in elevation.

### Changing tokens

```text
shared/design-tokens.json
        ↓
shared/team-note-theme.css
mobile/lib/theme/tokens.dart
mobile/assets/config/design-tokens.json  (keep in sync if used by tooling)

Glass chrome / atmosphere / idea bubbles (not all in JSON yet):
src/glass.css  ↔  mobile/lib/widgets/home_scene.dart (+ shell_screen.dart)
```

---

## 12. Do / don’t

**Do**

- Reuse primary blue and muted ink for hierarchy  
- Keep panels soft-edged and light  
- Align new screens with the 4-tab glass shell and glass toolbar  
- Update tokens once for both platforms; update glass primitives in CSS and Dart together  
- Reuse the six idea-bubble tones for home cards  

**Don’t**

- Introduce purple-on-white marketing gradients or dark “neon” themes  
- Use flat gray Material cards / stock `NavigationBar` for the main shell  
- Shrink body text below 15px or inputs below 16px on phone  
- Add competing accent colors without a clear status meaning  
- Ship motion that ignores reduced-motion / in-app pause settings  
- Treat Flutter as “opaque only” for shell/home — those screens share web glass  

---

## Quick reference (copy-paste)

```
Primary        #285782
On primary     #FFFFFF
Ink            #202734
Muted          #626E80
Bg (token)     #F7FAFC
Atmosphere     #FBFDFF
Surface        #FFFFFF
Tint           #E6EFFA
Border         rgba(170,187,208,0.32)
Radius card    24
Radius toolbar 25 (phone ~22)
Radius nav     30
Radius ctl     14–15
Space md       12
Type body      15 / title 22 / caption 12 / nav 11 / micro 10
Bubble tones   coral · blue · gold · green · violet · cyan
```
