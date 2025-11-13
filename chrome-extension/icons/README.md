# Placeholder Icons

The extension requires icon files for the Chrome toolbar. You have two options:

## Option 1: Add Your Own Icons (Recommended)

Create three PNG files with these exact names:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)  
- `icon128.png` (128x128 pixels)

You can:
- Design your own icons
- Use a free icon from sites like Flaticon, Icons8, or Noun Project
- Generate icons online at sites like favicon.io

## Option 2: Remove Icon References

If you want to test the extension without icons:

1. Open `manifest.json`
2. Remove these sections:
```json
"action": {
  "default_icon": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
},

"icons": {
  "16": "icons/icon16.png",
  "48": "icons/icon48.png",
  "128": "icons/icon128.png"
}
```

Chrome will display a default placeholder icon, and the extension will work normally.

## Quick Icon Suggestion

A simple magnifying glass or clipboard icon works well for this type of tool. Search for "job search icon" or "clipboard icon" on icon websites.
