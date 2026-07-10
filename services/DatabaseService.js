import * as FileSystem from 'expo-file-system';

import {
  BUNDLED_DATABASES,
  BUNDLED_MANIFEST,
  DATABASE_DIRECTORY_NAME,
  LOCAL_MANIFEST_FILE_NAME,
  REMOTE_MANIFEST_URL,
} from '../config/databaseConfig';

const DATABASE_DIRECTORY =
  `${FileSystem.documentDirectory}${DATABASE_DIRECTORY_NAME}/`;

const LOCAL_MANIFEST_PATH =
  `${DATABASE_DIRECTORY}${LOCAL_MANIFEST_FILE_NAME}`;

export async function initialiseDatabase() {
  await ensureDatabaseDirectory();

  const localManifestExists = await fileExists(LOCAL_MANIFEST_PATH);

  if (!localManifestExists) {
    await installBundledDatabase();
  }

  return loadDatabase();
}

export async function loadDatabase() {
  await ensureDatabaseDirectory();

  let manifest;

  try {
    manifest = await readJsonFile(LOCAL_MANIFEST_PATH);
  } catch (error) {
    console.error('Local manifest could not be read:', error);

    await installBundledDatabase();
    manifest = await readJsonFile(LOCAL_MANIFEST_PATH);
  }

  const byManufacturer = {};

  const manufacturers = manifest?.manufacturers || {};

  for (const [manufacturerId, manufacturerEntry] of Object.entries(
    manufacturers
  )) {
    const localFileName =
      manufacturerEntry.local_file ||
      manufacturerEntry.file ||
      `${manufacturerId}.json`;

    const localPath = `${DATABASE_DIRECTORY}${getFileName(localFileName)}`;

    try {
      const manufacturerData = await readJsonFile(localPath);

      validateManufacturerDatabase(
        manufacturerData,
        manufacturerId
      );

      byManufacturer[manufacturerId] = manufacturerData;
    } catch (error) {
      console.error(
        `Failed to load manufacturer database: ${manufacturerId}`,
        error
      );
    }
  }

  return {
    manifest,
    byManufacturer,
  };
}

export async function checkForDatabaseUpdates() {
  if (
    !REMOTE_MANIFEST_URL ||
    REMOTE_MANIFEST_URL.includes('YOUR-NAME') ||
    REMOTE_MANIFEST_URL.includes('YOUR-DATA-REPO')
  ) {
    throw new Error(
      'The remote database manifest URL has not been configured.'
    );
  }

  const remoteManifest = await fetchJson(REMOTE_MANIFEST_URL);

  validateManifest(remoteManifest);

  let localManifest;

  try {
    localManifest = await readJsonFile(LOCAL_MANIFEST_PATH);
  } catch {
    localManifest = {
      schema_version: remoteManifest.schema_version,
      manufacturers: {},
    };
  }

  const changed = [];

  for (const [manufacturerId, remoteEntry] of Object.entries(
    remoteManifest.manufacturers || {}
  )) {
    const localEntry =
      localManifest?.manufacturers?.[manufacturerId];

    const remoteVersion =
      remoteEntry.version ?? null;

    const localVersion =
      localEntry?.version ?? null;

    const remoteHash =
      remoteEntry.sha256 || remoteEntry.hash || '';

    const localHash =
      localEntry?.sha256 || localEntry?.hash || '';

    const versionChanged =
      remoteVersion !== null &&
      remoteVersion !== localVersion;

    const hashChanged =
      Boolean(remoteHash) &&
      remoteHash !== localHash;

    const missingLocally =
      !localEntry;

    if (
      missingLocally ||
      versionChanged ||
      hashChanged
    ) {
      changed.push(manufacturerId);
    }
  }

  return {
    remote: remoteManifest,
    local: localManifest,
    changed,
  };
}

export async function downloadDatabaseUpdates(
  remoteManifest,
  changedManufacturerIds
) {
  await ensureDatabaseDirectory();

  validateManifest(remoteManifest);

  if (!Array.isArray(changedManufacturerIds)) {
    throw new Error(
      'Changed manufacturer list is invalid.'
    );
  }

  const currentManifest = await getSafeLocalManifest();

  const nextManifest = {
    ...currentManifest,
    schema_version:
      remoteManifest.schema_version ||
      currentManifest.schema_version ||
      '2.0',
    updated_at:
      remoteManifest.updated_at ||
      new Date().toISOString(),
    manufacturers: {
      ...(currentManifest.manufacturers || {}),
    },
  };

  const preparedFiles = [];
  const updatedBrands = [];

  try {
    for (const manufacturerId of changedManufacturerIds) {
      const remoteEntry =
        remoteManifest.manufacturers?.[manufacturerId];

      if (!remoteEntry) {
        throw new Error(
          `Remote manifest entry missing for ${manufacturerId}.`
        );
      }

      const remoteFileUrl =
        remoteEntry.url ||
        resolveRemoteFileUrl(
          REMOTE_MANIFEST_URL,
          remoteEntry.file
        );

      if (!remoteFileUrl) {
        throw new Error(
          `No download URL was supplied for ${manufacturerId}.`
        );
      }

      const tempPath =
        `${DATABASE_DIRECTORY}${manufacturerId}.download.tmp`;

      const finalFileName =
        getFileName(
          remoteEntry.local_file ||
          remoteEntry.file ||
          `${manufacturerId}.json`
        );

      const finalPath =
        `${DATABASE_DIRECTORY}${finalFileName}`;

      await deleteFileIfExists(tempPath);

      const downloadResult =
        await FileSystem.downloadAsync(
          remoteFileUrl,
          tempPath
        );

      if (
        downloadResult.status < 200 ||
        downloadResult.status >= 300
      ) {
        throw new Error(
          `Download failed for ${manufacturerId} with status ${downloadResult.status}.`
        );
      }

      const downloadedData =
        await readJsonFile(tempPath);

      validateManufacturerDatabase(
        downloadedData,
        manufacturerId
      );

      preparedFiles.push({
        manufacturerId,
        tempPath,
        finalPath,
        finalFileName,
        remoteEntry,
        displayName:
          downloadedData?.manufacturer?.name ||
          remoteEntry.name ||
          formatManufacturerName(manufacturerId),
      });
    }

    for (const preparedFile of preparedFiles) {
      const backupPath =
        `${preparedFile.finalPath}.backup`;

      await deleteFileIfExists(backupPath);

      if (await fileExists(preparedFile.finalPath)) {
        await FileSystem.moveAsync({
          from: preparedFile.finalPath,
          to: backupPath,
        });
      }

      try {
        await FileSystem.moveAsync({
          from: preparedFile.tempPath,
          to: preparedFile.finalPath,
        });

        await deleteFileIfExists(backupPath);
      } catch (error) {
        if (await fileExists(backupPath)) {
          await FileSystem.moveAsync({
            from: backupPath,
            to: preparedFile.finalPath,
          });
        }

        throw error;
      }

      nextManifest.manufacturers[
        preparedFile.manufacturerId
      ] = {
        ...preparedFile.remoteEntry,
        local_file: preparedFile.finalFileName,
      };

      updatedBrands.push(
        preparedFile.displayName
      );
    }

    await writeJsonFileAtomically(
      LOCAL_MANIFEST_PATH,
      nextManifest
    );

    return updatedBrands.sort((a, b) =>
      a.localeCompare(b)
    );
  } catch (error) {
    for (const preparedFile of preparedFiles) {
      await deleteFileIfExists(
        preparedFile.tempPath
      );
    }

    throw error;
  }
}

export async function resetToBundledDatabase() {
  await deleteDirectoryIfExists(
    DATABASE_DIRECTORY
  );

  await ensureDatabaseDirectory();
  await installBundledDatabase();

  return loadDatabase();
}

async function installBundledDatabase() {
  await ensureDatabaseDirectory();

  const bundledManifest = {
    ...BUNDLED_MANIFEST,
    manufacturers: {
      ...(BUNDLED_MANIFEST.manufacturers || {}),
    },
  };

  for (const [
    manufacturerId,
    manufacturerData,
  ] of Object.entries(BUNDLED_DATABASES)) {
    validateManufacturerDatabase(
      manufacturerData,
      manufacturerId
    );

    const manifestEntry =
      bundledManifest.manufacturers[
        manufacturerId
      ] || {};

    const localFileName =
      getFileName(
        manifestEntry.local_file ||
        manifestEntry.file ||
        `${manufacturerId}.json`
      );

    const localPath =
      `${DATABASE_DIRECTORY}${localFileName}`;

    await writeJsonFileAtomically(
      localPath,
      manufacturerData
    );

    bundledManifest.manufacturers[
      manufacturerId
    ] = {
      ...manifestEntry,
      name:
        manifestEntry.name ||
        manufacturerData?.manufacturer?.name ||
        formatManufacturerName(
          manufacturerId
        ),
      local_file: localFileName,
    };
  }

  await writeJsonFileAtomically(
    LOCAL_MANIFEST_PATH,
    bundledManifest
  );
}

async function getSafeLocalManifest() {
  try {
    return await readJsonFile(
      LOCAL_MANIFEST_PATH
    );
  } catch {
    return {
      schema_version: '2.0',
      updated_at: null,
      manufacturers: {},
    };
  }
}

async function ensureDatabaseDirectory() {
  const info =
    await FileSystem.getInfoAsync(
      DATABASE_DIRECTORY
    );

  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(
      DATABASE_DIRECTORY,
      {
        intermediates: true,
      }
    );
  }
}

async function fileExists(path) {
  const info =
    await FileSystem.getInfoAsync(path);

  return info.exists;
}

async function deleteFileIfExists(path) {
  const exists = await fileExists(path);

  if (exists) {
    await FileSystem.deleteAsync(path, {
      idempotent: true,
    });
  }
}

async function deleteDirectoryIfExists(path) {
  const info =
    await FileSystem.getInfoAsync(path);

  if (info.exists) {
    await FileSystem.deleteAsync(path, {
      idempotent: true,
    });
  }
}

async function readJsonFile(path) {
  const contents =
    await FileSystem.readAsStringAsync(
      path,
      {
        encoding:
          FileSystem.EncodingType.UTF8,
      }
    );

  return JSON.parse(contents);
}

async function writeJsonFileAtomically(
  destinationPath,
  value
) {
  const tempPath =
    `${destinationPath}.writing`;

  await deleteFileIfExists(tempPath);

  await FileSystem.writeAsStringAsync(
    tempPath,
    JSON.stringify(value, null, 2),
    {
      encoding:
        FileSystem.EncodingType.UTF8,
    }
  );

  await deleteFileIfExists(
    destinationPath
  );

  await FileSystem.moveAsync({
    from: tempPath,
    to: destinationPath,
  });
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Unable to download database manifest (${response.status}).`
    );
  }

  return response.json();
}

function validateManifest(manifest) {
  if (
    !manifest ||
    typeof manifest !== 'object'
  ) {
    throw new Error(
      'The remote database manifest is invalid.'
    );
  }

  if (
    !manifest.manufacturers ||
    typeof manifest.manufacturers !==
      'object'
  ) {
    throw new Error(
      'The remote database manifest does not contain manufacturers.'
    );
  }
}

function validateManufacturerDatabase(
  database,
  expectedManufacturerId
) {
  if (
    !database ||
    typeof database !== 'object'
  ) {
    throw new Error(
      `Invalid database file for ${expectedManufacturerId}.`
    );
  }

  if (
    !database.manufacturer ||
    typeof database.manufacturer !==
      'object'
  ) {
    throw new Error(
      `Manufacturer information is missing from ${expectedManufacturerId}.`
    );
  }

  if (!Array.isArray(database.records)) {
    throw new Error(
      `Vehicle records are missing from ${expectedManufacturerId}.`
    );
  }

  for (const record of database.records) {
    if (
      !record ||
      typeof record !== 'object'
    ) {
      throw new Error(
        `An invalid vehicle record was found in ${expectedManufacturerId}.`
      );
    }

    if (
      !record.vehicle ||
      typeof record.vehicle !== 'object'
    ) {
      throw new Error(
        `A vehicle record in ${expectedManufacturerId} is missing vehicle information.`
      );
    }

    const market =
      record.vehicle.market;

    const driveSide =
      record.vehicle.drive_side;

    if (
      market &&
      market !== 'UK'
    ) {
      throw new Error(
        `A non-UK record was found in ${expectedManufacturerId}.`
      );
    }

    if (
      driveSide &&
      driveSide !== 'RHD'
    ) {
      throw new Error(
        `A non-RHD record was found in ${expectedManufacturerId}.`
      );
    }
  }

  return true;
}

function resolveRemoteFileUrl(
  manifestUrl,
  fileValue
) {
  if (!fileValue) {
    return '';
  }

  if (
    /^https?:\/\//i.test(fileValue)
  ) {
    return fileValue;
  }

  const lastSlash =
    manifestUrl.lastIndexOf('/');

  if (lastSlash === -1) {
    return '';
  }

  const baseUrl =
    manifestUrl.slice(0, lastSlash + 1);

  return `${baseUrl}${fileValue.replace(
    /^\/+/,
    ''
  )}`;
}

function getFileName(value) {
  return String(value || '')
    .split('/')
    .pop();
}

function formatManufacturerName(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}
