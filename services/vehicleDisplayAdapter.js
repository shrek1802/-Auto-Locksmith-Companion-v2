import {
  TOOL_NAME_BY_ID,
  normaliseToolId,
} from '../config/toolCatalog';

const { normaliseLocksmithRecord } = require('./locksmithRecordAdapter');

const LEGACY_ALIASES = {
  autel_im508s: 'autel_im508s_xp400_pro',
  autel_im508s_xp400: 'autel_im508s_xp400_pro',
  xtool: 'xtool_x100_pad2',
  obdstar: 'obdstar_g3',
  lonsdor: 'lonsdor_k518_pro',
  lonsdor_k518: 'lonsdor_k518_pro',
};

const PLACEHOLDERS = new Set([
  'unknown',
  'unverified',
  'research required',
  'research_required',
  'awaiting verification',
  'verification required',
  'not yet verified',
  'confirm exact tool route',
  'confirm exact year/build',
  'to be confirmed',
  'tbc',
]);

function canonicalToolId(value) {
  const raw = String(value || '').trim().toLowerCase();
  return normaliseToolId(LEGACY_ALIASES[raw] || raw);
}

function isPlaceholder(value) {
  if (typeof value !== 'string') return false;
  const text = value.trim().toLowerCase();
  return PLACEHOLDERS.has(text) ||
    text.startsWith('awaiting verification') ||
    text.startsWith('verification required') ||
    text.startsWith('not yet verified');
}

function hasValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return Boolean(value.trim()) && !isPlaceholder(value);
  if (Array.isArray(value)) return value.some(hasValue);
  if (typeof value === 'object') return Object.values(value).some(hasValue);
  return true;
}

function preferred(primary, fallback) {
  return hasValue(primary) ? primary : fallback;
}

function cleanValue(value) {
  if (isPlaceholder(value)) return undefined;
  if (Array.isArray(value)) {
    const cleaned = value.map(cleanValue).filter(hasValue);
    return cleaned.length ? cleaned : undefined;
  }
  if (value && typeof value === 'object') {
    const cleaned = {};
    Object.entries(value).forEach(([key, nested]) => {
      const next = cleanValue(nested);
      if (hasValue(next)) cleaned[key] = next;
    });
    return Object.keys(cleaned).length ? cleaned : undefined;
  }
  return value;
}

function mergeSection(primary, fallback) {
  const first = primary && typeof primary === 'object' && !Array.isArray(primary) ? primary : {};
  const second = fallback && typeof fallback === 'object' && !Array.isArray(fallback) ? fallback : {};
  const output = {};
  new Set([...Object.keys(second), ...Object.keys(first)]).forEach((key) => {
    const value = cleanValue(preferred(first[key], second[key]));
    if (hasValue(value)) output[key] = value;
  });
  return output;
}

function prepareRecord(record) {
  return normaliseLocksmithRecord(record) || record || {};
}

function normaliseRecordSections(input) {
  const record = prepareRecord(input);
  const info = record.vehicle_information || {};
  const programming = info.programming || {};

  record.key_information = mergeSection(record.key_information, {
    key_type: info.key_type,
    blade_profile: info.blade_profile,
    transponder_type: info.transponder_type,
    transponder_id: info.transponder_id,
    technology_family: preferred(info.technology_family, info.transponder_type),
    chip_type: info.chip_type,
    chip_ic: preferred(info.chip_ic, info.chip_or_ic),
    remote_configuration: info.remote_configuration,
    frequency: preferred(info.frequency, info.frequency_mhz),
    immobiliser_generation: info.immobiliser_generation,
    battery: preferred(info.battery, info.battery_type),
    buttons: preferred(info.buttons, info.button_count),
    emergency_blade: info.emergency_blade,
    immobiliser_system: preferred(info.immobiliser_system, info.immobiliser_family),
    oem_part_numbers: info.oem_part_numbers,
    aftermarket_references: info.aftermarket_references,
  });

  record.security = mergeSection(record.security, {
    family: preferred(info.immobiliser_system, info.immobiliser_family),
    system: preferred(info.immobiliser_system, info.immobiliser_family),
    platform: info.platform,
    programming_module: preferred(info.programming_module, programming.module),
    programming_route: programming.route,
    security_access: preferred(info.security_access, programming.security_access),
    online_requirement: preferred(info.online_requirement, programming.online_requirement),
    fdrs_requirement: info.fdrs_requirement,
    gateway_requirement: preferred(info.gateway_requirement, info.sgw_requirement),
  });

  record.modules = mergeSection(
    record.modules,
    preferred(info.modules, preferred(info.module_locations, info.locations)),
  );

  const notesFallback = preferred(info.notes, preferred(info.job_notes, info.warnings));
  if (Array.isArray(notesFallback)) {
    record.notes = mergeSection(record.notes, { warnings: notesFallback });
  } else if (typeof notesFallback === 'string') {
    record.notes = mergeSection(record.notes, { notes: notesFallback });
  } else {
    record.notes = mergeSection(record.notes, notesFallback);
  }

  return record;
}

function toolName(id) {
  return TOOL_NAME_BY_ID[id] || String(id || '')
    .split('_')
    .map((part) => part ? part.charAt(0).toUpperCase() + part.slice(1) : '')
    .join(' ');
}

function collectToolIds(record) {
  const info = record?.vehicle_information || {};
  const tools = record?.tools || {};
  const ids = [];
  const add = (value) => {
    const id = canonicalToolId(value);
    if (id && !ids.includes(id)) ids.push(id);
  };
  [info.tool_ids, tools.tool_ids].forEach((list) => {
    if (Array.isArray(list)) list.forEach(add);
  });
  if (Array.isArray(tools.supported_tools)) {
    tools.supported_tools.forEach((item) => add(item?.id || item?.tool_id));
  }
  return ids;
}

function normaliseOwnedTools(ownedTools) {
  return new Set((Array.isArray(ownedTools) ? ownedTools : []).map(canonicalToolId));
}

export function buildVehicleToolDisplay(input, ownedTools, showOnlyOwnedTools) {
  const record = normaliseRecordSections(input);
  const info = record?.vehicle_information || {};
  const top = record?.tools || {};
  const owned = normaliseOwnedTools(ownedTools);
  const ids = collectToolIds(record);
  const visible = showOnlyOwnedTools ? ids.filter((id) => owned.has(id)) : ids;
  const output = {};

  const ownedNames = visible.filter((id) => owned.has(id)).map((id) => `✓ ${toolName(id)}`);
  const otherNames = visible.filter((id) => !owned.has(id)).map(toolName);
  if (ownedNames.length) output['Your listed tools (operation not implied)'] = ownedNames;
  if (otherNames.length) output['Other listed tools (operation not implied)'] = otherNames;
  if (showOnlyOwnedTools && !ownedNames.length) {
    output['Your listed tools (operation not implied)'] = 'No selected tool is explicitly listed for this vehicle.';
  }

  if (record.tool_support && typeof record.tool_support === 'object') {
    Object.entries(record.tool_support).forEach(([id, support]) => {
      if (!support || typeof support !== 'object') return;
      const canonical = canonicalToolId(id);
      if (showOnlyOwnedTools && !owned.has(canonical)) return;
      output[toolName(canonical || id)] = cleanValue({
        supported: support.supported,
        minimum_version: support.minimum_version,
        adapters_required: support.adapters_required,
        functions: support.functions,
        notes: support.notes,
      });
    });
  }

  const connection = top.connection_or_adapter || top['Connection / cable'] || info.tool_or_cable_required;
  const route = top.programming_route || top['Programming route'] || info.programming?.route;
  const online = top.online_requirement || top['Online / FDRS'] || info.programming?.online_requirement;
  if (hasValue(connection)) output['Connection / cable'] = connection;
  if (hasValue(route)) output['Programming route'] = route;
  if (hasValue(online)) output['Online requirement'] = online;
  return cleanValue(output) || {};
}

function operationSource(record, operationId) {
  const operations = record?.operations || {};
  const procedures = record?.procedures || {};
  const vehicleProgramming = record?.vehicle_information?.programming || {};
  const primary = operations[operationId] ?? procedures[operationId];
  return hasValue(primary) ? primary : vehicleProgramming[operationId];
}

function operationToolMap(operation, ownedTools, showOnlyOwnedTools) {
  const owned = normaliseOwnedTools(ownedTools);
  const explicit = operation && typeof operation === 'object' && !Array.isArray(operation)
    ? operation.tools
    : null;
  const result = {};
  if (explicit && typeof explicit === 'object') {
    Object.entries(explicit).forEach(([rawId, value]) => {
      const id = canonicalToolId(rawId);
      if (showOnlyOwnedTools && !owned.has(id)) return;
      result[id || rawId] = {
        ...(typeof value === 'object' ? value : { summary: String(value) }),
        display_name: value?.display_name || toolName(id || rawId),
      };
    });
  }
  return result;
}

function normaliseOperation(record, operationId, ownedTools, showOnlyOwnedTools) {
  const raw = operationSource(record, operationId);
  const vehicleProgramming = record?.vehicle_information?.programming || {};
  const object = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const methodText = typeof raw === 'string'
    ? raw
    : preferred(object.method, preferred(object.method_text, preferred(object.summary, object.procedure_summary)));
  const route = preferred(object.programming_method, preferred(object.route, vehicleProgramming.route));
  const online = preferred(object.online_requirement, preferred(object.online_required, vehicleProgramming.online_requirement));
  const tools = operationToolMap(object, ownedTools, showOnlyOwnedTools);
  const explicitStatus = String(object.overall_status || object.status || '').toLowerCase();
  const validStatus = [
    'supported',
    'partially_supported',
    'conditional',
    'verification_required',
    'not_supported',
  ].includes(explicitStatus);
  return {
    ...cleanValue(object),
    summary: hasValue(methodText) ? methodText : undefined,
    method_text: hasValue(methodText) ? methodText : undefined,
    programming_method: hasValue(route) ? route : undefined,
    online_requirement: hasValue(online) ? online : undefined,
    tools,
    overall_status: validStatus
      ? explicitStatus
      : object.supported === false
        ? 'not_supported'
        : object.supported === true
          ? (object.online_required || object.dealer_key_required ? 'conditional' : 'supported')
          : 'verification_required',
  };
}

export function buildVehicleOperations(input, ownedTools, showOnlyOwnedTools) {
  const record = normaliseRecordSections(input);
  const base = cleanValue(record?.operations || {}) || {};
  return {
    ...base,
    spare_key: normaliseOperation(record, 'spare_key', ownedTools, showOnlyOwnedTools),
    add_key: normaliseOperation(record, 'add_key', ownedTools, showOnlyOwnedTools),
    all_keys_lost: normaliseOperation(record, 'all_keys_lost', ownedTools, showOnlyOwnedTools),
    remote_programming: cleanValue(base.remote_programming),
    module_replacement: cleanValue(base.module_replacement),
    parameter_reset: cleanValue(base.parameter_reset),
  };
}
