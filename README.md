# Locksmith Companion Pro V2.0

Clean UK-only/RHD Expo app using the locked V2 JSON schema.

## Included

- Manufacturer → model → year range navigation
- Add Key and All Keys Lost dropdowns
- Tool-specific expandable information
- Supported, partial, conditional, unsupported, unknown and untested statuses
- Vehicle cable/adaptor, accessory, internet, method, time and warning fields
- Locally bundled manufacturer SVG paths via `simple-icons`
- Offline-first manufacturer database
- Downloads only changed manufacturer files
- Validates every file before replacing the saved copy
- Shows only the manufacturer names that were updated
- GitHub Actions Android APK build
- Existing Expo Updates support retained

## Important: connect your JSON repository

Open:

`config/databaseConfig.js`

Replace `REMOTE_MANIFEST_URL` with the raw GitHub URL to your V2 manifest, for example:

`https://raw.githubusercontent.com/YOUR-NAME/YOUR-DATA-REPO/main/manifest.json`

The app deliberately refuses to update while the placeholder remains, preventing accidental downloads from the wrong location.

## Remote repository layout

```text
manifest.json
manufacturers/
  ford.json
  toyota.json
  bmw.json
```

Use `remote-manifest.example.json` as the manifest template. Increase a brand's `version` whenever its JSON changes. The app compares that version with the locally saved manifest and downloads only changed brands.

## Offline-first behaviour

1. On first launch, the bundled Ford example is copied to the app's document storage.
2. Screens read manufacturer JSON from document storage, not directly from GitHub.
3. Press the cloud-download button to check the remote manifest.
4. Only new or changed brands download.
5. All downloads are parsed and schema-validated in temporary files.
6. Existing files are replaced only after every changed file validates.
7. The completion message lists only the updated brand names.
8. If a download fails, the previous saved database remains usable.

## Install/build

```bash
npm install
npm run check
npm start
```

Push the project to GitHub and run `.github/workflows/build-apk.yml`. Keep the `EXPO_TOKEN` repository secret configured as before.

Do not upload `node_modules`.
