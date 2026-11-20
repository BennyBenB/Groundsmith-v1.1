# Packaging: friends, signing, Steam

## Friends
Send `Groundsmith-<ver>-portable.exe` (Windows), the `.dmg` (macOS) or the `.AppImage` (Linux).
Linux: `chmod +x` the AppImage, then run it.

Unsigned builds show warnings:
- **Windows SmartScreen**: "More info" -> "Run anyway". A code-signing certificate removes it.
- **macOS Gatekeeper**: right-click the app -> Open the first time. To remove the warning you need an Apple
  Developer account ($99/yr): set `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`,
  `APPLE_TEAM_ID` as CI secrets and add `"mac": { "notarize": true }` to the `build` block in `package.json`.

## Steam
1. Pay the one-off $100 app fee in Steamworks and create the app and its depots (one per OS).
2. Build the unpacked folders, not the installers: `npm run dist:dir` on each OS gives
   `dist/win-unpacked`, `dist/mac`, `dist/linux-unpacked`. Steam wants a plain folder.
3. Point one depot at each folder in a SteamCMD build script (`app_build.vdf` + `depot_build_<id>.vdf`), then:
   `steamcmd +login <builder> +run_app_build app_build.vdf +quit`
4. Launch options in Steamworks: Windows `Groundsmith.exe`; Linux `groundsmith`; macOS `Groundsmith.app`.
   (Check the exact executable names in the unpacked folders.)
5. The wrapper adds `--no-sandbox` on Linux when Steam sets `SteamAppId`, since Chromium's sandbox often fails in
   Steam's container. Test on Steam Deck / Linux before release.

Notes
- The Steam overlay is unreliable with Electron apps (Chromium's GPU process). Treat it as best effort.
- Achievements, cloud saves and the like need `steamworks.js` plus a `steam_appid.txt` during development.
  They are not wired in: the game currently has no Steam integration.
- Saved stadiums live in the app's localStorage (inside the user's app-data folder), not in Steam Cloud.
