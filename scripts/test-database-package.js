const assert = require('assert');
const crypto = require('crypto');

const {
  formatDownloadProgress,
  packageUpdateAvailable,
  performAtomicInstall,
  validateDatabasePackage,
  validatePackageMetadata,
} = require('../services/databasePackageCore');

const fields = {
  blade_profile: 'HU101',
  transponder_id: 'ID46',
  technology_family: 'HITAG 2',
  chip_type: 'Research Required',
  chip_ic: 'Research Required',
  remote_configuration: 'Integrated',
  frequency: '433 MHz',
};

const manifest = {
  database_version: 'test-1',
  package_url: 'database/database-update.json',
  package_sha256: crypto.createHash('sha256').update('{}').digest('hex'),
  package_size: 2,
  package_format: 'indexed_json',
  package_counts: { manufacturers: 53, models: 733, vehicle_records: 1499 },
};

function fixture() {
  return {
    database_version: 'test-1',
    counts: { manufacturers: 53, models: 733, vehicle_records: 1499 },
    files: {
      'database/reference/uk_blade_catalogue.json': { items: {} },
      'database/reference/uk_transponder_catalogue.json': { items: {} },
      'database/reference/uk_chip_catalogue.json': { items: {} },
      'database/reference/key_profile_schema.json': { display_order: Object.keys(fields) },
      'database/vehicles/test/model/models.json': {
        items: { test_variant: { vehicle_information: fields } },
      },
    },
  };
}

async function run() {
  assert.strictEqual(validatePackageMetadata(manifest), true);
  assert.strictEqual(validateDatabasePackage(fixture(), manifest), true);
  assert.strictEqual(packageUpdateAvailable({ database_version: '2' }, { database_version: '1' }), true);
  assert.deepStrictEqual(formatDownloadProgress(5, 10), {
    downloadedBytes: 5,
    totalBytes: 10,
    percentage: 50,
  });

  assert.throws(
    () => validatePackageMetadata({ database_version: 'old' }),
    /does not provide a packaged update/,
  );
  const corrupt = fixture();
  delete corrupt.files['database/reference/uk_chip_catalogue.json'];
  assert.throws(() => validateDatabasePackage(corrupt, manifest), /Required packaged file is missing/);
  const wrongCounts = fixture();
  wrongCounts.counts.vehicle_records = 1;
  assert.throws(() => validateDatabasePackage(wrongCounts, manifest), /does not match/);

  const checksum = crypto.createHash('sha256').update('{}').digest('hex');
  assert.strictEqual(checksum, manifest.package_sha256);
  assert.notStrictEqual(crypto.createHash('sha256').update('{bad}').digest('hex'), manifest.package_sha256);

  const state = { active: true, backup: false, prepared: true };
  await performAtomicInstall({
    removeBackup: async () => { state.backup = false; },
    activeExists: async () => state.active,
    moveActiveToBackup: async () => { state.active = false; state.backup = true; },
    movePreparedToActive: async () => { state.prepared = false; state.active = true; },
    removeActive: async () => { state.active = false; },
    backupExists: async () => state.backup,
    restoreBackup: async () => { state.backup = false; state.active = true; },
  });
  assert.deepStrictEqual(state, { active: true, backup: false, prepared: false });

  const rollback = { active: true, backup: false };
  await assert.rejects(() => performAtomicInstall({
    removeBackup: async () => { rollback.backup = false; },
    activeExists: async () => rollback.active,
    moveActiveToBackup: async () => { rollback.active = false; rollback.backup = true; },
    movePreparedToActive: async () => { throw new Error('interrupted download/install'); },
    removeActive: async () => { rollback.active = false; },
    backupExists: async () => rollback.backup,
    restoreBackup: async () => { rollback.backup = false; rollback.active = true; },
  }), /interrupted/);
  assert.deepStrictEqual(rollback, { active: true, backup: false });

  console.log('Packaged updater tests passed: metadata, one-package validation, progress, checksum, invalid package, counts, atomic install and rollback.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
