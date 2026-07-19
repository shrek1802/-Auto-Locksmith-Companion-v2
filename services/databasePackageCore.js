const REQUIRED_KEY_FIELDS = [
  'blade_profile',
  'transponder_id',
  'technology_family',
  'chip_type',
  'chip_ic',
  'remote_configuration',
  'frequency',
];

const REQUIRED_CATALOGUES = [
  'database/reference/uk_blade_catalogue.json',
  'database/reference/uk_transponder_catalogue.json',
  'database/reference/uk_chip_catalogue.json',
  'database/reference/key_profile_schema.json',
];

function validatePackageMetadata(manifest) {
  if (!manifest?.package_url || !manifest?.package_sha256 || !manifest?.package_size) {
    throw new Error('This database version does not provide a packaged update.');
  }
  if (manifest.package_format !== 'indexed_json') {
    throw new Error(`Unsupported database package format: ${manifest.package_format || 'missing'}.`);
  }
  return true;
}

function validateDatabasePackage(payload, manifest) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('The downloaded database package is invalid.');
  }
  if (!payload.files || typeof payload.files !== 'object' || Array.isArray(payload.files)) {
    throw new Error('The database package file index is missing.');
  }
  if (String(payload.database_version) !== String(manifest.database_version)) {
    throw new Error('The database package version does not match its manifest.');
  }
  for (const path of REQUIRED_CATALOGUES) {
    if (!payload.files[path]) throw new Error(`Required packaged file is missing: ${path}`);
  }
  const counts = payload.counts || {};
  const expected = manifest.package_counts || {};
  for (const field of ['manufacturers', 'models', 'vehicle_records']) {
    if (!Number.isInteger(counts[field]) || counts[field] < 1) {
      throw new Error(`Invalid packaged ${field} count.`);
    }
    if (expected[field] !== undefined && Number(expected[field]) !== counts[field]) {
      throw new Error(`Packaged ${field} count does not match the manifest.`);
    }
  }
  const contract = payload.files['database/reference/key_profile_schema.json'];
  const order = contract?.display_order || [];
  if (REQUIRED_KEY_FIELDS.some((field, index) => order[index] !== field)) {
    throw new Error('The packaged key-profile display contract is invalid.');
  }
  let representative = null;
  for (const [path, data] of Object.entries(payload.files)) {
    if (!path.endsWith('/models.json')) continue;
    const records = [
      ...Object.values(data?.items || {}),
      ...(data?.records || []),
      ...(data?.generations || []),
    ];
    representative = records.find((record) => {
      const info = record?.vehicle_information || record;
      return REQUIRED_KEY_FIELDS.every((field) => Object.prototype.hasOwnProperty.call(info || {}, field));
    });
    if (representative) break;
  }
  if (!representative) {
    throw new Error('No structured seven-field key profile was found in the package.');
  }
  return true;
}

function packageUpdateAvailable(remote, local) {
  return String(remote?.database_version || '') !== String(local?.database_version || '');
}

function formatDownloadProgress(written, total) {
  const safeWritten = Math.max(0, Number(written) || 0);
  const safeTotal = Math.max(0, Number(total) || 0);
  return {
    downloadedBytes: safeWritten,
    totalBytes: safeTotal,
    percentage: safeTotal ? Math.min(100, Math.round((safeWritten / safeTotal) * 100)) : 0,
  };
}

async function performAtomicInstall(adapter) {
  await adapter.removeBackup();
  const activeExists = await adapter.activeExists();
  if (activeExists) await adapter.moveActiveToBackup();
  try {
    await adapter.movePreparedToActive();
    await adapter.removeBackup();
  } catch (error) {
    await adapter.removeActive();
    if (activeExists && await adapter.backupExists()) {
      await adapter.restoreBackup();
    }
    throw error;
  }
}

module.exports = {
  REQUIRED_KEY_FIELDS,
  formatDownloadProgress,
  packageUpdateAvailable,
  performAtomicInstall,
  validateDatabasePackage,
  validatePackageMetadata,
};
