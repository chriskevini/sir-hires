# Extension Icons

This directory contains the extension icons generated from `original.png`.

## Icon Files

- `original.png` - Source icon (645x723 pixels)
- `icon16.png` - Toolbar icon (16x16 pixels)
- `icon48.png` - Extension management page (48x48 pixels)
- `icon128.png` - Chrome Web Store listing (128x128 pixels)

## Regenerating Icons

If you update `original.png`, regenerate the icons with:

```bash
cd chrome-extension/icons
magick original.png -resize 16x16 icon16.png
magick original.png -resize 48x48 icon48.png
magick original.png -resize 128x128 icon128.png
```

Note: ImageMagick preserves aspect ratio by default, so icons may be slightly smaller than target dimensions to avoid distortion.
