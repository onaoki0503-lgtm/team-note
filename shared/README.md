# Shared design tokens

> **最終更新日**: 2026-10-27
> **更新者**: AI (Codex)

Single source for Team Note look-and-feel across:

- **Web** — import `team-note-theme.css` from the Vite app (`src/main.tsx` / CSS entry).
- **Flutter** — mirror values in `mobile/lib/theme/tokens.dart` (same hex / radii).

Human-readable rules (color, type, components, motion): **[docs/STYLEGUIDE.md](../docs/STYLEGUIDE.md)**.

Edit `design-tokens.json` first, then update CSS and Dart to match before review with the owner.

2026-10-27 / AI (Codex): 承認画像を受けprimaryを#183181、本文#17284E、補助文字#5B6E91、薄い背景#F5F8FFへ更新。brand=23／nav=13をCSSとFlutterにも同期。ホームは白いカード・濃青の選択タブを使用する。
