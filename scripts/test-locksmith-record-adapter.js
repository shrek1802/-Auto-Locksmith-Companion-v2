const assert = require('assert');
const {
  normaliseLocksmithRecord,
  validateLocksmithConfigurationIds,
} = require('../services/locksmithRecordAdapter');

const source = {
  locksmith_configuration_id: 'VW_POLO_AW1_MQBA0_ID88_GEN5',
  vehicle: {
    manufacturer: 'Volkswagen',
    model: 'Polo',
    generation: 'AW1',
    year_from: 2017,
    year_to: 2024,
    market: 'UK',
    steering: 'RHD',
  },
  key: {
    type: 'Smart key',
    blade_profile: 'HU162T',
    frequency: '433 MHz',
    transponder: 'ID88',
  },
  immobiliser: {
    family: 'MQB A0',
    generation: 'Gen5',
    sfd: false,
  },
  programming: {
    add_key: {
      supported: true,
      method: 'OBD',
      obd: true,
      dealer_key_required: true,
    },
    all_keys_lost: {
      supported: false,
      method: 'Unverified',
    },
  },
  tool_support: {
    autel_im508s: {
      supported: true,
      functions: ['Add key'],
    },
  },
  locations: {
    obd: 'Driver lower dashboard',
  },
  technician_notes: ['Use stable battery support.'],
};

const result = normaliseLocksmithRecord(source);
assert.strictEqual(result.record_id, source.locksmith_configuration_id);
assert.strictEqual(result.vehicle.drive_side, 'RHD');
assert.strictEqual(result.vehicle.make, 'Volkswagen');
assert.strictEqual(result.key_information.transponder_id, 'ID88');
assert.strictEqual(result.security.family, 'MQB A0');
assert.strictEqual(result.operations.add_key.overall_status, 'conditional');
assert.strictEqual(result.operations.all_keys_lost.overall_status, 'not_supported');
assert.deepStrictEqual(result.tools.tool_ids, ['autel_im508s']);
assert.strictEqual(result.modules.obd, 'Driver lower dashboard');
assert.doesNotThrow(() => validateLocksmithConfigurationIds([result]));
assert.throws(
  () => validateLocksmithConfigurationIds([result, result]),
  /Duplicate locksmith_configuration_id/,
);

console.log('Locksmith record adapter tests passed.');
