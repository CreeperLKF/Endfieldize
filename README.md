# Endfieldize

Endfieldize is a browser-based editor for applying a Wuling-inspired Endfield look to still images, adding large white location typography, and exporting a slow push-in video.

## Run

```bash
npm install
npm run dev
```

Open the local Vite URL, upload a JPG or PNG, tune the controls, then export JPG/PNG stills or MP4/GIF motion. WEBM and experimental .LIVP export are available under Advanced export.

## MVP Boundary

The MVP supports browser video export. Live Photo export is intentionally decoupled and can be added as a future exporter without changing the editor state model.

## CDN Release

CDN assets are published to the `cdn` branch by version directory, so jsDelivr can serve immutable release paths without committing `dist/` to `main`.

```bash
npm run release:cdn -- vX.Y.Z --publish
```

Versioned CDN paths use this shape:

```text
https://cdn.jsdelivr.net/gh/CreeperLKF/Endfieldize@cdn/vX.Y.Z/
```
