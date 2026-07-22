const KNOWLEDGE_ROOT = 'https://raw.githubusercontent.com/shrek1802/locksmith-companion-database/main/database/knowledge_engine';

const cache = { value: null };

async function fetchJson(path) {
  const response = await fetch(`${KNOWLEDGE_ROOT}/${path}?t=${Date.now()}`, {
    headers: { 'Cache-Control': 'no-cache' },
  });
  if (!response.ok) throw new Error(`Knowledge Engine request failed (${response.status}).`);
  return response.json();
}

export async function loadKnowledgeEngine({ force = false } = {}) {
  if (cache.value && !force) return cache.value;
  const manifest = await fetchJson('manifest.json');
  const entries = await Promise.all(
    Object.entries(manifest.object_types || {}).map(async ([type, file]) => [
      type,
      await fetchJson(file),
    ]),
  );
  cache.value = { manifest, ...Object.fromEntries(entries) };
  return cache.value;
}

export function buildMqb45Decision(engine, dashboardType) {
  const rule = engine?.decision_rules?.items?.decision_mqb45_cluster_read_route;
  const branch = rule?.branches?.[dashboardType];
  if (!rule || !branch) return null;
  return {
    question: rule.question,
    preferredMethod: branch.preferred_method || branch.recommended_immo_acquisition_methods?.[0],
    availableMethods: branch.recommended_immo_acquisition_methods || [],
    excludedMethods: branch.excluded_methods || [],
    why: branch.why,
    confidence: rule.confidence,
  };
}

export function buildMqb45JobWorkflow(engine, answers) {
  const rule = engine?.decision_rules?.items?.decision_mqb45_job_workflow;
  if (!rule) return null;

  if (answers?.jobType === 'all_keys_lost') {
    return {
      status: 'not_verified',
      title: 'No verified AKL workflow available',
      why: rule.all_keys_lost?.why,
      confidence: rule.all_keys_lost?.confidence || 'research_required',
      warnings: ['Do not treat the Add Key route as an all-keys-lost procedure.'],
      steps: [],
      keys: [],
    };
  }

  if (!answers?.workingKeyAvailable) {
    return {
      status: 'not_verified',
      title: 'Working key required for this verified route',
      why: 'The recorded workshop event was an Add Key job completed with a working key available.',
      confidence: 'research_required',
      warnings: ['Select All Keys Lost when no working key is available.'],
      steps: [],
      keys: [],
    };
  }

  const branch = rule.add_key?.dashboard_branches?.[answers?.dashboardType];
  if (!branch) return null;

  const profiles = engine?.key_profiles?.items || {};
  const procedureSteps = engine?.procedure_steps?.items || {};
  const toolSupported = (rule.verified_tools || []).includes(answers?.toolId);

  return {
    status: toolSupported ? 'recommended' : 'tool_not_verified',
    title: toolSupported ? 'Recommended MQB48 Add Key workflow' : 'Selected tool not workshop verified',
    preferredMethod: branch.preferred_immo_method,
    availableMethods: branch.available_immo_methods || [],
    excludedMethods: branch.excluded_immo_methods || [],
    why: toolSupported ? branch.why : 'This decision path is currently workshop verified only with the Autel IM508S.',
    confidence: toolSupported ? branch.confidence : 'research_required',
    warnings: [
      ...(branch.warnings || []),
      ...(!toolSupported ? ['Use this route as reference only until the selected tool has verified evidence.'] : []),
    ],
    steps: (branch.procedure_step_ids || []).map((id, index) => ({
      id,
      number: index + 1,
      ...(procedureSteps[id] || { title: id }),
    })),
    keys: (branch.compatible_key_profile_ids || []).map((id) => ({ id, ...(profiles[id] || {}) })),
  };
}

export function getPlatformVerification(engine, platformId) {
  const profile = engine?.platform_profiles?.items?.[platformId];
  if (!profile) return null;
  return {
    ...profile,
    verifiedCapabilities: profile.verified_capabilities || [],
    verificationGaps: profile.verification_gaps || [],
  };
}

export function getKeyProfilesForPlatform(engine, platformId) {
  const profiles = engine?.key_profiles?.items || {};
  return Object.entries(profiles)
    .filter(([, profile]) => Array.isArray(profile?.platform_ids) && profile.platform_ids.includes(platformId))
    .map(([id, profile]) => ({ id, ...profile }));
}

export function getMqb48KeyOptions(engine) {
  return getKeyProfilesForPlatform(engine, 'vag_mqb48_mqb45');
}

export function getMqb5dKeyOptions(engine) {
  const rule = engine?.decision_rules?.items?.decision_mqb5d_key_selection;
  const profiles = engine?.key_profiles?.items || {};
  return (rule?.allowed_key_profile_ids || [])
    .map((id) => ({ id, ...(profiles[id] || {}) }))
    .filter((profile) => profile.platform_ids?.includes('vag_mqb_5d'));
}
