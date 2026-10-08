# Module Lab
Interactive Three.js modular sci-fi building prototype, based on the supplied concept sheet (`public/reference.png`). Parts are procedural approximations, not extracted mesh assets.

## Run
`npm ci`, then `npm run dev`. Production: `npm run build`.

## Build
Choose a kit part and click the ground to place it on the 3 m grid. Select existing modules to change floor, quarter-turn rotation, or standard/reinforced/powered variant. Drag to orbit, scroll to zoom. R rotates selected parts; Delete removes them; Escape returns to selection mode.

Width, depth, levels, and roof treatment regenerate the whole building (replacing manual edits). Finish and accent lighting preserve the assembly. Includes research/power/empty presets, cutaway roof, JSON import/export, and browser-local autosave. Floor placement is adjusted after placing. Prototype does not enforce structural or collision validity between different module types.

## Deployment
GitHub Actions runs tests/build and deploys to GitHub Pages. In repository Settings → Pages, select GitHub Actions as the source before the first deployment.
