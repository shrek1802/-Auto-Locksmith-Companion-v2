import bundledFordDatabase from '../data/vehicles/ford.json';

/*
 * Remote entry point.
 *
 * The root manifest can move manufacturers and model files anywhere in the
 * database repository. DatabaseService resolves all child paths from the
 * manifest URLs, so the app does not hard-code `database/vehicles/...`.
 */
export const REMOTE_MANIFEST_URL =
  'https://raw.githubusercontent.com/shrek1802/locksmith-companion-database/main/manifest.json';

/*
 * On-device database storage.
 *
 * These names are exported under both the current and legacy identifiers
 * because DatabaseService currently imports DATABASE_FOLDER_NAME and
 * LOCAL_MANIFEST_NAME.
 */
export const DATABASE_FOLDER_NAME = 'locksmith_database_v2';
export const LOCAL_MANIFEST_NAME = 'manifest.json';

export const DATABASE_DIRECTORY_NAME = DATABASE_FOLDER_NAME;
export const LOCAL_MANIFEST_FILE_NAME = LOCAL_MANIFEST_NAME;

/*
 * Bundled fallback.
 *
 * This is used before the first successful remote database update and whenever
 * the user resets the app database. Remote Ford model files replace this
 * fallback after they are published through the manufacturer manifest.
 */
export const BUNDLED_MANIFEST = {
  schema_version: '2.1',
  updated_at: '2026-07-12',
  manufacturers: {
    ford: {
      name: 'Ford',
      version: 1,
      local_file: 'ford/bundled.json',
      bundled: true,
    },
  },
};

export const BUNDLED_DATABASES = {
  ford: bundledFordDatabase,
};
