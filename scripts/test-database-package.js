const assert = require('assert');
const crypto = require('crypto');

const {
  assembleDatabaseFromPackage,
  formatDownloadProgress,
  normalizePackagePath,
  packageUpdateAvailable,
  performAtomicInstall,
  validateDatabasePackage,
  validatePackageMetadata,
} = require('../services/databasePackageCore');
const { selectLogoSource } = require('../services/brandLogoCore');

const fields = {
  blade_profile: 'HU101', transponder_id: 'ID46', technology_family: 'HITAG 2',
  chip_type: 'Research Required', chip_ic: 'Research Required',
  remote_configuration: 'Integrated', frequency: '433 MHz',
};

function fullFixture() {
  const ids = ['ford', 'dacia', 'cupra', ...Array.from({ length: 50 }, (_, i) => `maker_${i + 1}`)];
  const manifest = {
    database_version: 'test-repair-1', package_url: 'database/database-update.json',
    package_sha256: crypto.createHash('sha256').update('{}').digest('hex'), package_size: 2,
    package_format: 'indexed_json', package_counts: { manufacturers: 53, models: 733, vehicle_records: 1499 },
    manufacturers: {},
  };
  const payload = {
    database_version: manifest.database_version,
    counts: { ...manifest.package_counts, json_files: 1500 },
    assets: { 'database/assets/manufacturer_logos/dacia.svg': '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>' },
    files: {
      'database/reference/uk_blade_catalogue.json': { items: {} },
      'database/reference/uk_transponder_catalogue.json': { items: {} },
      'database/reference/uk_chip_catalogue.json': { items: {} },
      'database/reference/key_profile_schema.json': { display_order: Object.keys(fields) },
    },
  };
  const manufacturerModels = Object.fromEntries(ids.map((id) => [id, {}]));
  for (let index = 0; index < 733; index += 1) {
    const manufacturerId = ids[index % ids.length];
    const modelId = `model_${index + 1}`;
    const manifestPath = `database/vehicles/${manufacturerId}/${modelId}/manifest.json`;
    const modelsPath = `database/vehicles/${manufacturerId}/${modelId}/models.json`;
    const recordTotal = index < 33 ? 3 : 2;
    const definitions = Array.from({ length: recordTotal }, (_, variant) => ({
      id: `${modelId}_${variant + 1}`, name: `${modelId} generation ${variant + 1}`,
      years: '2020-present', ...fields,
    }));
    const modelsData = manufacturerId === 'ford'
      ? { model: modelId, items: Object.fromEntries(definitions.map((value) => [value.id, { ...value, vehicle: { make: 'Ford', model: modelId, generation: value.name, market: 'UK', drive_side: 'RHD' }, vehicle_information: { ...fields } }])) }
      : { model: modelId, generations: definitions };
    manufacturerModels[manufacturerId][modelId] = { name: modelId, manifest: `${modelId}/manifest.json` };
    payload.files[manifestPath] = { manufacturer: { id: manufacturerId }, model: { id: modelId, name: modelId }, files: { models: 'models.json' } };
    payload.files[modelsPath] = modelsData;
  }
  for (const id of ids) {
    const manufacturerPath = `database/vehicles/${id}/manifest.json`;
    manifest.manufacturers[id] = { name: id, manifest: manufacturerPath };
    payload.files[manufacturerPath] = { manufacturer: { id, name: id }, models: manufacturerModels[id] };
  }
  manifest.manufacturers.dacia.logo = 'database/assets/manufacturer_logos/dacia.svg';
  payload.root_manifest = structuredClone(manifest);
  return { manifest, payload };
}

async function run() {
  const { manifest, payload } = fullFixture();
  assert.strictEqual(validatePackageMetadata(manifest), true);
  assert.deepStrictEqual(validateDatabasePackage(payload, manifest), manifest.package_counts);
  const loaded = assembleDatabaseFromPackage(payload, manifest);
  assert.deepStrictEqual(loaded.summary, manifest.package_counts);
  assert(loaded.byManufacturer.dacia.records.length > 0, 'Dacia generations must load');
  assert(loaded.byManufacturer.ford.records[0].vehicle_information, 'Ford details must load');
  assert(loaded.byManufacturer.cupra.records.length > 0, 'CUPRA generations must load');
  assert(loaded.byManufacturer.dacia.logo.startsWith('<svg'), 'downloaded logo must take precedence');
  assert.strictEqual(selectLogoSource('<svg/>', { path: 'x' }), 'downloaded');
  assert.strictEqual(selectLogoSource(null, { path: 'x' }), 'bundled');
  assert.strictEqual(selectLogoSource(null, null), 'initials');

  assert.strictEqual(packageUpdateAvailable({ database_version: '1' }, { database_version: '1' }, false), true);
  assert.strictEqual(packageUpdateAvailable({ database_version: '1' }, { database_version: '1' }, true), false);
  assert.deepStrictEqual(formatDownloadProgress(5, 10), { downloadedBytes: 5, totalBytes: 10, percentage: 50 });
  assert.throws(() => normalizePackagePath('../manifest.json'), /Unsafe packaged path/);

  const extraRoot = structuredClone(payload);
  extraRoot.files = Object.fromEntries(Object.entries(extraRoot.files).map(([path, value]) => [`database-update/${path}`, value]));
  assert.throws(() => validateDatabasePackage(extraRoot, manifest), /missing or invalid/);

  const missingRecords = structuredClone(payload);
  delete missingRecords.files['database/vehicles/dacia/model_2/models.json'];
  assert.throws(() => validateDatabasePackage(missingRecords, manifest), /missing or invalid/);

  const missingLogo = structuredClone(payload);
  delete missingLogo.assets['database/assets/manufacturer_logos/dacia.svg'];
  assert.throws(() => validateDatabasePackage(missingLogo, manifest), /logo is missing/);
  const wrongCaseLogo = structuredClone(payload);
  wrongCaseLogo.assets['database/assets/manufacturer_logos/Dacia.svg'] = wrongCaseLogo.assets['database/assets/manufacturer_logos/dacia.svg'];
  delete wrongCaseLogo.assets['database/assets/manufacturer_logos/dacia.svg'];
  assert.throws(() => validateDatabasePackage(wrongCaseLogo, manifest), /logo is missing/);

  const wrongCounts = structuredClone(payload);
  wrongCounts.counts.vehicle_records = 1498;
  assert.throws(() => validateDatabasePackage(wrongCounts, manifest), /does not match/);

  const state = { active: true, backup: false, prepared: true };
  await performAtomicInstall({
    preserveBackup: true,
    removeBackup: async () => { state.backup = false; }, activeExists: async () => state.active,
    moveActiveToBackup: async () => { state.active = false; state.backup = true; },
    movePreparedToActive: async () => { state.prepared = false; state.active = true; },
    removeActive: async () => { state.active = false; }, backupExists: async () => state.backup,
    restoreBackup: async () => { state.backup = false; state.active = true; },
  });
  assert.deepStrictEqual(state, { active: true, backup: true, prepared: false });

  const rollback = { active: true, backup: false };
  await assert.rejects(() => performAtomicInstall({
    removeBackup: async () => { rollback.backup = false; }, activeExists: async () => rollback.active,
    moveActiveToBackup: async () => { rollback.active = false; rollback.backup = true; },
    movePreparedToActive: async () => { throw new Error('incomplete installation'); },
    removeActive: async () => { rollback.active = false; }, backupExists: async () => rollback.backup,
    restoreBackup: async () => { rollback.backup = false; rollback.active = true; },
  }), /incomplete installation/);
  assert.deepStrictEqual(rollback, { active: true, backup: false });

  console.log('Packaged updater repair tests passed: exact root, full traversal, generations, Dacia, Ford, CUPRA, logos, counts, forced repair, atomic install and rollback.');
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
