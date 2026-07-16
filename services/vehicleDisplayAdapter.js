import {
  TOOL_NAME_BY_ID,
  normaliseToolId,
} from '../config/toolCatalog';

const LEGACY_ALIASES = {
  autel_im508s: 'autel_im508s_xp400_pro',
  autel_im508s_xp400: 'autel_im508s_xp400_pro',
  xtool: 'xtool_x100_pad2',
  obdstar: 'obdstar_g3',
  lonsdor: 'lonsdor_k518_pro',
  lonsdor_k518: 'lonsdor_k518_pro',
};

const KEY_GENERATION_ONLY = new Set([
  'xhorse_key_tool_max_pro',
  'keydiy_kd_x4',
  'keydiy_kd_max',
]);

const PLACEHOLDERS = new Set([
  'unknown',
  'awaiting verification',
  'verification required',
  'not yet verified',
  'confirm exact tool route',
  'confirm exact year/build',
  'to be confirmed',
  'tbc',
]);

const FORD_TOOL_PROFILES = {
  legacy: [
    'autel_im508s_xp400_pro', 'autel_im608_pro', 'autel_km100x',
    'xhorse_key_tool_plus', 'xhorse_vvdi2', 'xtool_x100_pad2',
    'obdstar_g3', 'obdstar_x300_dp_plus', 'lonsdor_k518_pro',
    'smart_pro', 'zed_full',
  ],
  pats_4d: [
    'autel_im508s_xp400_pro', 'autel_im608_pro', 'autel_km100x',
    'xhorse_key_tool_plus', 'xhorse_vvdi2', 'xtool_x100_pad2',
    'obdstar_g3', 'obdstar_x300_dp_plus', 'lonsdor_k518_pro',
    'smart_pro', 'zed_full',
  ],
  hitag_pro: [
    'autel_im508s_xp400_pro', 'autel_im608_pro', 'autel_km100x',
    'xhorse_key_tool_plus', 'xtool_x100_pad2', 'obdstar_g3',
    'obdstar_x300_dp_plus', 'lonsdor_k518_pro', 'smart_pro',
  ],
  modern_online: [
    'autel_im508s_xp400_pro', 'autel_im608_pro', 'xhorse_key_tool_plus',
    'obdstar_g3', 'lonsdor_k518_pro', 'smart_pro',
  ],
};

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

function normaliseRecordSections(record) {
  if (!record || typeof record !== 'object') return;
  const info = record.vehicle_information || {};
  const programming = info.programming || {};

  record.key_information = mergeSection(record.key_information, {
    key_type: info.key_type,
    blade_profile: info.blade_profile,
    transponder_type: info.transponder_type,
    transponder_id: info.transponder_id,
    immobiliser_generation: info.immobiliser_generation,
    frequency_mhz: info.frequency_mhz,
    battery: preferred(info.battery, info.battery_type),
    buttons: preferred(info.buttons, info.button_count),
    emergency_blade: info.emergency_blade,
    immobiliser_system: info.immobiliser_system,
    oem_part_numbers: info.oem_part_numbers,
    aftermarket_references: info.aftermarket_references,
  });

  record.security = mergeSection(record.security, {
    family: info.immobiliser_system,
    system: info.immobiliser_system,
    platform: info.platform,
    programming_module: preferred(info.programming_module, programming.module),
    programming_route: programming.route,
    security_access: preferred(info.security_access, programming.security_access),
    online_requirement: preferred(info.online_requirement, programming.online_requirement),
    fdrs_requirement: info.fdrs_requirement,
    gateway_requirement: preferred(info.gateway_requirement, info.sgw_requirement),
  });

  const moduleFallback = preferred(info.modules, preferred(info.module_locations, info.locations));
  record.modules = mergeSection(record.modules, moduleFallback);

  const notesFallback = preferred(info.notes, preferred(info.job_notes, info.warnings));
  if (Array.isArray(notesFallback)) {
    record.notes = mergeSection(record.notes, { warnings: notesFallback });
  } else if (typeof notesFallback === 'string') {
    record.notes = mergeSection(record.notes, { notes: notesFallback });
  } else {
    record.notes = mergeSection(record.notes, notesFallback);
  }
}

function toolName(id) {
  return TOOL_NAME_BY_ID[id] || String(id || '')
    .split('_')
    .map((part) => part ? part.charAt(0).toUpperCase() + part.slice(1) : '')
    .join(' ');
}

function inferFordProfile(record) {
  const info = record?.vehicle_information || {};
  const vehicle = record?.vehicle || {};
  const text = [
    info.immobiliser_system, info.immobiliser_generation, info.transponder_type,
    info.key_type, vehicle.generation, info.programming?.route,
  ].filter(Boolean).join(' ').toLowerCase();
  const year = Number(vehicle.year_from || 0);
  if (text.includes('fdrs') || text.includes('can fd') || year >= 2024) return 'modern_online';
  if (text.includes('pcf7939') || text.includes('hitag') || text.includes('id47') || text.includes('id49')) return 'hitag_pro';
  if (text.includes('4d') || text.includes('dst80') || text.includes('id63')) return 'pats_4d';
  return 'legacy';
}

function collectToolIds(record) {
  const info = record?.vehicle_information || {};
  const tools = record?.tools || {};
  const ids = [];
  const add = (value) => {
    const id = canonicalToolId(value);
    if (id && TOOL_NAME_BY_ID[id] && !ids.includes(id)) ids.push(id);
  };
  [info.tool_ids, tools.tool_ids].forEach((list) => {
    if (Array.isArray(list)) list.forEach(add);
  });
  if (Array.isArray(tools.supported_tools)) {
    tools.supported_tools.forEach((item) => add(item?.id || item?.tool_id));
  }
  if (String(record?.vehicle?.make || '').toLowerCase() === 'ford') {
    FORD_TOOL_PROFILES[inferFordProfile(record)].forEach(add);
    ['xhorse_key_tool_max_pro', 'keydiy_kd_x4'].forEach(add);
  }
  return ids;
}

function normaliseOwnedTools(ownedTools) {
  return new Set((Array.isArray(ownedTools) ? ownedTools : []).map(canonicalToolId));
}

export function buildVehicleToolDisplay(record, ownedTools, showOnlyOwnedTools) {
  const info = record?.vehicle_information || {};
  const top = record?.tools || {};
  const owned = normaliseOwnedTools(ownedTools);
  const ids = collectToolIds(record);
  const visible = showOnlyOwnedTools ? ids.filter((id) => owned.has(id)) : ids;
  const output = {};
  const ownedNames = visible.filter((id) => owned.has(id)).map((id) => `✓ ${toolName(id)}`);
  const otherNames = visible.filter((id) => !owned.has(id)).map(toolName);
  if (ownedNames.length) output['Your owned tools'] = ownedNames;
  if (otherNames.length) output['Also compatible'] = otherNames;
  if (showOnlyOwnedTools && !ownedNames.length) output['Your owned tools'] = 'No selected tool is listed for this vehicle.';

  const connection = top.connection_or_adapter || top['Connection / cable'] || info.tool_or_cable_required;
  const route = top.programming_route || top['Programming route'] || info.programming?.route;
  const online = top.online_requirement || top['Online / FDRS'] || info.programming?.online_requirement;
  if (hasValue(connection)) output['Connection / cable'] = connection;
  if (hasValue(route)) output['Programming route'] = route;
  if (hasValue(online)) output['Online / FDRS'] = online;
  if (hasValue(info.battery_type)) output['Key battery'] = info.battery_type;
  return output;
}

function operationSource(record, operationId) {
  const operations = record?.operations || {};
  const procedures = record?.procedures || {};
  const vehicleProgramming = record?.vehicle_information?.programming || {};
  const primary = operations[operationId] ?? procedures[operationId];
  return hasValue(primary) ? primary : vehicleProgramming[operationId];
}

function operationToolMap(record, operation, ownedTools, showOnlyOwnedTools) {
  const owned = normaliseOwnedTools(ownedTools);
  const explicit = operation && typeof operation === 'object' && !Array.isArray(operation) ? operation.tools : null;
  const result = {};
  if (explicit && typeof explicit === 'object') {
    Object.entries(explicit).forEach(([rawId, value]) => {
      const id = canonicalToolId(rawId);
      if (!TOOL_NAME_BY_ID[id] || (showOnlyOwnedTools && !owned.has(id))) return;
      result[id] = {
        ...(typeof value === 'object' ? value : { summary: String(value) }),
        display_name: value?.display_name || toolName(id),
      };
    });
  }
  collectToolIds(record).forEach((id) => {
    if (result[id] || (showOnlyOwnedTools && !owned.has(id))) return;
    const generationOnly = KEY_GENERATION_ONLY.has(id);
    result[id] = {
      display_name: toolName(id),
      status: generationOnly ? 'conditional' : 'supported',
      method: generationOnly ? 'transponder_clone' : 'obd',
      summary: generationOnly
        ? 'Key/remote generation support; use a vehicle programmer for immobiliser learning.'
        : 'Compatible with this Ford security family. Confirm the exact year and current tool software menu.',
    };
  });
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
  const online = preferred(object.online_requirement, vehicleProgramming.online_requirement);
  const tools = operationToolMap(record, object, ownedTools, showOnlyOwnedTools);
  const explicitStatus = String(object.overall_status || object.status || '').toLowerCase();
  const validStatus = ['supported', 'partially_supported', 'conditional', 'not_supported'].includes(explicitStatus);
  const meaningfulMethod = hasValue(methodText);
  return {
    ...cleanValue(object),
    summary: meaningfulMethod ? methodText : undefined,
    method_text: meaningfulMethod ? methodText : undefined,
    programming_method: hasValue(route) ? route : undefined,
    online_requirement: hasValue(online) ? online : undefined,
    tools,
    overall_status: validStatus
      ? explicitStatus
      : meaningfulMethod || Object.keys(tools).length
        ? 'supported'
        : 'verification_required',
  };
}

export function buildVehicleOperations(record, ownedTools, showOnlyOwnedTools) {
  normaliseRecordSections(record);
  const base = cleanValue(record?.operations || {}) || {};
  return {
    ...base,
    add_key: normaliseOperation(record, 'add_key', ownedTools, showOnlyOwnedTools),
    all_keys_lost: normaliseOperation(record, 'all_keys_lost', ownedTools, showOnlyOwnedTools),
    remote_programming: cleanValue(base.remote_programming),
    parameter_reset: cleanValue(base.parameter_reset),
  };
}
