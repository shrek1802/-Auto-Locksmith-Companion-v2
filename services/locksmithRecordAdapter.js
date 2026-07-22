const PLACEHOLDER_TEXT = new Set([
  '',
  'unknown',
  'unverified',
  'not verified',
  'research required',
]);

function hasValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') {
    return !PLACEHOLDER_TEXT.has(value.trim().toLowerCase());
  }
  if (Array.isArray(value)) return value.some(hasValue);
  if (typeof value === 'object') return Object.values(value).some(hasValue);
  return true;
}

function compactObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const output = {};
  Object.entries(value).forEach(([key, item]) => {
    if (hasValue(item)) output[key] = item;
  });
  return output;
}

function operationStatus(procedure) {
  if (!procedure || typeof procedure !== 'object') return 'verification_required';
  if (procedure.supported === false) return 'not_supported';
  if (procedure.supported === true) {
    return procedure.online_required || procedure.dealer_key_required
      ? 'conditional'
      : 'supported';
  }
  return 'verification_required';
}

function normaliseProcedure(procedure) {
  if (!procedure || typeof procedure !== 'object') return {};
  return compactObject({
    ...procedure,
    overall_status: procedure.overall_status || operationStatus(procedure),
    summary: procedure.summary || procedure.notes || procedure.method,
    method_text: procedure.method_text || procedure.method,
    programming_method: procedure.programming_method || procedure.method,
    online_requirement:
      procedure.online_requirement ?? procedure.online_required,
    working_key_required: procedure.working_key_required,
    dealer_key_required: procedure.dealer_key_required,
    battery_support_recommended: procedure.battery_support_recommended,
  });
}

function collectToolIds(toolSupport) {
  if (!toolSupport || typeof toolSupport !== 'object') return [];
  return Object.entries(toolSupport)
    .filter(([, value]) => value && typeof value === 'object' && value.supported === true)
    .map(([id]) => id);
}

function normaliseTools(toolSupport) {
  if (!toolSupport || typeof toolSupport !== 'object') return {};
  const supportedTools = Object.entries(toolSupport).map(([id, value]) => ({
    id,
    tool_id: id,
    ...(value && typeof value === 'object' ? value : { notes: String(value) }),
  }));
  return {
    tool_ids: collectToolIds(toolSupport),
    supported_tools: supportedTools,
  };
}

/**
 * Converts the enriched locksmith JSON schema into the app's current display
 * contract without deleting the original sections. The conversion is
 * intentionally additive so future screens can read the native sections.
 */
function normaliseLocksmithRecord(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;

  const record = { ...input };
  const vehicle = { ...(record.vehicle || {}) };
  const key = record.key || {};
  const immobiliser = record.immobiliser || {};
  const programming = record.programming || {};
  const identifier = record.locksmith_configuration_id || record.record_id;

  if (identifier) {
    record.locksmith_configuration_id = identifier;
    record.record_id = record.record_id || identifier;
  }

  if (vehicle.steering && !vehicle.drive_side) vehicle.drive_side = vehicle.steering;
  if (vehicle.manufacturer && !vehicle.make) vehicle.make = vehicle.manufacturer;
  if (vehicle.production_years && (!vehicle.year_from || !vehicle.year_to)) {
    const years = String(vehicle.production_years).match(/\d{4}/g) || [];
    vehicle.year_from = vehicle.year_from || (years[0] ? Number(years[0]) : null);
    vehicle.year_to = vehicle.year_to || (years[1] ? Number(years[1]) : null);
  }
  record.vehicle = vehicle;

  record.key_information = {
    ...(record.key_information || {}),
    key_type: key.type,
    smart_key: key.smart_key,
    keyless_entry: key.keyless_entry,
    keyless_start: key.keyless_start,
    blade_profile: key.blade_profile,
    emergency_blade: key.emergency_blade,
    frequency: key.frequency,
    transponder_id: key.transponder,
    transponder_type: key.transponder,
    remote_configuration: key.remote_buttons,
    buttons: key.remote_buttons,
    oem_part_numbers: key.oem_part_numbers,
    aftermarket_references: key.aftermarket_keys,
  };

  record.security = {
    ...(record.security || {}),
    family: immobiliser.family,
    system: immobiliser.family,
    generation: immobiliser.generation,
    bcm: immobiliser.bcm,
    gateway: immobiliser.gateway,
    kessy: immobiliser.kessy,
    elv: immobiliser.elv,
    esl: immobiliser.esl,
    steering_lock: immobiliser.steering_lock,
    security_gateway: immobiliser.security_gateway,
    sfd: immobiliser.sfd,
    online_requirement: immobiliser.online_required,
    pin_required: immobiliser.pin_required,
    cs_required: immobiliser.cs_required,
    mac_required: immobiliser.mac_required,
  };

  record.operations = {
    ...(record.operations || {}),
    spare_key: normaliseProcedure(programming.spare_key),
    add_key: normaliseProcedure(programming.add_key || programming.spare_key),
    all_keys_lost: normaliseProcedure(programming.all_keys_lost),
    remote_programming: normaliseProcedure(programming.remote_programming),
    module_replacement: normaliseProcedure(programming.module_replacement),
  };

  record.tools = {
    ...(record.tools || {}),
    ...normaliseTools(record.tool_support),
  };
  record.modules = {
    ...(record.modules || {}),
    ...(record.locations || {}),
  };
  record.notes = record.notes || record.technician_notes || {};

  return record;
}

function validateLocksmithConfigurationIds(records) {
  const seen = new Set();
  (Array.isArray(records) ? records : []).forEach((record, index) => {
    const id = record?.locksmith_configuration_id || record?.record_id;
    if (!id) throw new Error(`Vehicle record ${index + 1} has no locksmith_configuration_id.`);
    if (!/^[A-Z0-9_]+$/.test(id)) {
      throw new Error(`${id}: locksmith_configuration_id must use uppercase letters, numbers and underscores only.`);
    }
    if (seen.has(id)) throw new Error(`Duplicate locksmith_configuration_id: ${id}`);
    seen.add(id);
  });
  return true;
}

module.exports = {
  normaliseLocksmithRecord,
  validateLocksmithConfigurationIds,
};
