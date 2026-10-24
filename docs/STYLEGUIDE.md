# Team Note styleguide

Shared visual language for **web** (Vite / React) and **mobile** (Flutter). Web Liquid Glass is the reference; mobile mirrors the same tokens and patterns.

**Source of truth:** [`shared/design-tokens.json`](../shared/design-tokens.json)  
**Web CSS:** [`shared/team-note-theme.css`](../shared/team-note-theme.css) + [`src/glass.css`](../src/glass.css)  
**Flutter:** [`mobile/lib/theme/tokens.dart`](../mobile/lib/theme/tokens.dart) + [`mobile/lib/theme/app_theme.dart`](../mobile/lib/theme/app_theme.dart)

When changing look-and-feel: edit `design-tokens.json` first, then update CSS and Dart to match before review.

---

## 1. Brand & feel

| Principle | Guidance |
|-----------|----------|
| **White Liquid Glass** | Soft white / cool-blue translucency, light borders, gentle shadows. Not dark mode. |
| **Calm primary** | Deep blue `#285782` — trust and clarity, not loud marketing color. |
| **No slogan chrome** | Screens show product UI; avoid decorative catchphrases in chrome. |
| **Phone-first** | Primary content width ~440px; bottom nav is the main wayfinding. |
| **Motion with purpose** | Soft arrivals, nav lens slide, bubble drift — never noisy or blocking. |

Atmosphere on web: faint cool gradients and blurred orbs behind glass panels. On mobile, solid `bgMain` is fine when blur is costly; keep surfaces, radii, and ink colors identical.

---

## 2. Color

### Core

| Token | Hex / value | Use |
|-------|-------------|-----|
| `bgMain` | `#F7FAFC` | App / scaffold background |
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

### Error

| Token | Hex |
|-------|-----|
| `errorBg` | `#FFF5F5` |
| `errorText` | `#92364B` |
| `errorBorder` | `#EED4D7` |

### Glass (web-only optical material)

Prefer shared tokens for ink and primary. Glass panels may use:

- Panel fill ≈ `rgba(255,255,255,0.73)` + `backdrop-filter: blur(20–24px) saturate(1.35–1.4)`
- Inset fill ≈ `rgba(244,248,253,0.76)`
- Fallback when blur unsupported or `prefers-reduced-transparency`: solid `#FFFFFF`

Flutter: use opaque `bgSurface` + border + soft shadow unless a screen explicitly needs blur.

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
| Micro label | 10px | 600 | Eyebrows, bubble meta |

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

Common shell padding: **12px** (phone can tighten to **8px**). Content below sticky toolbar: ~**16–20px** top. Bottom clearance for floating nav: ~**110–112px**.

---

## 5. Radius

| Token | px | Use |
|-------|-----|-----|
| `sm` | 12 | Compact controls, skeleton blocks |
| `md` | 16 | Error banners, medium chips of UI |
| Input / icon button | **14–15** | Fields, secondary buttons, icon hit targets |
| `lg` | 24 | Default cards / glass panels |
| `xl` / nav shell | **28–30** | Bottom nav capsule, large sheets |
| `pill` | 999 | Filter chips |

Cards and primary content blocks default to **24px** (web may drop to **20px** under 480px width).

---

## 6. Elevation & shadow

| Token | Role |
|-------|------|
| `shadow.card` | Panels, cards, secondary buttons — soft dual layer |
| `shadow.nav` | Nav lens / small chrome |
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
| `toolbarMinHeight` | **72px** (phone ~66) | Sticky top glass toolbar |

Safe areas: pad bottom nav with `env(safe-area-inset-bottom)` (web) / `MediaQuery.padding` (Flutter).

---

## 8. Components

### Card / panel

- Background: surface or glass panel  
- Border: 1px `border`  
- Radius: `lg` (24)  
- Shadow: `card`  
- Classes: `.tn-card` / `.glass-panel` (web); Flutter `Card` / custom container with `TnTokens`

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

### Icon / avatar buttons

- Min **44 × 44**  
- Avatar **42** circle; brand mark **42** rounded square (~14 radius)

### Bottom navigation

- Fixed capsule, max-width 440, 4 equal columns  
- Inactive `#687180`, active `#244F78`  
- Active lens: tinted glass pill sliding under the tab (web); Flutter indicator uses `bgTint`  
- Label 11px; selected weight bolder

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
- Prefer skeleton over spinner-only for route changes and AI waits

---

## 9. Motion

| Token / cue | Value |
|-------------|--------|
| Ease | `cubic-bezier(0.2, 0.85, 0.25, 1.1)` (`--glass-ease`) |
| Press | scale ≈ **0.96** on active buttons |
| Screen enter | ~350ms fade + slight rise |
| Panel enter | ~450ms rise |
| Nav lens | ~450ms translate |
| Focus ring | **3px** `#74A7D7`, offset 3px |

**Always honor:**

- `prefers-reduced-motion` / in-app motion toggle → no ambient animation  
- `prefers-reduced-transparency` → solid white panels  

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
2. Theme via `AppTheme.light` — extend it rather than one-off colors.  
3. Match web semantics (primary button, card border, nav colors) even if Material widgets differ slightly in elevation.

### Changing tokens

```text
shared/design-tokens.json
        ↓
shared/team-note-theme.css
mobile/lib/theme/tokens.dart
mobile/assets/config/design-tokens.json  (keep in sync if used by tooling)
```

---

## 12. Do / don’t

**Do**

- Reuse primary blue and muted ink for hierarchy  
- Keep panels soft-edged and light  
- Align new screens with the 4-tab shell and glass toolbar  
- Update tokens once for both platforms  

**Don’t**

- Introduce purple-on-white marketing gradients or dark “neon” themes  
- Use flat gray Material cards without shared border/radius  
- Shrink body text below 15px or inputs below 16px on phone  
- Add competing accent colors without a clear status meaning  
- Ship motion that ignores reduced-motion settings  

---

## Quick reference (copy-paste)

```
Primary     #285782
On primary  #FFFFFF
Ink         #202734
Muted       #626E80
Bg          #F7FAFC
Surface     #FFFFFF
Tint        #E6EFFA
Border      rgba(170,187,208,0.32)
Radius card 24
Radius ctl  14–15
Space md    12
Type body   15 / title 22 / caption 12 / nav 11
```
