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
