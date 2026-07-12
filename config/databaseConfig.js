export const REMOTE_MANIFEST_URL =
  'https://raw.githubusercontent.com/shrek1802/locksmith-companion-database/main/manifest.json';

/*
 * V3 intentionally uses a new on-device folder.
 *
 * This leaves the old bundled/stale Ford cache behind and starts this app
 * build with an empty local database. The first database update then downloads
 * the current files from the database repository.
 */
export const DATABASE_FOLDER_NAME =
  'locksmith_database_v3_remote';

export const LOCAL_MANIFEST_NAME =
  'manifest.json';

export const REQUEST_TIMEOUT_MS =
  30000;

// Legacy aliases retained for any older imports.
export const DATABASE_DIRECTORY_NAME =
  DATABASE_FOLDER_NAME;

export const LOCAL_MANIFEST_FILE_NAME =
  LOCAL_MANIFEST_NAME;

/*
 * These remain exported as empty objects for compatibility with any older
 * imports elsewhere in the app. No vehicle records are bundled in the APK.
 */
export const BUNDLED_MANIFEST = {
  schema_version: '2.1',
  updated_at: null,
  database_source: 'remote_only',
  manufacturers: {},
};

export const BUNDLED_DATABASES = {};
