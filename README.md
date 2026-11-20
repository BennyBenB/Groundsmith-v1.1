# Groundsmith desktop

Electron wrapper around the Groundsmith web game (`app/index.html`). No server, no backend.

## Run it

    npm install
    npm start

## Build installers for friends

    npm run dist:win     # Windows: single-file portable .exe + zip
    npm run dist:mac     # macOS: .dmg + zip   (must run on a Mac)
    npm run dist:linux   # Linux: .AppImage + tar.gz

Output goes to `dist/`. Each OS must be built on that OS, so the easy route is GitHub:
push this folder to a repo, then either run the "Build desktop apps" workflow by hand
or push a tag (`git tag v1.0.0 && git push --tags`). The workflow builds all three and
attaches them to a GitHub Release.

`npm run dist*` first runs `scripts/vendor-fonts.js`, which downloads the Inter and Silkscreen
fonts into `app/fonts` so the game looks right offline. It needs internet once.

## Updating the game

Replace `app/index.html` with the new single-file build and rebuild. (If you replace it, the fonts
script will re-vendor the fonts on the next `npm run dist*`.)

## What the wrapper adds

- Private `app://` origin, so saved stadiums (localStorage) survive updates.
- Native Save dialog for "Export picture" (the web build uses a claude.ai-only download API).
- Single-instance lock, F11 fullscreen, external links open in the real browser.
- Locked-down renderer (sandbox, context isolation, no Node in the page).

See `docs/PACKAGING.md` for Steam and signing.
