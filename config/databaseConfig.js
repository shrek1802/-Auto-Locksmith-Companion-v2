import bundledFordDatabase from '../data/bundled/ford.json';

export const REMOTE_MANIFEST_URL =
  'https://raw.githubusercontent.com/shrek1802/locksmith-companion-database/main/manifest.json';

export const DATABASE_DIRECTORY_NAME =
  'locksmith_database_v2';

export const LOCAL_MANIFEST_FILE_NAME =
  'manifest.json';

export const BUNDLED_MANIFEST = {
  schema_version: '2.0',
  updated_at: '2026-07-11',

  manufacturers: {
    ford: {
      name: 'Ford',
      version: 1,
      file: 'ford.json',
      local_file: 'ford.json',
    },
  },
};

export const BUNDLED_DATABASES = {
  ford: bundledFordDatabase,
};
