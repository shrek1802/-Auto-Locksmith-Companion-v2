const REQUIRED_KEY_FIELDS = [
  'blade_profile',
  'transponder_id',
  'technology_family',
  'chip_type',
  'chip_ic',
  'remote_configuration',
  'frequency',
];

const REQUIRED_CATALOGUES = [
  'database/reference/uk_blade_catalogue.json',
  'database/reference/uk_transponder_catalogue.json',
  'database/reference/uk_chip_catalogue.json',
  'database/reference/key_profile_schema.json',
];

function validatePackageMetadata(manifest) {
  if (!manifest?.package_url || !manifest?.package_sha256 || !manifest?.package_size) {
    throw new Error('This database version does not provide a packaged update.');
  }
  if (manifest.package_format !== 'indexed_json') {
    throw new Error(`Unsupported database package format: ${manifest.package_format || 'missing'}.`);
  }
  return true;
}

function normalizePackagePath(value) {
  const path = String(value || '').replace(/\\/g, '/');
  if (!path || path.startsWith('/') || /^[a-z]:/i.test(path)) {
    throw new Error(`Unsafe packaged path: ${path || '(empty)'}`);
  }
  const parts = path.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`Unsafe packaged path: ${path}`);
  }
  return parts.join('/');
}

function getPackagedObject(payload, path) {
  const normalized = normalizePackagePath(path);
  const value = payload.files?.[normalized];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Packaged database file is missing or invalid: ${normalized}`);
  }
  return value;
}

function getPackagedAsset(payload, path) {
  const normalized = normalizePackagePath(path);
  const value = payload.assets?.[normalized];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Referenced manufacturer logo is missing: ${normalized}`);
  }
  return value;
}

function countDefinitions(data) {
  if (Array.isArray(data?.records)) return data.records.length;
  if (data?.items && typeof data.items === 'object' && !Array.isArray(data.items)) {
    return Object.keys(data.items).length;
  }
  if (Array.isArray(data?.generations)) return data.generations.length;
  return 0;
}

function listDefinitions(data) {
  if (Array.isArray(data?.records)) return data.records.map((value, index) => [String(index), value]);
  if (data?.items && typeof data.items === 'object' && !Array.isArray(data.items)) {
    return Object.entries(data.items);
  }
  if (Array.isArray(data?.generations)) {
    return data.generations.map((value, index) => [value?.id || String(index), value]);
  }
  return [];
}

function parseYears(value) {
  const years = String(value || '');
  const matches = years.match(/\d{4}/g) || [];
  return {
    year_from: matches[0] ? Number(matches[0]) : null,
    year_to: /present/i.test(years) ? null : matches[1] ? Number(matches[1]) : matches[0] ? Number(matches[0]) : null,
  };
}

function isResearchPlaceholder(value) {
  if (value === undefined || value === null) return true;
  const text = String(value).trim().toLowerCase().replace(/[_-]+/g, ' ');
  return !text || [
    'research required', 'unknown', 'not verified', 'not yet verified',
    'verification required', 'awaiting verification',
  ].includes(text);
}

function canonicalTransponderApplications(payload) {
  const catalogue = payload.files?.['database/reference/uk_transponder_catalogue.json'];
  return Object.values(catalogue?.items || {}).flatMap((family) =>
    (family?.applications || []).map((application) => ({ family, application })),
  );
}

function scopeMatches(definition, application) {
  const expected = String(application.key_variant_scope || '').toLowerCase();
  if (!expected) return true;
  const actual = String(definition?.catalogue_split?.key_variant_scope || '').toLowerCase();
  if (actual) return actual === expected;
  const types = (definition?.key_variants || []).map((entry) => String(entry?.type || '').toLowerCase());
  return types.some((type) => expected.includes(type) || type.includes(expected.replace(/_key$/, '')));
}

function canonicalApplicationMatches(manufacturerId, modelId, definition, application) {
  if (String(application.manufacturer || '').toLowerCase() !== manufacturerId.toLowerCase()) return false;
  if (String(application.model || '').toLowerCase() !== modelId.toLowerCase()) return false;
  const identity = `${definition?.id || ''} ${definition?.name || ''}`.toLowerCase();
  const chassis = String(application.generation_or_chassis || '').toLowerCase();
  if (chassis && !identity.includes(chassis)) return false;
  const years = parseYears(definition?.years || definition?.year_range);
  if (application.year_from && (!years.year_from || years.year_from < Number(application.year_from))) return false;
  if (application.year_to && (!years.year_to || years.year_to > Number(application.year_to))) return false;
  return scopeMatches(definition, application);
}

function enrichFromCanonicalTransponder(record, definition, manufacturerId, modelId, applications) {
  if (!isResearchPlaceholder(record.vehicle_information?.transponder_id)) return record;
  const matches = applications.filter(({ application }) =>
    canonicalApplicationMatches(manufacturerId, modelId, definition, application));
  const canonicalIds = [...new Set(matches.map(({ family }) => family.canonical_id).filter(Boolean))];
  if (canonicalIds.length !== 1) return record;
  const family = matches[0].family;
  const info = { ...record.vehicle_information, transponder_id: canonicalIds[0] };
  if (!isResearchPlaceholder(family.technology_family)) info.technology_family = family.technology_family;
  info.transponder_verification = {
    status: family.status === 'verified' ? 'verified' : 'partially_verified',
    confidence: family.confidence || 'medium',
    canonical_transponder_family_id: family.id,
    evidence: family.evidence || family.evidence_source_ids || [],
    source: 'canonical UK transponder catalogue exact application',
  };
  return { ...record, vehicle_information: info };
}

function makeRecord(manufacturerId, manufacturerName, modelId, modelName, variantId, definition) {
  if (definition?.vehicle && typeof definition.vehicle === 'object') return definition;
  const years = parseYears(definition?.years || definition?.year_range);
  const variants = Array.isArray(definition?.key_variants)
    ? definition.key_variants.map((entry) => entry?.type).filter(Boolean)
    : [];
  const information = { ...definition, ...(definition?.vehicle_information || {}) };
  if (isResearchPlaceholder(information.immobiliser_system) && !isResearchPlaceholder(definition?.immobiliser_family)) {
    information.immobiliser_system = definition.immobiliser_family;
  }
  return {
    ...definition,
    record_id: definition?.record_id || `${manufacturerId}_${modelId}_${variantId}`,
    vehicle: {
      make: manufacturerName,
      manufacturer_id: manufacturerId,
      model: modelName,
      model_id: modelId,
      variant: variants.join(' / ') || definition?.variant || definition?.name || variantId,
      generation: definition?.generation || definition?.name || variantId,
      ...years,
      market: definition?.market || 'UK',
      drive_side: definition?.drive_side || 'RHD',
    },
    vehicle_information: information,
  };
}

function operationId(value) {
  const id = String(value || '').toLowerCase();
  if (['add_key', 'add-key', 'key_add'].includes(id)) return 'add_key';
  if (['akl', 'all_keys_lost', 'all-keys-lost'].includes(id)) return 'all_keys_lost';
  return id;
}

function operationsFromComponent(componentData) {
  const entries = componentData?.procedures || componentData?.operations || [];
  if (!Array.isArray(entries)) return null;
  const operations = {};
  for (const entry of entries) {
    const id = operationId(entry?.id || entry?.name);
    if (id) operations[id] = { ...entry };
  }
  return Object.keys(operations).length ? operations : null;
}

function selectComponentSection(componentData, variantId, recordId) {
  if (!componentData || typeof componentData !== 'object') return componentData;
  if (variantId && componentData.items?.[variantId] !== undefined) return componentData.items[variantId];
  if (recordId && componentData.items?.[recordId] !== undefined) return componentData.items[recordId];
  if (variantId && componentData[variantId] !== undefined) return componentData[variantId];
  if (recordId && componentData[recordId] !== undefined) return componentData[recordId];
  return componentData;
}

function attachSections(record, components, variantId) {
  const result = { ...record };
  for (const [componentId, componentData] of Object.entries(components)) {
    if (componentId === 'models' || componentId === 'vehicles') continue;
    if (componentId === 'procedures') {
      const operations = operationsFromComponent(componentData);
      if (operations) result.operations = { ...(result.operations || {}), ...operations };
      result.procedures = componentData;
      continue;
    }
    const section = selectComponentSection(componentData, variantId, record.record_id);
    if (section !== undefined) result[componentId] = section;
  }
  return result;
}

function assembleDatabaseFromPackage(payload, manifest) {
  const byManufacturer = {};
  let modelCount = 0;
  let recordCount = 0;
  const transponderApplications = canonicalTransponderApplications(payload);

  for (const [manufacturerId, rootEntry] of Object.entries(manifest.manufacturers || {})) {
    const manufacturerManifest = getPackagedObject(payload, rootEntry.manifest);
    if (manufacturerManifest.manufacturer?.id && manufacturerManifest.manufacturer.id !== manufacturerId) {
      throw new Error(`Manufacturer ID mismatch in ${manufacturerId}.`);
    }
    if (!manufacturerManifest.models || typeof manufacturerManifest.models !== 'object') {
      throw new Error(`The ${manufacturerId} manufacturer manifest is invalid.`);
    }
    const records = [];
    const manufacturerName = manufacturerManifest.manufacturer?.name || rootEntry.name || manufacturerId;
    const logoPath = manufacturerManifest.manufacturer?.logo || rootEntry.logo || null;
    const logo = logoPath ? getPackagedAsset(payload, logoPath) : null;

    for (const [modelId, modelEntry] of Object.entries(manufacturerManifest.models)) {
      modelCount += 1;
      let modelsComponent;
      let components = {};
      if (modelEntry.manifest) {
        const modelManifestPath = normalizePackagePath(`database/vehicles/${manufacturerId}/${modelEntry.manifest}`);
        const modelManifest = getPackagedObject(payload, modelManifestPath);
        if (!modelManifest.files || typeof modelManifest.files !== 'object') {
          throw new Error(`${manufacturerId}/${modelId}/manifest.json is invalid.`);
        }
        const modelDirectory = modelManifestPath.slice(0, modelManifestPath.lastIndexOf('/') + 1);
        for (const [componentId, reference] of Object.entries(modelManifest.files)) {
          const file = typeof reference === 'string' ? reference : reference?.file;
          if (!file) throw new Error(`Missing component path for ${manufacturerId}/${modelId}/${componentId}.`);
          components[componentId] = getPackagedObject(payload, `${modelDirectory}${file}`);
        }
        modelsComponent = components.models || components.vehicles;
      } else {
        const path = `database/vehicles/${manufacturerId}/${modelEntry.file || `${modelId}.json`}`;
        modelsComponent = getPackagedObject(payload, path);
        components = { models: modelsComponent };
      }
      if (!modelsComponent || countDefinitions(modelsComponent) < 1) {
        throw new Error(`No vehicle records were found for ${manufacturerId}/${modelId}.`);
      }
      const modelName = modelsComponent.model || modelEntry.name || modelId;
      for (const [variantId, definition] of listDefinitions(modelsComponent)) {
        const record = makeRecord(manufacturerId, manufacturerName, modelId, modelName, variantId, definition);
        const enriched = enrichFromCanonicalTransponder(
          record, definition, manufacturerId, modelId, transponderApplications,
        );
        records.push(attachSections(enriched, components, variantId));
      }
    }

    recordCount += records.length;
    byManufacturer[manufacturerId] = {
      schema_version: manufacturerManifest.schema_version || '2.2',
      manufacturer: manufacturerManifest.manufacturer || { id: manufacturerId, name: manufacturerName },
      records,
      modelCount: Object.keys(manufacturerManifest.models).length,
      recordCount: records.length,
      logo,
      logoPath,
    };
  }

  return {
    manifest,
    byManufacturer,
    summary: {
      manufacturers: Object.keys(byManufacturer).length,
      models: modelCount,
      vehicle_records: recordCount,
    },
  };
}

function validateDatabasePackage(payload, manifest) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('The downloaded database package is invalid.');
  }
  if (!payload.files || typeof payload.files !== 'object' || Array.isArray(payload.files)) {
    throw new Error('The database package file index is missing.');
  }
  if (!payload.root_manifest || typeof payload.root_manifest !== 'object') {
    throw new Error('The packaged root manifest is missing.');
  }
  if (String(payload.root_manifest.database_version) !== String(manifest.database_version)) {
    throw new Error('The packaged root manifest version does not match.');
  }
  if (Object.keys(payload.root_manifest.manufacturers || {}).length !== Object.keys(manifest.manufacturers || {}).length) {
    throw new Error('The packaged manufacturer index does not match the root manifest.');
  }
  for (const path of Object.keys(payload.files)) normalizePackagePath(path);
  if (String(payload.database_version) !== String(manifest.database_version)) {
    throw new Error('The database package version does not match its manifest.');
  }
  for (const path of REQUIRED_CATALOGUES) getPackagedObject(payload, path);
  const contract = getPackagedObject(payload, 'database/reference/key_profile_schema.json');
  const order = contract.display_order || [];
  if (REQUIRED_KEY_FIELDS.some((field, index) => order[index] !== field)) {
    throw new Error('The packaged key-profile display contract is invalid.');
  }

  const assembled = assembleDatabaseFromPackage(payload, manifest);
  const declared = payload.counts || {};
  const expected = manifest.package_counts || {};
  for (const field of ['manufacturers', 'models', 'vehicle_records']) {
    if (!Number.isInteger(declared[field]) || declared[field] < 1) throw new Error(`Invalid packaged ${field} count.`);
    if (assembled.summary[field] !== declared[field]) {
      throw new Error(`Loaded ${field} count ${assembled.summary[field]} does not match packaged count ${declared[field]}.`);
    }
    if (expected[field] !== undefined && Number(expected[field]) !== assembled.summary[field]) {
      throw new Error(`Loaded ${field} count does not match the root manifest.`);
    }
  }
  for (const manufacturerId of ['dacia', 'ford', 'cupra']) {
    if (!assembled.byManufacturer[manufacturerId]?.records?.length) {
      throw new Error(`${manufacturerId} has no readable packaged vehicle records.`);
    }
  }
  const representative = Object.values(assembled.byManufacturer)
    .flatMap((entry) => entry.records)
    .find((record) => {
      const info = record.vehicle_information || record;
      return REQUIRED_KEY_FIELDS.every((field) => Object.prototype.hasOwnProperty.call(info, field));
    });
  if (!representative) throw new Error('No structured seven-field key profile was found in the package.');

  return assembled.summary;
}

function packageUpdateAvailable(remote, local, installedValid = true) {
  return !installedValid || String(remote?.database_version || '') !== String(local?.database_version || '');
}

function formatDownloadProgress(written, total) {
  const safeWritten = Math.max(0, Number(written) || 0);
  const safeTotal = Math.max(0, Number(total) || 0);
  return {
    downloadedBytes: safeWritten,
    totalBytes: safeTotal,
    percentage: safeTotal ? Math.min(100, Math.round((safeWritten / safeTotal) * 100)) : 0,
  };
}

async function performAtomicInstall(adapter) {
  await adapter.removeBackup();
  const activeExists = await adapter.activeExists();
  if (activeExists) await adapter.moveActiveToBackup();
  try {
    await adapter.movePreparedToActive();
    if (adapter.preserveBackup !== true) await adapter.removeBackup();
  } catch (error) {
    await adapter.removeActive();
    if (activeExists && await adapter.backupExists()) await adapter.restoreBackup();
    throw error;
  }
}

module.exports = {
  REQUIRED_KEY_FIELDS,
  assembleDatabaseFromPackage,
  countDefinitions,
  isResearchPlaceholder,
  formatDownloadProgress,
  getPackagedObject,
  getPackagedAsset,
  normalizePackagePath,
  packageUpdateAvailable,
  performAtomicInstall,
  validateDatabasePackage,
  validatePackageMetadata,
};
