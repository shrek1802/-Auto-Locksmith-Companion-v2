const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'data', 'vehicles');
let failed = false;
for (const file of fs.readdirSync(dir).filter(x => x.endsWith('.json'))) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    if (data.schema_version !== '2.0') throw new Error('schema_version must be 2.0');
    if (!data.manufacturer?.id) throw new Error('manufacturer.id missing');
    if (!Array.isArray(data.vehicles)) throw new Error('vehicles must be an array');
    for (const record of data.vehicles) {
      if (!record.record_id || !record.vehicle?.model || !record.operations?.add_key || !record.operations?.all_keys_lost) {
        throw new Error(`invalid record ${record.record_id || '(missing id)'}`);
      }
      if (record.vehicle.market !== 'UK' || record.vehicle.drive_side !== 'RHD') {
        throw new Error(`${record.record_id} must be UK/RHD`);
      }
    }
    console.log(`OK ${file}: ${data.vehicles.length} record(s)`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${file}: ${error.message}`);
  }
}
process.exit(failed ? 1 : 0);
