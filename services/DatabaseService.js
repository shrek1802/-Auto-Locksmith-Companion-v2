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
    'ford',
    'Ford'
  ),
};

/*
 * Initialise the on-device database.
 *
 * The app always reads vehicle records from local storage.
 * Remote GitHub files are only used to update those local files.
 */
export async function initialiseDatabase() {
  await ensureDirectory(DATABASE_ROOT);

  const manifestExists =
    await fileExists(LOCAL_ROOT_MANIFEST_PATH);

  if (!manifestExists) {
    await installBundledDatabase();
  }

  return loadDatabase();
}

/*
 * Load all locally stored model files and combine them into:
 *
 * {
 *   ford: {
 *     manufacturer: {...},
 *     records: [...]
 *   }
 * }
 *
 * This keeps the existing app screens unchanged.
 */
export async function loadDatabase() {
  await ensureDirectory(DATABASE_ROOT);

  let rootManifest;

  try {
    rootManifest =
      await readJson(LOCAL_ROOT_MANIFEST_PATH);

    validateRootManifest(rootManifest);
  } catch (error) {
    console.warn(
      'Local root manifest is invalid. Restoring bundled database.',
      error
    );

    await resetToBundledDatabase();

    rootManifest =
      await readJson(LOCAL_ROOT_MANIFEST_PATH);
  }

  const byManufacturer = {};

  for (const [
    manufacturerId,
    manufacturerEntry,
  ] of Object.entries(
    rootManifest.manufacturers || {}
  )) {
    try {
      const combined =
        await loadLocalManufacturer(
          manufacturerId,
          manufacturerEntry
        );

      if (combined) {
        byManufacturer[manufacturerId] =
          combined;
      }
    } catch (error) {
      console.warn(
        `Could not load ${manufacturerId}:`,
        error?.message || error
      );
    }
  }

  return {
    manifest: rootManifest,
    byManufacturer,
  };
}

/*
 * Check the remote root manifest.
 *
 * A manufacturer is checked when:
 * - it is missing locally;
 * - its version changed;
 * - or its manifest hash changed.
 *
 * The manufacturer manifest then decides which individual
 * model files actually need downloading.
 */
export async function checkForDatabaseUpdates() {
  validateRemoteUrl();

  const remoteRootManifest =
    await fetchJsonNoCache(
      REMOTE_MANIFEST_URL
    );

  validateRootManifest(
    remoteRootManifest
  );

  const localRootManifest =
    await loadLocalRootManifest();

  const changed = [];

  for (const [
    manufacturerId,
    remoteEntry,
  ] of Object.entries(
    remoteRootManifest.manufacturers || {}
  )) {
    const localEntry =
      localRootManifest.manufacturers?.[
        manufacturerId
      ];

    const manufacturerChanged =
      !localEntry ||
      String(localEntry.version ?? '') !==
        String(remoteEntry.version ?? '') ||
      (
        remoteEntry.sha256 &&
        remoteEntry.sha256 !==
          localEntry.sha256
      );

    if (manufacturerChanged) {
      changed.push([
        manufacturerId,
        remoteEntry,
      ]);
    }
  }

  return {
    remote: remoteRootManifest,
    local: localRootManifest,
    changed,
  };
}

/*
 * Download only changed manufacturer manifests,
 * then only changed model files inside them.
 *
 * Returns manufacturer names only:
 *
 * ["Ford", "Toyota"]
 */
export async function downloadDatabaseUpdates(
  remoteRootManifest,
  changedEntries
) {
  await ensureDirectory(DATABASE_ROOT);

  validateRootManifest(
    remoteRootManifest
  );

  if (!Array.isArray(changedEntries)) {
    throw new Error(
      'The changed manufacturer list is invalid.'
    );
  }

  const localRootManifest =
    await loadLocalRootManifest();

  const nextRootManifest = {
    ...remoteRootManifest,

    manufacturers: {
      ...(localRootManifest.manufacturers ||
        {}),
    },
  };

  const updatedManufacturerNames = [];

  for (const [
    manufacturerId,
    remoteManufacturerEntry,
  ] of changedEntries) {
    const result =
      await updateManufacturer(
        manufacturerId,
        remoteManufacturerEntry,
        localRootManifest.manufacturers?.[
          manufacturerId
        ]
      );

    nextRootManifest.manufacturers[
      manufacturerId
    ] = {
      ...remoteManufacturerEntry,

      name:
        remoteManufacturerEntry.name ||
        result.manufacturerName ||
        formatName(manufacturerId),

      local_manifest:
        `${manufacturerId}/manifest.json`,
    };

    updatedManufacturerNames.push(
      remoteManufacturerEntry.name ||
        result.manufacturerName ||
        formatName(manufacturerId)
    );
  }

  nextRootManifest.updated_at =
    remoteRootManifest.updated_at ||
    new Date().toISOString();

  await writeJsonAtomically(
    LOCAL_ROOT_MANIFEST_PATH,
    nextRootManifest
  );

  return [
    ...new Set(
      updatedManufacturerNames
    ),
  ].sort((a, b) =>
    a.localeCompare(b)
  );
}

/*
 * Restore the database supplied inside the APK.
 */
export async function resetToBundledDatabase() {
  const rootExists =
    await fileExists(DATABASE_ROOT);

  if (rootExists) {
    await FileSystem.deleteAsync(
      DATABASE_ROOT,
      {
        idempotent: true,
      }
    );
  }

  await installBundledDatabase();

  return loadDatabase();
}

/*
 * Update one manufacturer.
 *
 * Example:
 *
 * ford/manifest.json
 * ford/fiesta.json
 * ford/focus.json
 */
async function updateManufacturer(
  manufacturerId,
  remoteManufacturerEntry,
  localManufacturerEntry
) {
  const manufacturerDirectory =
    `${DATABASE_ROOT}${manufacturerId}/`;

  await ensureDirectory(
    manufacturerDirectory
  );

  const remoteManifestReference =
    remoteManufacturerEntry.manifest ||
    remoteManufacturerEntry.file;

  if (!remoteManifestReference) {
    throw new Error(
      `No manufacturer manifest was supplied for ${manufacturerId}.`
    );
  }

  const remoteManufacturerManifestUrl =
    resolveUrl(
      REMOTE_MANIFEST_URL,
      remoteManifestReference
    );

  const remoteManufacturerManifest =
    await fetchJsonNoCache(
      remoteManufacturerManifestUrl
    );

  validateManufacturerManifest(
    remoteManufacturerManifest,
    manufacturerId
  );

  const localManufacturerManifestPath =
    `${manufacturerDirectory}manifest.json`;

  let localManufacturerManifest = {
    schema_version: '2.1',

    manufacturer: {
      id: manufacturerId,

      name:
        remoteManufacturerEntry.name ||
        formatName(manufacturerId),
    },

    version: 0,

    models: {},
  };

  if (
    await fileExists(
      localManufacturerManifestPath
    )
  ) {
    try {
      localManufacturerManifest =
        await readJson(
          localManufacturerManifestPath
        );
    } catch (error) {
      console.warn(
        `Local ${manufacturerId} manifest could not be read:`,
        error
      );
    }
  }

  const preparedModels = [];

  for (const [
    modelId,
    remoteModelEntry,
  ] of Object.entries(
    remoteManufacturerManifest.models ||
    {}
  )) {
    const localModelEntry =
      localManufacturerManifest.models?.[
        modelId
      ];

    const localModelPath =
      `${manufacturerDirectory}${modelId}.json`;

    const modelMissing =
      !(await fileExists(
        localModelPath
      ));

    const modelChanged =
      modelMissing ||
      !localModelEntry ||
      String(
        localModelEntry.version ?? ''
      ) !==
        String(
          remoteModelEntry.version ?? ''
        ) ||
      (
        remoteModelEntry.sha256 &&
        remoteModelEntry.sha256 !==
          localModelEntry.sha256
      );

    if (!modelChanged) {
      continue;
    }

    const remoteModelUrl =
      resolveUrl(
        remoteManufacturerManifestUrl,
        remoteModelEntry.file
      );

    const modelData =
      await fetchJsonNoCache(
        remoteModelUrl
      );

    validateModelFile(
      modelData,
      manufacturerId,
      modelId
    );

    const temporaryPath =
      `${manufacturerDirectory}.${modelId}.download.json`;

    await deleteIfExists(
      temporaryPath
    );

    await FileSystem.writeAsStringAsync(
      temporaryPath,
      JSON.stringify(
        modelData,
        null,
        2
      ),
      {
        encoding:
          FileSystem.EncodingType.UTF8,
      }
    );

    preparedModels.push({
      modelId,
      temporaryPath,
      finalPath:
        `${manufacturerDirectory}${modelId}.json`,
    });
  }

  /*
   * Only replace local files after every changed model
   * has downloaded and validated successfully.
   */
  try {
    for (const prepared of preparedModels) {
      await replaceFileSafely(
        prepared.temporaryPath,
        prepared.finalPath
      );
    }

    await writeJsonAtomically(
      localManufacturerManifestPath,
      remoteManufacturerManifest
    );
  } catch (error) {
    for (const prepared of preparedModels) {
      await deleteIfExists(
        prepared.temporaryPath
      );
    }

    throw error;
  }

  return {
    manufacturerName:
      remoteManufacturerManifest
        .manufacturer?.name ||
      remoteManufacturerEntry.name ||
      localManufacturerEntry?.name ||
      formatName(manufacturerId),
  };
}

/*
 * Combine all locally stored model files belonging
 * to one manufacturer.
 */
async function loadLocalManufacturer(
  manufacturerId,
  rootEntry
) {
  /*
   * Bundled fallback used before the first successful
   * remote database update.
   */
  if (
    rootEntry.bundled &&
    BUNDLED_DATABASES[
      manufacturerId
    ]
  ) {
    return BUNDLED_DATABASES[
      manufacturerId
    ];
  }

  const manufacturerDirectory =
    `${DATABASE_ROOT}${manufacturerId}/`;

  const manifestPath =
    `${manufacturerDirectory}manifest.json`;

  if (
    !(await fileExists(manifestPath))
  ) {
    const bundled =
      BUNDLED_DATABASES[
        manufacturerId
      ];

    return bundled || null;
  }

  const manufacturerManifest =
    await readJson(manifestPath);

  validateManufacturerManifest(
    manufacturerManifest,
    manufacturerId
  );

  const records = [];

  for (const [
    modelId,
    modelEntry,
  ] of Object.entries(
    manufacturerManifest.models || {}
  )) {
    const localFileName =
      getFileName(
        modelEntry.local_file ||
        modelEntry.file ||
        `${modelId}.json`
      );

    const localModelPath =
      `${manufacturerDirectory}${localFileName}`;

    try {
      const modelData =
        await readJson(
          localModelPath
        );

      validateModelFile(
        modelData,
        manufacturerId,
        modelId
      );

      records.push(
        ...(modelData.records || [])
      );
    } catch (error) {
      console.warn(
        `Could not load ${manufacturerId}/${modelId}:`,
        error?.message || error
      );
    }
  }

  return {
    schema_version:
      manufacturerManifest
        .schema_version ||
      '2.1',

    manufacturer: {
      id: manufacturerId,

      name:
        manufacturerManifest
          .manufacturer?.name ||
        rootEntry.name ||
        formatName(
          manufacturerId
        ),
    },

    records,
  };
}

/*
 * Install the bundled database included in the APK.
 */
async function installBundledDatabase() {
  await ensureDirectory(
    DATABASE_ROOT
  );

  for (const [
    manufacturerId,
    data,
  ] of Object.entries(
    BUNDLED_DATABASES
  )) {
    validateCombinedManufacturer(
      data,
      manufacturerId
    );

    const directory =
      `${DATABASE_ROOT}${manufacturerId}/`;

    await ensureDirectory(
      directory
    );

    await writeJsonAtomically(
      `${directory}bundled.json`,
      data
    );
  }

  await writeJsonAtomically(
    LOCAL_ROOT_MANIFEST_PATH,
    BUNDLED_ROOT_MANIFEST
  );
}

async function loadLocalRootManifest() {
  try {
    const manifest =
      await readJson(
        LOCAL_ROOT_MANIFEST_PATH
      );

    validateRootManifest(
      manifest
    );

    return manifest;
  } catch {
    return {
      schema_version: '2.1',
      updated_at: null,
      manufacturers: {},
    };
  }
}

function normaliseBundledManufacturer(
  value,
  manufacturerId,
  manufacturerName
) {
  if (
    value?.manufacturer &&
    Array.isArray(value?.records)
  ) {
    return value;
  }

  return {
    schema_version: '2.1',

    manufacturer: {
      id: manufacturerId,
      name: manufacturerName,
    },

    records:
      value?.records ||
      value?.vehicles ||
      (
        Array.isArray(value)
          ? value
          : []
      ),
  };
}

function validateRootManifest(
  manifest
) {
  if (
    !manifest ||
    typeof manifest !== 'object'
  ) {
    throw new Error(
      'The root database manifest is invalid.'
    );
  }

  if (
    !manifest.manufacturers ||
    typeof manifest.manufacturers !==
      'object' ||
    Array.isArray(
      manifest.manufacturers
    )
  ) {
    throw new Error(
      'The root manifest must contain a manufacturers object.'
    );
  }
}

function validateManufacturerManifest(
  manifest,
  expectedManufacturerId
) {
  if (
    !manifest ||
    typeof manifest !== 'object'
  ) {
    throw new Error(
      `The ${expectedManufacturerId} manifest is invalid.`
    );
  }

  if (
    !manifest.manufacturer ||
    typeof manifest.manufacturer !==
      'object'
  ) {
    throw new Error(
      `Manufacturer information is missing from ${expectedManufacturerId}.`
    );
  }

  if (
    manifest.manufacturer.id &&
    manifest.manufacturer.id !==
      expectedManufacturerId
  ) {
    throw new Error(
      `Manufacturer ID mismatch in ${expectedManufacturerId}.`
    );
  }

  if (
    !manifest.models ||
    typeof manifest.models !==
      'object' ||
    Array.isArray(
      manifest.models
    )
  ) {
    throw new Error(
      `The ${expectedManufacturerId} manifest must contain a models object.`
    );
  }
}

function validateModelFile(
  modelData,
  expectedManufacturerId,
  expectedModelId
) {
  if (
    !modelData ||
    typeof modelData !== 'object'
  ) {
    throw new Error(
      `${expectedManufacturerId}/${expectedModelId}.json is invalid.`
    );
  }

  if (
    !modelData.manufacturer ||
    typeof modelData.manufacturer !==
      'object'
  ) {
    throw new Error(
      `Manufacturer information is missing from ${expectedManufacturerId}/${expectedModelId}.json.`
    );
  }

  if (
    modelData.manufacturer.id &&
    modelData.manufacturer.id !==
      expectedManufacturerId
  ) {
    throw new Error(
      `Manufacturer ID mismatch in ${expectedManufacturerId}/${expectedModelId}.json.`
    );
  }

  if (
    !modelData.model ||
    typeof modelData.model !==
      'object'
  ) {
    throw new Error(
      `Model information is missing from ${expectedManufacturerId}/${expectedModelId}.json.`
    );
  }

  if (
    modelData.model.id &&
    modelData.model.id !==
      expectedModelId
  ) {
    throw new Error(
      `Model ID mismatch in ${expectedManufacturerId}/${expectedModelId}.json.`
    );
  }

  if (
    !Array.isArray(
      modelData.records
    )
  ) {
    throw new Error(
      `Vehicle records are missing from ${expectedManufacturerId}/${expectedModelId}.json.`
    );
  }

  for (const record of modelData.records) {
    if (
      !record?.record_id ||
      !record?.vehicle
    ) {
      throw new Error(
        `An invalid vehicle record was found in ${expectedManufacturerId}/${expectedModelId}.json.`
      );
    }

    if (
      record.vehicle.market &&
      record.vehicle.market !== 'UK'
    ) {
      throw new Error(
        `A non-UK record was found in ${expectedManufacturerId}/${expectedModelId}.json.`
      );
    }

    if (
      record.vehicle.drive_side &&
      record.vehicle.drive_side !==
        'RHD'
    ) {
      throw new Error(
        `A non-RHD record was found in ${expectedManufacturerId}/${expectedModelId}.json.`
      );
    }
  }
}

function validateCombinedManufacturer(
  data,
  expectedManufacturerId
) {
  if (
    !data?.manufacturer ||
    !Array.isArray(data?.records)
  ) {
    throw new Error(
      `The bundled ${expectedManufacturerId} database is invalid.`
    );
  }
}

async function fetchJsonNoCache(
  url
) {
  const controller =
    new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const separator =
      url.includes('?')
        ? '&'
        : '?';

    const response = await fetch(
      `${url}${separator}t=${Date.now()}`,
      {
        signal: controller.signal,

        headers: {
          Accept:
            'application/json',

          'Cache-Control':
            'no-cache',
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status} for ${url}.`
      );
    }

    return response.json();
  } catch (error) {
    if (
      error?.name ===
      'AbortError'
    ) {
      throw new Error(
        'The database download timed out.'
      );
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function resolveUrl(
  parentUrl,
  childPath
) {
  if (
    /^https?:\/\//i.test(
      childPath || ''
    )
  ) {
    return childPath;
  }

  const base =
    parentUrl.slice(
      0,
      parentUrl.lastIndexOf('/') + 1
    );

  return `${base}${String(
    childPath || ''
  ).replace(/^\/+/, '')}`;
}

async function ensureDirectory(
  path
) {
  const info =
    await FileSystem.getInfoAsync(
      path
    );

  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(
      path,
      {
        intermediates: true,
      }
    );
  }
}

async function fileExists(path) {
  const info =
    await FileSystem.getInfoAsync(
      path
    );

  return info.exists;
}

async function readJson(path) {
  const text =
    await FileSystem.readAsStringAsync(
      path,
      {
        encoding:
          FileSystem.EncodingType.UTF8,
      }
    );

  return JSON.parse(text);
}

async function writeJsonAtomically(
  finalPath,
  value
) {
  const temporaryPath =
    `${finalPath}.writing`;

  await deleteIfExists(
    temporaryPath
  );

  await FileSystem.writeAsStringAsync(
    temporaryPath,
    JSON.stringify(
      value,
      null,
      2
    ),
    {
      encoding:
        FileSystem.EncodingType.UTF8,
    }
  );

  await replaceFileSafely(
    temporaryPath,
    finalPath
  );
}

async function replaceFileSafely(
  temporaryPath,
  finalPath
) {
  const backupPath =
    `${finalPath}.backup`;

  await deleteIfExists(
    backupPath
  );

  if (
    await fileExists(finalPath)
  ) {
    await FileSystem.moveAsync({
      from: finalPath,
      to: backupPath,
    });
  }

  try {
    await FileSystem.moveAsync({
      from: temporaryPath,
      to: finalPath,
    });

    await deleteIfExists(
      backupPath
    );
  } catch (error) {
    if (
      await fileExists(backupPath)
    ) {
      await FileSystem.moveAsync({
        from: backupPath,
        to: finalPath,
      });
    }

    throw error;
  }
}

async function deleteIfExists(path) {
  if (
    await fileExists(path)
  ) {
    await FileSystem.deleteAsync(
      path,
      {
        idempotent: true,
      }
    );
  }
}

function getFileName(value) {
  return String(value || '')
    .split('/')
    .pop();
}

function formatName(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

function validateRemoteUrl() {
  if (
    !REMOTE_MANIFEST_URL ||
    REMOTE_MANIFEST_URL.includes(
      'CHANGE-ME'
    )
  ) {
    throw new Error(
      'Set REMOTE_MANIFEST_URL in config/databaseConfig.js first.'
    );
  }
}
