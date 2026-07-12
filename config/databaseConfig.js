import bundledFordDatabase from '../data/vehicles/ford.json';

export const REMOTE_MANIFEST_URL =
  'https://raw.githubusercontent.com/shrek1802/locksmith-companion-database/main/manifest.json';

export const DATABASE_FOLDER_NAME =
  'locksmith_database_v2';

export const LOCAL_MANIFEST_NAME =
  'manifest.json';

export const REQUEST_TIMEOUT_MS =
  30000;

// Legacy aliases retained for any older imports.
export const DATABASE_DIRECTORY_NAME =
  DATABASE_FOLDER_NAME;

export const LOCAL_MANIFEST_FILE_NAME =
  LOCAL_MANIFEST_NAME;

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
