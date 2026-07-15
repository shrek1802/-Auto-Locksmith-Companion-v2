#!/usr/bin/env python3
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
settings = ROOT / 'screens' / 'SettingsScreen.js'
vehicle = ROOT / 'screens' / 'VehicleScreen.js'
app_json = ROOT / 'app.json'


def insert_tool_option(text, anchor_id, block):
    if block.strip() in text:
        return text
    pattern = rf"(\s*\{{\s*id:\s*'{re.escape(anchor_id)}',[\s\S]*?\n\s*\}},)"
    match = re.search(pattern, text)
    if not match:
        raise SystemExit(f'Settings anchor not found: {anchor_id}')
    return text[:match.start()] + block + '\n' + text[match.start():]


# Add exact tools to Settings.
s = settings.read_text(encoding='utf-8')
s = insert_tool_option(s, 'autel_im608_pro', """  {
    id: 'autel_km100x',
    name: 'Autel KM100X',
  },""")
s = insert_tool_option(s, 'xhorse_key_tool_plus', """  {
    id: 'xhorse_key_tool_max_pro',
    name: 'Xhorse Key Tool Max Pro',
  },""")

# Replace the old generic Xtool entry, preserving old stored ID as an alias in VehicleScreen.
s = re.sub(
    r"\s*\{\s*id:\s*'xtool',\s*name:\s*'Xtool',\s*\},",
    """  {
    id: 'xtool_x100_pads',
    name: 'Xtool X100 PAD S',
  },
  {
    id: 'xtool_x100_pad2',
    name: 'Xtool X100 Pad 2',
  },""",
    s,
    count=1,
)
settings.write_text(s, encoding='utf-8')

# VehicleScreen: load tool preferences and support database fallback tool IDs.
v = vehicle.read_text(encoding='utf-8')

v = re.sub(
    r"import React, \{([^}]*)\} from 'react';",
    lambda m: "import React, {" + (m.group(1) if 'useEffect' in m.group(1) else ' useEffect,' + m.group(1)) + "} from 'react';",
    v,
    count=1,
)
if "@react-native-async-storage/async-storage" not in v:
    v = v.replace(
        "import { Ionicons } from '@expo/vector-icons';",
        "import { Ionicons } from '@expo/vector-icons';\nimport AsyncStorage from '@react-native-async-storage/async-storage';",
        1,
    )

constants = """
const OWNED_TOOLS_STORAGE_KEY = '@locksmith_companion_owned_tools';
const SHOW_ONLY_OWNED_STORAGE_KEY = '@locksmith_companion_show_only_owned';

const TOOL_CATALOG = {
  autel_im508s: 'Autel IM508S + XP400 Pro',
  autel_im508s_xp400_pro: 'Autel IM508S + XP400 Pro',
  autel_km100x: 'Autel KM100X',
  xhorse_key_tool_max_pro: 'Xhorse Key Tool Max Pro',
  xhorse_key_tool_plus: 'Xhorse Key Tool Plus',
  keydiy_kd_x4: 'KEYDIY KD-X4',
  obdstar: 'OBDSTAR',
  obdstar_g3: 'OBDSTAR G3',
  xtool: 'Xtool X100 PAD S',
  xtool_x100_pads: 'Xtool X100 PAD S',
  xtool_x100_pad2: 'Xtool X100 Pad 2',
  lonsdor: 'Lonsdor',
  lonsdor_k518: 'Lonsdor K518',
};

const TOOL_ALIASES = {
  autel_im508s: ['autel_im508s', 'autel_im508s_xp400_pro'],
  autel_im508s_xp400_pro: ['autel_im508s', 'autel_im508s_xp400_pro'],
  xtool: ['xtool', 'xtool_x100_pads', 'xtool_x100_pad2'],
  xtool_x100_pads: ['xtool', 'xtool_x100_pads'],
  xtool_x100_pad2: ['xtool', 'xtool_x100_pad2'],
  obdstar: ['obdstar', 'obdstar_g3'],
  obdstar_g3: ['obdstar', 'obdstar_g3'],
  lonsdor: ['lonsdor', 'lonsdor_k518'],
  lonsdor_k518: ['lonsdor', 'lonsdor_k518'],
};
"""
if 'const TOOL_CATALOG' not in v:
    v = v.replace('const TILE_CONFIG = [', constants + '\nconst TILE_CONFIG = [', 1)

# Add state after the openOperations state block.
if 'const [ownedTools, setOwnedTools]' not in v:
    state_pattern = r"(const \[openOperations, setOpenOperations\] = useState\(\{[\s\S]*?\}\);)"
    state_add = r"""\1
  const [ownedTools, setOwnedTools] = useState([]);
  const [showOnlyOwnedTools, setShowOnlyOwnedTools] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      AsyncStorage.getItem(OWNED_TOOLS_STORAGE_KEY),
      AsyncStorage.getItem(SHOW_ONLY_OWNED_STORAGE_KEY),
    ]).then(([storedTools, storedFilter]) => {
      if (!mounted) return;
      try {
        const parsed = storedTools ? JSON.parse(storedTools) : [];
        setOwnedTools(Array.isArray(parsed) ? parsed : []);
      } catch {
        setOwnedTools([]);
      }
      setShowOnlyOwnedTools(storedFilter === 'true');
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);"""
    v, count = re.subn(state_pattern, state_add, v, count=1)
    if count != 1:
        raise SystemExit('VehicleScreen state block not found')

# Make section rendering receive preferences.
v = v.replace(
    'openOperations,\n                toggleOperation,',
    'openOperations,\n                toggleOperation,\n                ownedTools,\n                showOnlyOwnedTools,',
)
v = v.replace(
    'openOperations,\n  toggleOperation,\n})',
    'openOperations,\n  toggleOperation,\n  ownedTools,\n  showOnlyOwnedTools,\n})',
)
# Compact/current formatting fallback.
v = v.replace(
    'openOperations, toggleOperation, })}',
    'openOperations, toggleOperation, ownedTools, showOnlyOwnedTools, })}',
)
v = v.replace(
    'openOperations, toggleOperation, }) {',
    'openOperations, toggleOperation, ownedTools, showOnlyOwnedTools, }) {',
)

# Replace Tools section with an owned-aware renderer, accommodating formatted/minified JSX.
v = re.sub(
    r"case 'tools':\s*return \(\s*<GenericSection[\s\S]*?emptyText=\"No verified tool support has been added yet\.\"[\s\S]*?/>\s*\);",
    "case 'tools':\n      return (\n        <ToolSection record={record} ownedTools={ownedTools} showOnlyOwnedTools={showOnlyOwnedTools} />\n      );",
    v,
    count=1,
)
# Current compact source fallback.
v = v.replace("case 'tools': return (  );", "case 'tools': return ( <ToolSection record={record} ownedTools={ownedTools} showOnlyOwnedTools={showOnlyOwnedTools} /> );")

# Replace/extend extractTools and add owned-aware component.
helper_marker = '\nfunction normaliseDisplayValue'
helpers = r'''

function collectToolIds(value) {
  const ids = [];
  const walk = (item) => {
    if (!item) return;
    if (Array.isArray(item)) return item.forEach(walk);
    if (typeof item !== 'object') return;
    if (typeof item.id === 'string') ids.push(item.id);
    Object.entries(item).forEach(([key, nested]) => {
      if (['tool_ids', 'supported_tool_ids', 'compatible_tool_ids', 'owned_tool_match_ids'].includes(key) && Array.isArray(nested)) {
        nested.forEach((id) => typeof id === 'string' && ids.push(id));
      } else {
        walk(nested);
      }
    });
  };
  walk(value);
  return [...new Set(ids.map(normaliseToolId).filter(Boolean))];
}

function normaliseToolId(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function toolMatchesOwned(id, ownedSet) {
  return (TOOL_ALIASES[id] || [id]).some((alias) => ownedSet.has(alias));
}

function ToolSection({ record, ownedTools = [], showOnlyOwnedTools = false }) {
  const tools = extractTools(record);
  const vehicleInfo = record?.vehicle_information || record?.key_information || {};
  const fallbackIds = Array.isArray(vehicleInfo.tool_ids) ? vehicleInfo.tool_ids : [];
  const ids = [...new Set([...collectToolIds(tools), ...fallbackIds.map(normaliseToolId)].filter(Boolean))];
  const ownedSet = new Set(ownedTools.flatMap((id) => TOOL_ALIASES[id] || [id]));
  const ownedMatches = ids.filter((id) => toolMatchesOwned(id, ownedSet));
  const others = ids.filter((id) => !ownedMatches.includes(id));

  const generationTools = [];
  if (ownedSet.has('xhorse_key_tool_max_pro')) generationTools.push('Xhorse Key Tool Max Pro — key/remote generation; confirm exact vehicle programming coverage');
  if (ownedSet.has('autel_km100x')) generationTools.push('Autel KM100X — universal key generation and supported IMMO functions; confirm exact application');
  if (ownedSet.has('keydiy_kd_x4')) generationTools.push('KEYDIY KD-X4 — key/remote generation; separate vehicle programmer may be required');

  if (!ids.length && !generationTools.length && !vehicleInfo.tool_or_cable_required) {
    return <EmptySectionText text="No verified tool support has been added yet." />;
  }

  return (
    <View>
      {ownedMatches.length ? <InfoRow label="Your compatible tools" value={ownedMatches.map((id) => TOOL_CATALOG[id] || formatLabel(id))} /> : null}
      {!showOnlyOwnedTools && others.length ? <InfoRow label="Other supported tools" value={others.map((id) => TOOL_CATALOG[id] || formatLabel(id))} /> : null}
      {generationTools.length ? <InfoRow label="Your key generation tools" value={generationTools} /> : null}
      <InfoRow label="Connection / adapter" value={tools?.connection_or_adapter || tools?.connection_or_cable || tools?.tool_or_cable_required || vehicleInfo.tool_or_cable_required} />
      <InfoRow label="Programming route" value={tools?.programming_route || vehicleInfo.programming?.route} />
      <InfoRow label="Online / FDRS" value={tools?.online_requirement || vehicleInfo.programming?.online_requirement} />
      {showOnlyOwnedTools && !ownedMatches.length && !generationTools.length ? <EmptySectionText text="None of your selected tools are currently matched to this record." /> : null}
    </View>
  );
}
'''
if 'function ToolSection' not in v:
    if helper_marker not in v:
        raise SystemExit('VehicleScreen helper marker not found')
    v = v.replace(helper_marker, helpers + helper_marker, 1)

# Ensure extractTools can use vehicle_information.tool_ids.
if 'record?.vehicle_information?.tool_ids' not in v:
    v = re.sub(
        r"function extractTools\(record\) \{[\s\S]*?\n\}",
        """function extractTools(record) {
  const direct = record?.tools || record?.required_tools || record?.tool_requirements || record?.procedures?.required_tools || record?.operations?.required_tools;
  if (hasObjectContent(direct)) return direct;
  const info = record?.vehicle_information || record?.key_information || {};
  if (Array.isArray(info.tool_ids) && info.tool_ids.length) {
    return {
      supported_tool_ids: info.tool_ids,
      connection_or_adapter: info.tool_or_cable_required,
      programming_route: info.programming?.route,
      online_requirement: info.programming?.online_requirement,
    };
  }
  return null;
}""",
        v,
        count=1,
    )

vehicle.write_text(v, encoding='utf-8')

# Force a new APK build.
data = json.loads(app_json.read_text(encoding='utf-8'))
expo = data['expo']
expo['version'] = '2.0.3'
expo['android']['versionCode'] = max(int(expo['android'].get('versionCode', 0)) + 1, 57)
expo['ios']['buildNumber'] = str(expo['android']['versionCode'])
app_json.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')

print('Owned-tool support applied to current app source')
