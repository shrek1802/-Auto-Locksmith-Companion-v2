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

const FORD_TOOL_PROFILES = {
  legacy: [
    'autel_im508s_xp400_pro',
    'autel_im608_pro',
    'autel_km100x',
    'xhorse_key_tool_plus',
    'xhorse_vvdi2',
    'xtool_x100_pad2',
    'obdstar_g3',
    'obdstar_x300_dp_plus',
    'lonsdor_k518_pro',
    'smart_pro',
    'zed_full',
  ],
  pats_4d: [
    'autel_im508s_xp400_pro',
    'autel_im608_pro',
    'autel_km100x',
    'xhorse_key_tool_plus',
    'xhorse_vvdi2',
    'xtool_x100_pad2',
    'obdstar_g3',
    'obdstar_x300_dp_plus',
    'lonsdor_k518_pro',
    'smart_pro',
    'zed_full',
  ],
  hitag_pro: [
    'autel_im508s_xp400_pro',
    'autel_im608_pro',
    'autel_km100x',
    'xhorse_key_tool_plus',
    'xtool_x100_pad2',
    'obdstar_g3',
    'obdstar_x300_dp_plus',
    'lonsdor_k518_pro',
    'smart_pro',
  ],
  modern_online: [
    'autel_im508s_xp400_pro',
    'autel_im608_pro',
    'xhorse_key_tool_plus',
    'obdstar_g3',
    'lonsdor_k518_pro',
    'smart_pro',
  ],
};

function canonicalToolId(value) {
  const raw = String(value || '').trim().toLowerCase();
  return normaliseToolId(LEGACY_ALIASES[raw] || raw);
}

function hasValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    return Boolean(text) && text !== 'unknown' && text !== 'verification required';
  }
  if (Array.isArray(value)) return value.some(hasValue);
  if (typeof value === 'object') return Object.values(value).some(hasValue);
  return true;
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
    info.immobiliser_system,
    info.immobiliser_generation,
    info.transponder_type,
    info.key_type,
    vehicle.generation,
    info.programming?.route,
  ].filter(Boolean).join(' ').toLowerCase();
  const year = Number(vehicle.year_from || 0);

  if (text.includes('fdrs') || text.includes('can fd') || year >= 2024) return 'modern_online';
  if (text.includes('pcf7939') || text.includes('hitag') || text.includes('id47') || text.includes('id49')) return 'hitag_pro';
  if (text.includes('4d') || text.includes('dst80') || text.includes('id63')) return 'pats_4d';
  return 'legacy';
}

function collectToolIds(record) {
  const vehicleInformation = record?.vehicle_information || {};
  const tools = record?.tools || {};
  const ids = [];
  const add = (value) => {
    const id = canonicalToolId(value);
    if (id && TOOL_NAME_BY_ID[id] && !ids.includes(id)) ids.push(id);
  };

  [vehicleInformation.tool_ids, tools.tool_ids].forEach((list) => {
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
  const vehicleProgramming = record?.vehicle_information?.programming || {};
  return operations[operationId] ?? vehicleProgramming[operationId];
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
  const methodText = typeof raw === 'string' ? raw : object.method || object.summary || object.procedure_summary;
  const route = object.programming_method || object.route || vehicleProgramming.route;
  const online = object.online_requirement || vehicleProgramming.online_requirement;
  const meaningfulMethod = hasValue(methodText);
  const explicitStatus = String(object.overall_status || object.status || '').toLowerCase();
  const validExplicitStatus = ['supported', 'partially_supported', 'conditional', 'not_supported'].includes(explicitStatus);

  return {
    ...object,
    summary: meaningfulMethod ? methodText : object.summary,
    method_text: meaningfulMethod ? methodText : undefined,
    programming_method: hasValue(route) ? route : undefined,
    online_requirement: hasValue(online) ? online : undefined,
    tools: operationToolMap(record, object, ownedTools, showOnlyOwnedTools),
    overall_status: validExplicitStatus ? explicitStatus : (meaningfulMethod ? 'supported' : 'verification_required'),
  };
}

export function buildVehicleOperations(record, ownedTools, showOnlyOwnedTools) {
  const base = record?.operations || {};
  return {
    ...base,
    add_key: normaliseOperation(record, 'add_key', ownedTools, showOnlyOwnedTools),
    all_keys_lost: normaliseOperation(record, 'all_keys_lost', ownedTools, showOnlyOwnedTools),
    remote_programming: base.remote_programming,
    parameter_reset: base.parameter_reset,
  };
}
