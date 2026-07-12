import * as FileSystem from 'expo-file-system';

import bundledFord from '../data/vehicles/ford.json';
import {
  DATABASE_FOLDER_NAME,
  LOCAL_MANIFEST_NAME,
  REMOTE_MANIFEST_URL,
  REQUEST_TIMEOUT_MS,
} from '../config/databaseConfig';

const DATABASE_ROOT = `${FileSystem.documentDirectory}${DATABASE_FOLDER_NAME}/`;
const LOCAL_ROOT_MANIFEST_PATH = `${DATABASE_ROOT}${LOCAL_MANIFEST_NAME}`;

const BUNDLED_ROOT_MANIFEST = {
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

const BUNDLED_DATABASES = {
  ford: normaliseBundledManufacturer(bundledFord, 'ford', 'Ford'),
};

export async function initialiseDatabase() {
  await ensureDirectory(DATABASE_ROOT);

  if (!(await fileExists(LOCAL_ROOT_MANIFEST_PATH))) {
    await installBundledDatabase();
  }

  return loadDatabase();
}

export async function loadDatabase() {
  await ensureDirectory(DATABASE_ROOT);

  let rootManifest;

  try {
    rootManifest = await readJson(LOCAL_ROOT_MANIFEST_PATH);
    validateRootManifest(rootManifest);
  } catch (error) {
    console.warn('Local manifest invalid. Restoring bundled data.', error);
    await resetToBundledDatabase();
    rootManifest = await readJson(LOCAL_ROOT_MANIFEST_PATH);
  }

  const byManufacturer = {};

  for (const [manufacturerId, manufacturerEntry] of Object.entries(
    rootManifest.manufacturers || {},
  )) {
    try {
      const combined = await loadLocalManufacturer(
        manufacturerId,
        manufacturerEntry,
      );

      if (combined) {
        byManufacturer[manufacturerId] = combined;
      }
    } catch (error) {
      console.warn(
        `Could not load ${manufacturerId}:`,
        error?.message || error,
      );
    }
  }

  return {
    manifest: rootManifest,
    byManufacturer,
  };
}

export async function checkForDatabaseUpdates() {
  validateRemoteUrl();

  const remoteRootManifest = await fetchJsonNoCache(REMOTE_MANIFEST_URL);
  validateRootManifest(remoteRootManifest);

  const localRootManifest = await loadLocalRootManifest();
  const changed = [];

  for (const [manufacturerId, remoteEntry] of Object.entries(
    remoteRootManifest.manufacturers || {},
  )) {
    const localEntry = localRootManifest.manufacturers?.[manufacturerId];

    const manufacturerChanged =
      !localEntry ||
      String(localEntry.version ?? '') !== String(remoteEntry.version ?? '') ||
      (remoteEntry.sha256 && remoteEntry.sha256 !== localEntry.sha256);

    if (manufacturerChanged) {
      changed.push([manufacturerId, remoteEntry]);
    }
  }

  return {
    remote: remoteRootManifest,
    local: localRootManifest,
    changed,
  };
}

export async function downloadDatabaseUpdates(
  remoteRootManifest,
  changedEntries,
) {
  await ensureDirectory(DATABASE_ROOT);
  validateRootManifest(remoteRootManifest);

  const localRootManifest = await loadLocalRootManifest();

  const nextRootManifest = {
    ...remoteRootManifest,
    manufacturers: {
      ...(localRootManifest.manufacturers || {}),
    },
  };

  const updatedManufacturerNames = [];

  for (const [manufacturerId, remoteManufacturerEntry] of changedEntries) {
    const result = await updateManufacturer(
      manufacturerId,
      remoteManufacturerEntry,
      localRootManifest.manufacturers?.[manufacturerId],
    );

    nextRootManifest.manufacturers[manufacturerId] = {
      ...remoteManufacturerEntry,
      name:
        remoteManufacturerEntry.name ||
        result.manufacturerName ||
        formatName(manufacturerId),
      local_manifest: `${manufacturerId}/manifest.json`,
    };

    updatedManufacturerNames.push(
      remoteManufacturerEntry.name ||
        result.manufacturerName ||
        formatName(manufacturerId),
    );
  }

  await writeJsonAtomically(
    LOCAL_ROOT_MANIFEST_PATH,
    nextRootManifest,
  );

  return [...new Set(updatedManufacturerNames)].sort((a, b) =>
    a.localeCompare(b),
  );
}

export async function resetToBundledDatabase() {
  if (await fileExists(DATABASE_ROOT)) {
    await FileSystem.deleteAsync(DATABASE_ROOT, { idempotent: true });
  }

  await installBundledDatabase();
  return loadDatabase();
}

async function updateManufacturer(
  manufacturerId,
  remoteManufacturerEntry,
  localManufacturerEntry,
) {
  const manufacturerDirectory = `${DATABASE_ROOT}${manufacturerId}/`;
  await ensureDirectory(manufacturerDirectory);

  const remoteManifestReference =
    remoteManufacturerEntry.manifest || remoteManufacturerEntry.file;

  if (!remoteManifestReference) {
    throw new Error(
      `No manufacturer manifest supplied for ${manufacturerId}.`,
    );
  }

  const remoteManufacturerManifestUrl = resolveUrl(
    REMOTE_MANIFEST_URL,
    remoteManifestReference,
  );

  const remoteManufacturerManifest = await fetchJsonNoCache(
    remoteManufacturerManifestUrl,
  );

  validateManufacturerManifest(
    remoteManufacturerManifest,
    manufacturerId,
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

  if (await fileExists(localManufacturerManifestPath)) {
    try {
      localManufacturerManifest = await readJson(
        localManufacturerManifestPath,
      );
    } catch {
      // Use the empty local manifest fallback.
    }
  }

  const preparedFiles = [];

  for (const [modelId, remoteModelEntry] of Object.entries(
    remoteManufacturerManifest.models || {},
  )) {
    const localModelEntry =
      localManufacturerManifest.models?.[modelId];

    const modelChanged =
      !localModelEntry ||
      String(localModelEntry.version ?? '') !==
        String(remoteModelEntry.version ?? '') ||
      (
        remoteModelEntry.sha256 &&
        remoteModelEntry.sha256 !== localModelEntry.sha256
      );

    if (!modelChanged) {
      continue;
    }

    if (remoteModelEntry.manifest) {
      await prepareNestedModelDownload({
        manufacturerId,
        modelId,
        remoteModelEntry,
        remoteManufacturerManifestUrl,
        manufacturerDirectory,
        preparedFiles,
      });
    } else {
      await prepareFlatModelDownload({
        manufacturerId,
        modelId,
        remoteModelEntry,
        remoteManufacturerManifestUrl,
        manufacturerDirectory,
        preparedFiles,
      });
    }
  }

  try {
    for (const prepared of preparedFiles) {
      await ensureDirectory(
        prepared.finalPath.slice(
          0,
          prepared.finalPath.lastIndexOf('/') + 1,
        ),
      );

      await replaceFileSafely(
        prepared.temporaryPath,
        prepared.finalPath,
      );
    }

    await writeJsonAtomically(
      localManufacturerManifestPath,
      remoteManufacturerManifest,
    );
  } catch (error) {
    for (const prepared of preparedFiles) {
      await deleteIfExists(prepared.temporaryPath);
    }
    throw error;
  }

  return {
    manufacturerName:
      remoteManufacturerManifest.manufacturer?.name ||
      remoteManufacturerEntry.name ||
      localManufacturerEntry?.name ||
      formatName(manufacturerId),
  };
}

async function prepareFlatModelDownload({
  manufacturerId,
  modelId,
  remoteModelEntry,
  remoteManufacturerManifestUrl,
  manufacturerDirectory,
  preparedFiles,
}) {
  if (!remoteModelEntry.file) {
    throw new Error(
      `No file supplied for ${manufacturerId}/${modelId}.`,
    );
  }

  const remoteModelUrl = resolveUrl(
    remoteManufacturerManifestUrl,
    remoteModelEntry.file,
  );

  const modelData = await fetchJsonNoCache(remoteModelUrl);
  validateLegacyModelFile(modelData, manufacturerId, modelId);

  const temporaryPath =
    `${manufacturerDirectory}.${modelId}.download.json`;

  await writeTemporaryJson(temporaryPath, modelData);

  preparedFiles.push({
    temporaryPath,
    finalPath: `${manufacturerDirectory}${modelId}.json`,
  });
}

async function prepareNestedModelDownload({
  manufacturerId,
  modelId,
  remoteModelEntry,
  remoteManufacturerManifestUrl,
  manufacturerDirectory,
  preparedFiles,
}) {
  const remoteModelManifestUrl = resolveUrl(
    remoteManufacturerManifestUrl,
    remoteModelEntry.manifest,
  );

  const modelManifest = await fetchJsonNoCache(
    remoteModelManifestUrl,
  );

  validateNestedModelManifest(
    modelManifest,
    manufacturerId,
    modelId,
  );

  const modelDirectory = `${manufacturerDirectory}${modelId}/`;

  const temporaryManifestPath =
    `${manufacturerDirectory}.${modelId}.manifest.download.json`;

  await writeTemporaryJson(
    temporaryManifestPath,
    modelManifest,
  );

  preparedFiles.push({
    temporaryPath: temporaryManifestPath,
    finalPath: `${modelDirectory}manifest.json`,
  });

  for (const [componentId, componentReference] of Object.entries(
    modelManifest.files || {},
  )) {
    const relativeFile =
      typeof componentReference === 'string'
        ? componentReference
        : componentReference?.file;

    if (!relativeFile) {
      throw new Error(
        `Missing file path for ${manufacturerId}/${modelId}/${componentId}.`,
      );
    }

    const componentData = await fetchJsonNoCache(
      resolveUrl(remoteModelManifestUrl, relativeFile),
    );

    if (!componentData || typeof componentData !== 'object') {
      throw new Error(
        `${manufacturerId}/${modelId}/${componentId} is invalid.`,
      );
    }

    const temporaryPath =
      `${manufacturerDirectory}.${modelId}.${componentId}.download.json`;

    await writeTemporaryJson(
      temporaryPath,
      componentData,
    );

    preparedFiles.push({
      temporaryPath,
      finalPath:
        `${modelDirectory}${getFileName(relativeFile)}`,
    });
  }
}

async function loadLocalManufacturer(
  manufacturerId,
  rootEntry,
) {
  if (rootEntry.bundled && BUNDLED_DATABASES[manufacturerId]) {
    return BUNDLED_DATABASES[manufacturerId];
  }

  const manufacturerDirectory =
    `${DATABASE_ROOT}${manufacturerId}/`;

  const manifestPath =
    `${manufacturerDirectory}manifest.json`;

  if (!(await fileExists(manifestPath))) {
    return BUNDLED_DATABASES[manufacturerId] || null;
  }

  const manufacturerManifest = await readJson(manifestPath);

  validateManufacturerManifest(
    manufacturerManifest,
    manufacturerId,
  );

  const records = [];

  for (const [modelId, modelEntry] of Object.entries(
    manufacturerManifest.models || {},
  )) {
    if (modelEntry.manifest) {
      records.push(
        ...await loadNestedModelRecords(
          manufacturerId,
          modelId,
          manufacturerDirectory,
        ),
      );
    } else {
      records.push(
        ...await loadLegacyModelRecords(
          manufacturerId,
          modelId,
          modelEntry,
          manufacturerDirectory,
        ),
      );
    }
  }

  return {
    schema_version:
      manufacturerManifest.schema_version || '2.1',
    manufacturer: {
      id: manufacturerId,
      name:
        manufacturerManifest.manufacturer?.name ||
        rootEntry.name ||
        formatName(manufacturerId),
    },
    records,
  };
}

async function loadLegacyModelRecords(
  manufacturerId,
  modelId,
  modelEntry,
  manufacturerDirectory,
) {
  const localFileName = getFileName(
    modelEntry.local_file ||
      modelEntry.file ||
      `${modelId}.json`,
  );

  const modelData = await readJson(
    `${manufacturerDirectory}${localFileName}`,
  );

  validateLegacyModelFile(
    modelData,
    manufacturerId,
    modelId,
  );

  return modelData.records || [];
}

async function loadNestedModelRecords(
  manufacturerId,
  modelId,
  manufacturerDirectory,
) {
  const modelDirectory =
    `${manufacturerDirectory}${modelId}/`;

  const modelManifest = await readJson(
    `${modelDirectory}manifest.json`,
  );

  validateNestedModelManifest(
    modelManifest,
    manufacturerId,
    modelId,
  );

  const components = {};

  for (const [componentId, componentReference] of Object.entries(
    modelManifest.files || {},
  )) {
    const relativeFile =
      typeof componentReference === 'string'
        ? componentReference
        : componentReference?.file;

    components[componentId] = await readJson(
      `${modelDirectory}${getFileName(relativeFile)}`,
    );
  }

  return composeNestedModelRecords(
    manufacturerId,
    modelId,
    modelManifest,
    components,
  );
}

function composeNestedModelRecords(
  manufacturerId,
  modelId,
  modelManifest,
  components,
) {
  const modelsComponent =
    components.models || components.vehicles || {};

  if (Array.isArray(modelsComponent.records)) {
    return modelsComponent.records.map((record) =>
      attachNestedSections(record, components),
    );
  }

  const modelItems = modelsComponent.items || {};

  return Object.entries(modelItems).map(
    ([variantId, vehicleDefinition]) => {
      const vehicle =
        vehicleDefinition.vehicle || vehicleDefinition;

      return attachNestedSections(
        {
          record_id:
            vehicleDefinition.record_id ||
            `${manufacturerId}_${modelId}_${variantId}`,
          vehicle: {
            ...vehicle,
            manufacturer_id:
              vehicle.manufacturer_id || manufacturerId,
            model_id:
              vehicle.model_id || modelId,
            market:
              vehicle.market || 'UK',
            drive_side:
              vehicle.drive_side || 'RHD',
          },
        },
        components,
        variantId,
      );
    },
  );
}

function attachNestedSections(
  record,
  components,
  variantId = null,
) {
  const result = { ...record };

  for (const [componentId, componentData] of Object.entries(
    components,
  )) {
    if (
      componentId === 'models' ||
      componentId === 'vehicles'
    ) {
      continue;
    }

    const section = selectComponentSection(
      componentData,
      variantId,
      record.record_id,
    );

    if (section !== undefined) {
      result[componentId] = section;
    }
  }

  return result;
}

function selectComponentSection(
  componentData,
  variantId,
  recordId,
) {
  if (!componentData || typeof componentData !== 'object') {
    return undefined;
  }

  if (
    variantId &&
    componentData.items &&
    Object.prototype.hasOwnProperty.call(
      componentData.items,
      variantId,
    )
  ) {
    return componentData.items[variantId];
  }

  if (
    recordId &&
    componentData.items &&
    Object.prototype.hasOwnProperty.call(
      componentData.items,
      recordId,
    )
  ) {
    return componentData.items[recordId];
  }

  if (componentData.shared !== undefined) {
    return componentData.shared;
  }

  return componentData.items || componentData;
}

async function installBundledDatabase() {
  await ensureDirectory(DATABASE_ROOT);

  for (const [manufacturerId, data] of Object.entries(
    BUNDLED_DATABASES,
  )) {
    const directory =
      `${DATABASE_ROOT}${manufacturerId}/`;

    await ensureDirectory(directory);

    await writeJsonAtomically(
      `${directory}bundled.json`,
      data,
    );
  }

  await writeJsonAtomically(
    LOCAL_ROOT_MANIFEST_PATH,
    BUNDLED_ROOT_MANIFEST,
  );
}

async function loadLocalRootManifest() {
  try {
    const manifest = await readJson(
      LOCAL_ROOT_MANIFEST_PATH,
    );
    validateRootManifest(manifest);
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
  manufacturerName,
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
      (Array.isArray(value) ? value : []),
  };
}

function validateRootManifest(manifest) {
  if (
    !manifest ||
    typeof manifest !== 'object' ||
    !manifest.manufacturers ||
    typeof manifest.manufacturers !== 'object' ||
    Array.isArray(manifest.manufacturers)
  ) {
    throw new Error(
      'The root manifest must contain a manufacturers object.',
    );
  }
}

function validateManufacturerManifest(
  manifest,
  expectedManufacturerId,
) {
  if (
    !manifest ||
    typeof manifest !== 'object' ||
    !manifest.manufacturer ||
    !manifest.models ||
    typeof manifest.models !== 'object' ||
    Array.isArray(manifest.models)
  ) {
    throw new Error(
      `The ${expectedManufacturerId} manifest is invalid.`,
    );
  }

  if (
    manifest.manufacturer.id &&
    manifest.manufacturer.id !==
      expectedManufacturerId
  ) {
    throw new Error(
      `Manufacturer ID mismatch in ${expectedManufacturerId}.`,
    );
  }
}

function validateLegacyModelFile(
  modelData,
  manufacturerId,
  modelId,
) {
  if (!Array.isArray(modelData?.records)) {
    throw new Error(
      `Vehicle records are missing from ${manufacturerId}/${modelId}.json.`,
    );
  }
}

function validateNestedModelManifest(
  manifest,
  manufacturerId,
  modelId,
) {
  if (
    !manifest ||
    typeof manifest !== 'object' ||
    !manifest.files ||
    typeof manifest.files !== 'object' ||
    !manifest.files.models
  ) {
    throw new Error(
      `${manufacturerId}/${modelId}/manifest.json is invalid.`,
    );
  }
}

async function fetchJsonNoCache(url) {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  try {
    const separator =
      url.includes('?') ? '&' : '?';

    const response = await fetch(
      `${url}${separator}t=${Date.now()}`,
      {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status} for ${url}.`,
      );
    }

    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function resolveUrl(parentUrl, childPath) {
  if (/^https?:\/\//i.test(childPath || '')) {
    return childPath;
  }

  return new URL(
    String(childPath || '').replace(/^\/+/, ''),
    parentUrl,
  ).toString();
}

async function ensureDirectory(path) {
  const info = await FileSystem.getInfoAsync(path);

  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, {
      intermediates: true,
    });
  }
}

async function fileExists(path) {
  const info = await FileSystem.getInfoAsync(path);
  return info.exists;
}

async function readJson(path) {
  const text = await FileSystem.readAsStringAsync(
    path,
    {
      encoding: FileSystem.EncodingType.UTF8,
    },
  );

  return JSON.parse(text);
}

async function writeTemporaryJson(path, value) {
  await deleteIfExists(path);

  await FileSystem.writeAsStringAsync(
    path,
    JSON.stringify(value, null, 2),
    {
      encoding: FileSystem.EncodingType.UTF8,
    },
  );
}

async function writeJsonAtomically(
  finalPath,
  value,
) {
  const temporaryPath =
    `${finalPath}.writing`;

  await writeTemporaryJson(
    temporaryPath,
    value,
  );

  await replaceFileSafely(
    temporaryPath,
    finalPath,
  );
}

async function replaceFileSafely(
  temporaryPath,
  finalPath,
) {
  const backupPath =
    `${finalPath}.backup`;

  await deleteIfExists(backupPath);

  if (await fileExists(finalPath)) {
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

    await deleteIfExists(backupPath);
  } catch (error) {
    if (await fileExists(backupPath)) {
      await FileSystem.moveAsync({
        from: backupPath,
        to: finalPath,
      });
    }

    throw error;
  }
}

async function deleteIfExists(path) {
  if (await fileExists(path)) {
    await FileSystem.deleteAsync(path, {
      idempotent: true,
    });
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
      (character) => character.toUpperCase(),
    );
}

function validateRemoteUrl() {
  if (
    !REMOTE_MANIFEST_URL ||
    REMOTE_MANIFEST_URL.includes('CHANGE-ME')
  ) {
    throw new Error(
      'Set REMOTE_MANIFEST_URL in config/databaseConfig.js first.',
    );
  }
}
