import * as FileSystem from 'expo-file-system';

import bundledFord from '../data/vehicles/ford.json';

import {
  DATABASE_FOLDER_NAME,
  LOCAL_MANIFEST_NAME,
  REMOTE_MANIFEST_URL,
  REQUEST_TIMEOUT_MS,
} from '../config/databaseConfig';

const DATABASE_ROOT =
  `${FileSystem.documentDirectory}${DATABASE_FOLDER_NAME}/`;

const LOCAL_ROOT_MANIFEST_PATH =
  `${DATABASE_ROOT}${LOCAL_MANIFEST_NAME}`;

const BUNDLED_ROOT_MANIFEST = {
  schema_version: '2.1',
  updated_at: '2026-07-11',

  manufacturers: {
    ford: {
      name: 'Ford',
      version: 1,
      local_file: 'ford/bundled.json',
      bundled: true,
    },
  },
};

const BUNDLED_DATABASES = {
  ford: normaliseBundledManufacturer(
    bundledFord,
