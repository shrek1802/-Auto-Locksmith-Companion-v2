const VALID_STATUSES = new Set([
  'supported',
  'partially_supported',
  'conditional',
  'not_supported',
  'unknown',
  'untested',
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function validateManufacturerFile(data, expectedId) {
  assert(data && typeof data === 'object', 'File must contain a JSON object.');
  assert(data.schema_version === '2.0', 'Unsupported schema_version. Expected 2.0.');
  assert(data.manufacturer && typeof data.manufacturer === 'object', 'manufacturer is missing.');
  assert(data.manufacturer.id === expectedId, `Manufacturer ID must be ${expectedId}.`);
  assert(Array.isArray(data.vehicles), 'vehicles must be an array.');

  const seen = new Set();
  for (const record of data.vehicles) {
    assert(record?.record_id, 'Every vehicle needs record_id.');
    assert(!seen.has(record.record_id), `Duplicate record_id: ${record.record_id}`);
    seen.add(record.record_id);
    assert(record.vehicle?.make, `${record.record_id}: vehicle.make missing.`);
    assert(record.vehicle?.model, `${record.record_id}: vehicle.model missing.`);
    assert(Number.isInteger(record.vehicle?.year_from), `${record.record_id}: year_from must be an integer.`);
    assert(Number.isInteger(record.vehicle?.year_to), `${record.record_id}: year_to must be an integer.`);
    assert(record.vehicle.market === 'UK', `${record.record_id}: market must be UK.`);
    assert(record.vehicle.drive_side === 'RHD', `${record.record_id}: drive_side must be RHD.`);
    assert(record.operations && typeof record.operations === 'object', `${record.record_id}: operations missing.`);

    for (const operationName of ['add_key', 'all_keys_lost']) {
      const operation = record.operations[operationName];
      assert(operation && typeof operation === 'object', `${record.record_id}: ${operationName} missing.`);
      assert(VALID_STATUSES.has(operation.overall_status), `${record.record_id}: invalid ${operationName} status.`);
      assert(operation.tools && typeof operation.tools === 'object', `${record.record_id}: ${operationName}.tools missing.`);
    }
  }
  return true;
}

export function validateRemoteManifest(manifest) {
  assert(manifest && typeof manifest === 'object', 'Manifest must be a JSON object.');
  assert(manifest.schema_version === '2.0', 'Manifest schema_version must be 2.0.');
  assert(manifest.manufacturers && typeof manifest.manufacturers === 'object', 'Manifest manufacturers missing.');
  for (const [id, item] of Object.entries(manifest.manufacturers)) {
    assert(item.name, `${id}: name missing in manifest.`);
    assert(item.file, `${id}: file missing in manifest.`);
    assert(item.version !== undefined, `${id}: version missing in manifest.`);
  }
  return true;
}
