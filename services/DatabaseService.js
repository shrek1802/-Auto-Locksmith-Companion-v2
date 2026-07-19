import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

import {
  DATABASE_FOLDER_NAME,
  LOCAL_MANIFEST_NAME,
  PACKAGE_DOWNLOAD_RETRIES,
  PACKAGE_DOWNLOAD_TIMEOUT_MS,
  REMOTE_MANIFEST_URL,
  REQUEST_TIMEOUT_MS,
} from '../config/databaseConfig';

const {
  assembleDatabaseFromPackage,
  formatDownloadProgress,
  packageUpdateAvailable,
  performAtomicInstall,
  validateDatabasePackage,
  validatePackageMetadata,
} = require('./databasePackageCore');

const DATABASE_ROOT =
  `${FileSystem.documentDirectory}${DATABASE_FOLDER_NAME}/`;

const LOCAL_ROOT_MANIFEST_PATH =
  `${DATABASE_ROOT}${LOCAL_MANIFEST_NAME}`;

const LOCAL_PACKAGE_PATH =
  `${DATABASE_ROOT}database-package.json`;

const INSTALLATION_MARKER_NAME = 'installation-valid.json';

const LOCAL_INSTALLATION_MARKER_PATH =
  `${DATABASE_ROOT}${INSTALLATION_MARKER_NAME}`;

const INSTALL_ROOT =
  `${FileSystem.documentDirectory}${DATABASE_FOLDER_NAME}_install/`;

const BACKUP_ROOT =
  `${FileSystem.documentDirectory}${DATABASE_FOLDER_NAME}_backup/`;

const EMPTY_ROOT_MANIFEST = {
  schema_version: '2.1',
  updated_at: null,
  database_source: 'remote_only',
  manufacturers: {},
};

export async function initialiseDatabase() {
  await ensureDirectory(DATABASE_ROOT);

  if (!(await fileExists(LOCAL_ROOT_MANIFEST_PATH))) {
    await installEmptyDatabase();
  }

  return loadDatabase();
}

export async function loadDatabase() {
  await ensureDirectory(DATABASE_ROOT);

  let rootManifest;

  try {
    rootManifest = await readJson(
      LOCAL_ROOT_MANIFEST_PATH,
    );
    validateRootManifest(rootManifest);
  } catch (error) {
    console.warn(
      'Local database manifest is invalid. Resetting local database.',
      error,
    );

    await resetToBundledDatabase();
    rootManifest = await readJson(
      LOCAL_ROOT_MANIFEST_PATH,
    );
  }

  const byManufacturer = {};

  if (await fileExists(LOCAL_PACKAGE_PATH)) {
    const packagePayload = await readJson(LOCAL_PACKAGE_PATH);
    const summary = validateDatabasePackage(packagePayload, rootManifest);
    const marker = await loadInstallationMarker();
    if (!installationMarkerMatches(marker, rootManifest, summary)) {
      await writeJsonAtomically(LOCAL_INSTALLATION_MARKER_PATH, createInstallationMarker(rootManifest, summary));
    }
    return assembleDatabaseFromPackage(packagePayload, rootManifest);
  }

  for (const [
    manufacturerId,
    manufacturerEntry,
  ] of Object.entries(
    rootManifest.manufacturers || {},
  )) {
    try {
      const combined =
        await loadLocalManufacturer(
          manufacturerId,
          manufacturerEntry,
        );

      if (combined) {
        byManufacturer[manufacturerId] =
          combined;
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

export async function checkForDatabaseUpdates(forceRepair = false) {
  validateRemoteUrl();

  const remoteRootManifest =
    await fetchJsonNoCache(
      REMOTE_MANIFEST_URL,
    );

  validateRootManifest(remoteRootManifest);
  validatePackageMetadata(remoteRootManifest);

  const localRootManifest =
    await loadLocalRootManifest();

  const installedValid = forceRepair ? false : await validateInstalledPackage(localRootManifest);

  const changed = [];

  if (!packageUpdateAvailable(remoteRootManifest, localRootManifest, installedValid)) {
    return {
      remote: remoteRootManifest,
      local: localRootManifest,
      changed,
    };
  }

  for (const [
    manufacturerId,
    remoteEntry,
  ] of Object.entries(
    remoteRootManifest.manufacturers || {},
  )) {
    const localEntry =
      localRootManifest.manufacturers?.[
        manufacturerId
      ];

    const manufacturerDirectory =
      `${DATABASE_ROOT}${manufacturerId}/`;

    const localManufacturerManifestExists = installedValid;

    const manufacturerChanged =
      !localEntry ||
      localEntry.bundled === true ||
      !localManufacturerManifestExists ||
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

export async function downloadDatabaseUpdates(
  remoteRootManifest,
  changedEntries,
  onProgress = () => {},
) {
  validateRootManifest(remoteRootManifest);
  validatePackageMetadata(remoteRootManifest);

  if (!Array.isArray(changedEntries)) {
    throw new Error(
      'The database update list is invalid.',
    );
  }

  await deleteIfExists(INSTALL_ROOT);
  await ensureDirectory(INSTALL_ROOT);
  const temporaryPackagePath = `${INSTALL_ROOT}database-package.json`;
  const packageUrl = resolveUrl(REMOTE_MANIFEST_URL, remoteRootManifest.package_url);

  try {
    onProgress({ stage: 'Downloading database', ...formatDownloadProgress(0, remoteRootManifest.package_size) });
    await downloadPackageWithRetries(packageUrl, temporaryPackagePath, remoteRootManifest, onProgress);

    onProgress({ stage: 'Verifying download' });
    const packageInfo = await FileSystem.getInfoAsync(temporaryPackagePath);
    if (!packageInfo.exists || Number(packageInfo.size) !== Number(remoteRootManifest.package_size)) {
      throw new Error('The downloaded database package size is incorrect.');
    }
    const packageText = await FileSystem.readAsStringAsync(temporaryPackagePath, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const actualSha256 = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      packageText,
    );
    if (actualSha256.toLowerCase() !== String(remoteRootManifest.package_sha256).toLowerCase()) {
      throw new Error('The downloaded database checksum is invalid.');
    }

    onProgress({ stage: 'Validating database' });
    let packagePayload;
    try {
      packagePayload = JSON.parse(packageText);
    } catch {
      throw new Error('The downloaded database package is not valid JSON.');
    }
    const validatedSummary = validateDatabasePackage(packagePayload, remoteRootManifest);

    onProgress({ stage: 'Installing database' });
    await writeJsonAtomically(
      `${INSTALL_ROOT}${LOCAL_MANIFEST_NAME}`,
      { ...remoteRootManifest, database_source: 'packaged_remote' },
    );
    await writeJsonAtomically(
      `${INSTALL_ROOT}${INSTALLATION_MARKER_NAME}`,
      createInstallationMarker(remoteRootManifest, validatedSummary),
    );
    await installPreparedDatabase();
    onProgress({ stage: 'Update complete', percentage: 100 });

    return {
      updatedBrands: Object.values(remoteRootManifest.manufacturers || {})
        .map((entry) => entry.name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
      summary: packagePayload.counts,
      databaseVersion: remoteRootManifest.database_version,
      packageSize: remoteRootManifest.package_size,
    };
  } catch (error) {
    await deleteIfExists(INSTALL_ROOT);
    throw error;
  }
}

/*
 * Kept under the existing exported name so the current DatabaseContext and
 * Settings screen do not need changing. It now removes all local data and
 * restores an empty remote-only database rather than a bundled Ford record.
 */
export async function resetToBundledDatabase() {
  await deleteIfExists(INSTALL_ROOT);
  await deleteIfExists(BACKUP_ROOT);
  if (await fileExists(DATABASE_ROOT)) {
    await FileSystem.deleteAsync(
      DATABASE_ROOT,
      {
        idempotent: true,
      },
    );
  }

  await installEmptyDatabase();
  return loadDatabase();
}

async function downloadPackageWithRetries(
  url,
  destination,
  manifest,
  onProgress,
) {
  let lastError;

  for (let attempt = 1; attempt <= PACKAGE_DOWNLOAD_RETRIES; attempt += 1) {
    await deleteIfExists(destination);
    const resumable = FileSystem.createDownloadResumable(
      `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`,
      destination,
      { headers: { 'Cache-Control': 'no-cache, no-store' } },
      ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
        onProgress({
          stage: 'Downloading database',
          attempt,
          ...formatDownloadProgress(
            totalBytesWritten,
            totalBytesExpectedToWrite > 0
              ? totalBytesExpectedToWrite
              : manifest.package_size,
          ),
        });
      },
    );

    let timer;
    try {
      const result = await Promise.race([
        resumable.downloadAsync(),
        new Promise((_, reject) => {
          timer = setTimeout(async () => {
            try { await resumable.pauseAsync(); } catch {}
            reject(new Error('The database package download timed out.'));
          }, PACKAGE_DOWNLOAD_TIMEOUT_MS);
        }),
      ]);
      if (!result?.uri || (result.status && result.status >= 400)) {
        throw new Error(`Database package download failed with status ${result?.status || 'unknown'}.`);
      }
      clearTimeout(timer);
      return result;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (attempt < PACKAGE_DOWNLOAD_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  throw new Error(
    `${lastError?.message || 'The database package download failed.'} Retry the update when your connection is stable.`,
  );
}

async function installPreparedDatabase() {
  try {
    await performAtomicInstall({
      removeBackup: () => deleteIfExists(BACKUP_ROOT),
      activeExists: () => fileExists(DATABASE_ROOT),
      moveActiveToBackup: () => FileSystem.moveAsync({ from: DATABASE_ROOT, to: BACKUP_ROOT }),
      movePreparedToActive: () => FileSystem.moveAsync({ from: INSTALL_ROOT, to: DATABASE_ROOT }),
      removeActive: () => deleteIfExists(DATABASE_ROOT),
      backupExists: () => fileExists(BACKUP_ROOT),
      restoreBackup: () => FileSystem.moveAsync({ from: BACKUP_ROOT, to: DATABASE_ROOT }),
      preserveBackup: true,
    });
  } catch (error) {
    throw new Error(`Database installation was rolled back: ${error?.message || error}`);
  }
}

async function loadInstallationMarker() {
  try {
    return await readJson(LOCAL_INSTALLATION_MARKER_PATH);
  } catch {
    return null;
  }
}

function createInstallationMarker(manifest, summary) {
  return {
    schema_version: '1.0',
    database_version: manifest.database_version,
    package_sha256: manifest.package_sha256,
    counts: summary,
    validated_at: new Date().toISOString(),
  };
}

function installationMarkerMatches(marker, manifest, summary) {
  return Boolean(
    marker &&
    marker.database_version === manifest.database_version &&
    marker.package_sha256 === manifest.package_sha256 &&
    ['manufacturers', 'models', 'vehicle_records'].every(
      (field) => Number(marker.counts?.[field]) === Number(summary[field]),
    )
  );
}

async function validateInstalledPackage(localManifest) {
  if (!(await fileExists(LOCAL_PACKAGE_PATH))) return false;
  try {
    const payload = await readJson(LOCAL_PACKAGE_PATH);
    const summary = validateDatabasePackage(payload, localManifest);
    const marker = await loadInstallationMarker();
    return installationMarkerMatches(marker, localManifest, summary);
  } catch {
    return false;
  }
}

async function updateManufacturer(
  manufacturerId,
  remoteManufacturerEntry,
) {
  const manufacturerDirectory =
    `${DATABASE_ROOT}${manufacturerId}/`;

  await ensureDirectory(
    manufacturerDirectory,
  );

  const remoteManifestReference =
    remoteManufacturerEntry.manifest ||
    remoteManufacturerEntry.file;

  if (!remoteManifestReference) {
    throw new Error(
      `No manufacturer manifest supplied for ${manufacturerId}.`,
    );
  }

  const remoteManufacturerManifestUrl =
    resolveUrl(
      REMOTE_MANIFEST_URL,
      remoteManifestReference,
    );

  const remoteManufacturerManifest =
    await fetchJsonNoCache(
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

  if (
    await fileExists(
      localManufacturerManifestPath,
    )
  ) {
    try {
      localManufacturerManifest =
        await readJson(
          localManufacturerManifestPath,
        );
    } catch {
      // Download every model if the saved manufacturer manifest is invalid.
    }
  }

  const preparedFiles = [];

  for (const [
    modelId,
    remoteModelEntry,
  ] of Object.entries(
    remoteManufacturerManifest.models || {},
  )) {
    const localModelEntry =
      localManufacturerManifest.models?.[
        modelId
      ];

    const nestedManifestPath =
      `${manufacturerDirectory}${modelId}/manifest.json`;

    const flatModelPath =
      `${manufacturerDirectory}${modelId}.json`;

    const localModelFilesExist =
      remoteModelEntry.manifest
        ? await fileExists(
            nestedManifestPath,
          )
        : await fileExists(flatModelPath);

    const modelChanged =
      !localModelEntry ||
      !localModelFilesExist ||
      String(localModelEntry.version ?? '') !==
        String(remoteModelEntry.version ?? '') ||
      (
        remoteModelEntry.sha256 &&
        remoteModelEntry.sha256 !==
          localModelEntry.sha256
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
          prepared.finalPath.lastIndexOf(
            '/',
          ) + 1,
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
      await deleteIfExists(
        prepared.temporaryPath,
      );
    }

    throw error;
  }

  return {
    manufacturerName:
      remoteManufacturerManifest
        .manufacturer?.name ||
      remoteManufacturerEntry.name ||
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

  const modelData =
    await fetchJsonNoCache(
      remoteModelUrl,
    );

  validateLegacyModelFile(
    modelData,
    manufacturerId,
    modelId,
  );

  const temporaryPath =
    `${manufacturerDirectory}.${modelId}.download.json`;

  await writeTemporaryJson(
    temporaryPath,
    modelData,
  );

  preparedFiles.push({
    temporaryPath,
    finalPath:
      `${manufacturerDirectory}${modelId}.json`,
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
  const remoteModelManifestUrl =
    resolveUrl(
      remoteManufacturerManifestUrl,
      remoteModelEntry.manifest,
    );

  const modelManifest =
    await fetchJsonNoCache(
      remoteModelManifestUrl,
    );

  validateNestedModelManifest(
    modelManifest,
    manufacturerId,
    modelId,
  );

  const modelDirectory =
    `${manufacturerDirectory}${modelId}/`;

  const temporaryManifestPath =
    `${manufacturerDirectory}.${modelId}.manifest.download.json`;

  await writeTemporaryJson(
    temporaryManifestPath,
    modelManifest,
  );

  preparedFiles.push({
    temporaryPath:
      temporaryManifestPath,
    finalPath:
      `${modelDirectory}manifest.json`,
  });

  for (const [
    componentId,
    componentReference,
  ] of Object.entries(
    modelManifest.files || {},
  )) {
    const relativeFile =
      typeof componentReference ===
      'string'
        ? componentReference
        : componentReference?.file;

    if (!relativeFile) {
      throw new Error(
        `Missing file path for ${manufacturerId}/${modelId}/${componentId}.`,
      );
    }

    const componentData =
      await fetchJsonNoCache(
        resolveUrl(
          remoteModelManifestUrl,
          relativeFile,
        ),
      );

    if (
      !componentData ||
      typeof componentData !== 'object'
    ) {
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
        `${modelDirectory}${getFileName(
          relativeFile,
        )}`,
    });
  }
}

async function loadLocalManufacturer(
  manufacturerId,
  rootEntry,
) {
  const manufacturerDirectory =
    `${DATABASE_ROOT}${manufacturerId}/`;

  const manifestPath =
    `${manufacturerDirectory}manifest.json`;

  if (!(await fileExists(manifestPath))) {
    return null;
  }

  const manufacturerManifest =
    await readJson(manifestPath);

  validateManufacturerManifest(
    manufacturerManifest,
    manufacturerId,
  );

  const records = [];

  for (const [
    modelId,
    modelEntry,
  ] of Object.entries(
    manufacturerManifest.models || {},
  )) {
    try {
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
    } catch (error) {
      console.warn(
        `Could not load ${manufacturerId}/${modelId}:`,
        error?.message || error,
      );
    }
  }

  return {
    schema_version:
      manufacturerManifest
        .schema_version || '2.1',
    manufacturer: {
      id: manufacturerId,
      name:
        manufacturerManifest
          .manufacturer?.name ||
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

  for (const [
    componentId,
    componentReference,
  ] of Object.entries(
    modelManifest.files || {},
  )) {
    const relativeFile =
      typeof componentReference ===
      'string'
        ? componentReference
        : componentReference?.file;

    components[componentId] =
      await readJson(
        `${modelDirectory}${getFileName(
          relativeFile,
        )}`,
      );
  }

  return composeNestedModelRecords(
    manufacturerId,
    modelId,
    components,
  );
}

function composeNestedModelRecords(
  manufacturerId,
  modelId,
  components,
) {
  const modelsComponent =
    components.models ||
    components.vehicles ||
    {};

  if (
    Array.isArray(
      modelsComponent.records,
    )
  ) {
    return modelsComponent.records.map(
      (record) =>
        attachNestedSections(
          record,
          components,
        ),
    );
  }

  const modelItems =
    modelsComponent.items || {};

  return Object.entries(modelItems).map(
    ([variantId, definition]) => {
      const vehicle =
        definition.vehicle ||
        definition;

      const baseRecord = {
        ...definition,
        record_id:
          definition.record_id ||
          `${manufacturerId}_${modelId}_${variantId}`,
        vehicle: {
          ...vehicle,
          manufacturer_id:
            vehicle.manufacturer_id ||
            manufacturerId,
          model_id:
            vehicle.model_id ||
            modelId,
          market:
            vehicle.market || 'UK',
          drive_side:
            vehicle.drive_side || 'RHD',
        },
      };

      return attachNestedSections(
        baseRecord,
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
  const result = {
    ...record,
  };

  for (const [
    componentId,
    componentData,
  ] of Object.entries(components)) {
    if (
      componentId === 'models' ||
      componentId === 'vehicles'
    ) {
      continue;
    }

    const section =
      selectComponentSection(
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
  if (
    !componentData ||
    typeof componentData !== 'object'
  ) {
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
    return componentData.items[
      variantId
    ];
  }

  if (
    recordId &&
    componentData.items &&
    Object.prototype.hasOwnProperty.call(
      componentData.items,
      recordId,
    )
  ) {
    return componentData.items[
      recordId
    ];
  }

  if (
    componentData.shared !== undefined
  ) {
    return componentData.shared;
  }

  return (
    componentData.items ||
    componentData
  );
}

async function installEmptyDatabase() {
  await ensureDirectory(DATABASE_ROOT);

  await writeJsonAtomically(
    LOCAL_ROOT_MANIFEST_PATH,
    EMPTY_ROOT_MANIFEST,
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
      ...EMPTY_ROOT_MANIFEST,
      manufacturers: {},
    };
  }
}

function validateRootManifest(
  manifest,
) {
  if (
    !manifest ||
    typeof manifest !== 'object' ||
    !manifest.manufacturers ||
    typeof manifest.manufacturers !==
      'object' ||
    Array.isArray(
      manifest.manufacturers,
    )
  ) {
    throw new Error(
      'The root manifest must contain a manufacturers object.',
    );
  }
}

function validateManufacturerManifest(
  manifest,
  manufacturerId,
) {
  if (
    !manifest ||
    typeof manifest !== 'object' ||
    !manifest.manufacturer ||
    !manifest.models ||
    typeof manifest.models !==
      'object' ||
    Array.isArray(manifest.models)
  ) {
    throw new Error(
      `The ${manufacturerId} manifest is invalid.`,
    );
  }

  if (
    manifest.manufacturer.id &&
    manifest.manufacturer.id !==
      manufacturerId
  ) {
    throw new Error(
      `Manufacturer ID mismatch in ${manufacturerId}.`,
    );
  }
}

function validateLegacyModelFile(
  data,
  manufacturerId,
  modelId,
) {
  if (!Array.isArray(data?.records)) {
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

async function fetchJsonNoCache(
  url,
) {
  const controller =
    new AbortController();

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
          'Cache-Control':
            'no-cache, no-store',
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status} for ${url}.`,
      );
    }

    return response.json();
  } catch (error) {
    if (
      error?.name === 'AbortError'
    ) {
      throw new Error(
        'The database download timed out.',
      );
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function resolveUrl(
  parentUrl,
  childPath,
) {
  if (
    /^https?:\/\//i.test(
      childPath || '',
    )
  ) {
    return childPath;
  }

  return new URL(
    String(childPath || '').replace(
      /^\/+/,
      '',
    ),
    parentUrl,
  ).toString();
}

async function ensureDirectory(path) {
  const info =
    await FileSystem.getInfoAsync(path);

  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(
      path,
      {
        intermediates: true,
      },
    );
  }
}

async function fileExists(path) {
  const info =
    await FileSystem.getInfoAsync(path);

  return info.exists;
}

async function readJson(path) {
  const text =
    await FileSystem.readAsStringAsync(
      path,
      {
        encoding:
          FileSystem.EncodingType.UTF8,
      },
    );

  return JSON.parse(text);
}

async function writeTemporaryJson(
  path,
  value,
) {
  await deleteIfExists(path);

  await FileSystem.writeAsStringAsync(
    path,
    JSON.stringify(
      value,
      null,
      2,
    ),
    {
      encoding:
        FileSystem.EncodingType.UTF8,
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
  if (await fileExists(path)) {
    await FileSystem.deleteAsync(
      path,
      {
        idempotent: true,
      },
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
        character.toUpperCase(),
    );
}

function validateRemoteUrl() {
  if (
    !REMOTE_MANIFEST_URL ||
    REMOTE_MANIFEST_URL.includes(
      'CHANGE-ME',
    )
  ) {
    throw new Error(
      'Set REMOTE_MANIFEST_URL in config/databaseConfig.js first.',
    );
  }
}
