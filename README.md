# Module Lab
Interactive Three.js modular sci-fi habitat prototype, based on `public/reference.png`. The kit contains 17 distinct procedural approximations, including the solar corner from the concept sheet plus a deck tile.

## Run
`npm ci`, then `npm run dev`. Production: `npm run build`.

## Assembly
The default Full kit / mixed roof uses every piece. It includes sealed full-height armor and observation panels, an airlock, an integrated service hatch, L-shaped corner joints, sloped solar/utility roof bays, a solar corner, a communications spire, an entry gantry with supports, brackets, and a service apron with reactor and ventilation equipment. The foreground includes a terminal and bio planter.

Choose a kit piece using its rendered 3D preview and click the ground to place it. Select modules to change X/Z position, floor, quarter-turn rotation, or standard/reinforced/powered variant. Drag to orbit, scroll to zoom. R rotates selected parts; Delete removes them; Escape returns to selection mode.

Width, depth, levels, and roof treatment regenerate the building and replace manual edits. Finish and accent preserve the assembly. Flat and cutaway modes intentionally omit roof equipment. A shell indicator reports missing structural bays; Repair restores only those bays. JSON import/export and browser-local autosave are included. On the first update from v1, the previous assembly is backed up locally and remains available through Previous assembly.

This is a visual prototype: the shell audit checks the generated grid bays, not general collision safety, structural engineering, or arbitrary imported geometry.

## Verification and deployment
`npm test` verifies full kit usage, shell continuity with geometry raycasts at seams across multiple levels, missing-bay detection, and import validation. `npm run test:browser` checks browser rendering, thumbnails, repairs, roof changes, export, persistence, and mobile width. Install the Chromium test browser with `npx playwright install chromium` first when running outside CI.

GitHub Actions runs both test suites, saves browser screenshots as the `browser-qa` artifact, builds and deploys to GitHub Pages. Use GitHub Actions as the repository's Pages source.
