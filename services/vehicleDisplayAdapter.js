import {
  TOOL_NAME_BY_ID,
  normaliseToolId,
} from '../config/toolCatalog';

const GENERATION_ONLY = new Set([
  'autel_km100',
  'autel_km100x',
  'xhorse_key_tool_max_pro',
  'keydiy_kd_x4',
  'keydiy_kd_max',
]);

const LEGACY_ALIASES = {
  autel_im508s: 'autel_im508s_xp400_pro',
  autel_im508s_xp400: 'autel_im508s_xp400_pro',
  xtool: 'xtool_x100_pad2',
  obdstar: 'obdstar_g3',
  lonsdor: 'lonsdor_k518_pro',
  lonsdor_k518: 'lonsdor_k518_pro',
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

function collectToolIds(record) {
  const vehicleInformation = record?.vehicle_information || {};
  const tools = record?.tools || {};
  const ids = [];

  const add = (value) => {
    const id = canonicalToolId(value);
    if (id && !ids.includes(id)) ids.push(id);
  };

  [vehicleInformation.tool_ids, tools.tool_ids].forEach((list) => {
    if (Array.isArray(list)) list.forEach(add);
  });

  if (Array.isArray(tools.supported_tools)) {
    tools.supported_tools.forEach((item) => add(item?.id || item?.tool_id));
  }

  Object.keys(tools).forEach((key) => {
    if (TOOL_NAME_BY_ID[canonicalToolId(key)]) add(key);
  });

  return ids;
}

function normaliseOwnedTools(ownedTools) {
  return new Set((Array.isArray(ownedTools) ? ownedTools : []).map(canonicalToolId));
}

export function buildVehicleToolDisplay(record, ownedTools, showOnlyOwnedTools) {
  const vehicleInformation = record?.vehicle_information || {};
  const topLevelTools = record?.tools || {};
  const owned = normaliseOwnedTools(ownedTools);
  const ids = collectToolIds(record);
  const visibleIds = showOnlyOwnedTools ? ids.filter((id) => owned.has(id)) : ids;
  const output = {};

  const ownedNames = visibleIds.filter((id) => owned.has(id)).map((id) => `✓ ${toolName(id)}`);
  const otherNames = visibleIds.filter((id) => !owned.has(id)).map(toolName);

  if (ownedNames.length) output['Your owned tools'] = ownedNames;
  if (otherNames.length) output['Also supported'] = otherNames;
  if (showOnlyOwnedTools && !ownedNames.length && ids.length) {
    output['Your owned tools'] = 'None of your selected tools are listed for this vehicle.';
  }

  const connection = topLevelTools.connection_or_adapter ||
    topLevelTools['Connection / cable'] ||
    vehicleInformation.tool_or_cable_required;
  const route = topLevelTools.programming_route ||
    topLevelTools['Programming route'] ||
    vehicleInformation.programming?.route;
  const online = topLevelTools.online_requirement ||
    topLevelTools['Online / FDRS'] ||
    vehicleInformation.programming?.online_requirement;

  if (hasValue(connection)) output['Connection / cable'] = connection;
  if (hasValue(route)) output['Programming route'] = route;
  if (hasValue(online)) output['Online / FDRS'] = online;
  if (hasValue(vehicleInformation.battery_type)) output['Key battery'] = vehicleInformation.battery_type;

  return output;
}

function operationSource(record, operationId) {
  const operations = record?.operations || {};
  const vehicleProgramming = record?.vehicle_information?.programming || {};
  return operations[operationId] ?? vehicleProgramming[operationId];
}

function operationToolMap(record, operation, ownedTools, showOnlyOwnedTools) {
  const owned = normaliseOwnedTools(ownedTools);
  const explicitTools = operation && typeof operation === 'object' && !Array.isArray(operation)
    ? operation.tools
    : null;

  if (explicitTools && typeof explicitTools === 'object' && Object.keys(explicitTools).length) {
    const result = {};
    Object.entries(explicitTools).forEach(([rawId, value]) => {
      const id = canonicalToolId(rawId);
      if (showOnlyOwnedTools && !owned.has(id)) return;
      result[id] = {
        ...(typeof value === 'object' ? value : { summary: String(value) }),
        display_name: value?.display_name || toolName(id),
      };
    });
    return result;
  }

  const result = {};
  collectToolIds(record).forEach((id) => {
    if (showOnlyOwnedTools && !owned.has(id)) return;
    const generationOnly = GENERATION_ONLY.has(id);
    result[id] = {
      display_name: toolName(id),
      status: generationOnly ? 'conditional' : 'supported',
      method: generationOnly ? 'transponder_clone' : 'obd',
      summary: generationOnly
        ? 'Key or transponder generation support. Confirm separate vehicle-programming coverage.'
        : 'Listed as compatible for this Ford family. Confirm the exact tool menu and build before starting.',
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
    : object.method || object.summary || object.procedure_summary;
  const route = object.programming_method || object.route || vehicleProgramming.route;
  const online = object.online_requirement || vehicleProgramming.online_requirement;
  const tools = operationToolMap(record, object, ownedTools, showOnlyOwnedTools);
  const meaningfulMethod = hasValue(methodText);

  return {
    ...object,
    summary: meaningfulMethod ? methodText : object.summary,
    method_text: meaningfulMethod ? methodText : undefined,
    programming_method: hasValue(route) ? route : undefined,
    online_requirement: hasValue(online) ? online : undefined,
    tools,
    overall_status: object.overall_status || object.status || (meaningfulMethod ? 'supported' : 'unknown'),
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
