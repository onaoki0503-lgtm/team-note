# Team Note brand assets

Source artwork for app icon and splash. Edit the SVGs, then re-rasterize and regenerate platform assets.

## Files

| File | Use |
|------|-----|
| `app-icon.svg` / `.png` | Full-bleed 1024 icon (`#285782` + white lightbulb) |
| `app-icon-foreground.svg` / `.png` | Android adaptive foreground (transparent) |
| `splash-logo.svg` / `.png` | Rounded tile for launch splash |
| `splash-image.png` | Soft `#F7FAFC` splash preview |

Colors match `shared/design-tokens.json` (`primary` / `bgMain`).

## Regenerate

From repo root (needs ImageMagick `magick`). Use **8-bit opaque RGB** for the full icon — 16-bit/alpha exports previously made the iOS home-screen icon look black.

```bash
magick -density 384 brand/app-icon.svg -colorspace sRGB -depth 8 -alpha off -background '#285782' -flatten -resize 1024x1024 PNG24:brand/app-icon.png
magick -density 384 -background none brand/app-icon-foreground.svg -colorspace sRGB -depth 8 -resize 1024x1024 PNG32:brand/app-icon-foreground.png
magick -density 384 -background none brand/splash-logo.svg -colorspace sRGB -depth 8 -resize 1024x1024 PNG32:brand/splash-logo.png
cp brand/app-icon.png brand/app-icon-foreground.png brand/splash-logo.png mobile/assets/brand/
magick brand/app-icon.png -resize 192x192 PNG24:public/icon-192.png
magick brand/app-icon.png -resize 512x512 PNG24:public/icon-512.png
magick brand/app-icon.png -resize 180x180 PNG24:public/apple-touch-icon.png
magick -size 512x512 xc:'#285782' \( brand/app-icon-foreground.png -resize 340x340 \) -gravity center -compose over -composite -depth 8 PNG24:public/icon-512-maskable.png
```

Then in `mobile/`:

```bash
dart run flutter_launcher_icons
dart run flutter_native_splash:create
```
