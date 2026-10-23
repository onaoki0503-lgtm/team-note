# Shared design tokens

Single source for Team Note look-and-feel across:

- **Web** — import `team-note-theme.css` from the Vite app (`src/main.tsx` / CSS entry).
- **Flutter** — mirror values in `mobile/lib/theme/tokens.dart` (same hex / radii).

Edit `design-tokens.json` first, then update CSS and Dart to match before review with the owner.
