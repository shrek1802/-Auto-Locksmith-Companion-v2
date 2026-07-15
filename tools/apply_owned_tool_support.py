#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
settings = ROOT / 'screens' / 'SettingsScreen.js'
vehicle = ROOT / 'screens' / 'VehicleScreen.js'
app_json = ROOT / 'app.json'

# Add the user's actual tools to Settings while preserving old stored IDs.
s = settings.read_text(encoding='utf-8')
old = """  {
    id: 'autel_im608_pro',
    name: 'Autel IM608 Pro',
  },
  {
    id: 'keydiy_kd_x4',
    name: 'KEYDIY KD-X4',
  },
  {
    id: 'xhorse_key_tool_plus',
    name: 'Xhorse Key Tool Plus',
  },"""
new = """  {
    id: 'autel_km100x',
    name: 'Autel KM100X',
  },
  {
    id: 'autel_im608_pro',
    name: 'Autel IM608 Pro',
  },
  {
    id: 'keydiy_kd_x4',
    name: 'KEYDIY KD-X4',
  },
  {
    id: 'xhorse_key_tool_max_pro',
    name: 'Xhorse Key Tool Max Pro',
  },
  {
    id: 'xhorse_key_tool_plus',
    name: 'Xhorse Key Tool Plus',
  },"""
if old not in s:
    raise SystemExit('Settings tool block not found')
s = s.replace(old, new, 1)
s = s.replace("""  {
    id: 'xtool',
    name: 'Xtool',
  },""", """  {
    id: 'xtool_x100_pad2',
    name: 'Xtool X100 Pad 2',
  },""", 1)
settings.write_text(s, encoding='utf-8')

# VehicleScreen: read selected tools and fall back to vehicle_information.tool_ids.
v = vehicle.read_text(encoding='utf-8')
v = v.replace("import React, { useMemo, useState } from 'react';", "import React, { useEffect, useMemo, useState } from 'react';", 1)
v = v.replace("import { Ionicons } from '@expo/vector-icons';", "import { Ionicons } from '@expo/vector-icons';\nimport AsyncStorage from '@react-native-async-storage/async-storage';", 1)
marker = "];\n\nexport default function VehicleScreen"
constants = """\n\nconst OWNED_TOOLS_STORAGE_KEY = '@locksmith_companion_owned_tools';
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
  xtool: 'Xtool',
  xtool_x100_pad2: 'Xtool X100 Pad 2',
  lonsdor: 'Lonsdor',
  lonsdor_k518: 'Lonsdor K518',
};

const TOOL_ALIASES = {
  autel_im508s: ['autel_im508s', 'autel_im508s_xp400_pro'],
  autel_im508s_xp400_pro: ['autel_im508s', 'autel_im508s_xp400_pro'],
  xtool: ['xtool', 'xtool_x100_pad2'],
  xtool_x100_pad2: ['xtool', 'xtool_x100_pad2'],
  obdstar: ['obdstar', 'obdstar_g3'],
  obdstar_g3: ['obdstar', 'obdstar_g3'],
  lonsdor: ['lonsdor', 'lonsdor_k518'],
  lonsdor_k518: ['lonsdor', 'lonsdor_k518'],
};
"""
if marker not in v:
    raise SystemExit('VehicleScreen insertion marker not found')
v = v.replace(marker, "];" + constants + "\nexport default function VehicleScreen", 1)

state_old = """  const [activeSection, setActiveSection] = useState(null);
  const [openOperations, setOpenOperations] = useState({
    add_key: true,
    all_keys_lost: false,
  });
"""
state_new = state_old + """  const [ownedTools, setOwnedTools] = useState([]);
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
  }, []);
"""
if state_old not in v:
    raise SystemExit('VehicleScreen state block not found')
v = v.replace(state_old, state_new, 1)

old_tools = """  const security = record.security || {};
  const tools = record.tools || {};
  const modules = record.modules || {};
"""
new_tools = """  const security = record.security || {};
  const vehicleInformation = record.vehicle_information || {};
  const tools = buildToolDisplay(
    record.tools,
    vehicleInformation,
    ownedTools,
    showOnlyOwnedTools,
  );
  const modules = record.modules || {};
"""
if old_tools not in v:
    raise SystemExit('VehicleScreen tools block not found')
v = v.replace(old_tools, new_tools, 1)

helper_marker = "\nfunction EmptySection({"
helpers = r'''

function buildToolDisplay(explicitTools, vehicleInformation, ownedTools, showOnlyOwned) {
  const explicitIds = extractToolIds(explicitTools);
  const sourceIds = explicitIds.length
    ? explicitIds
    : Array.isArray(vehicleInformation?.tool_ids)
      ? vehicleInformation.tool_ids
      : [];

  const compatibleIds = [...new Set(sourceIds.map(normaliseToolId).filter(Boolean))];
  const owned = new Set((ownedTools || []).flatMap((id) => TOOL_ALIASES[id] || [id]));

  const ownedCompatible = compatibleIds.filter((id) =>
    (TOOL_ALIASES[id] || [id]).some((alias) => owned.has(alias)),
  );
  const otherCompatible = compatibleIds.filter((id) => !ownedCompatible.includes(id));

  // These handhelds can generate compatible universal remotes/transponders where
  // the record's chip family is supported; they are not automatically claimed as
  // full OBD/AKL programmers.
  const generationTools = [];
  if (owned.has('xhorse_key_tool_max_pro')) {
    generationTools.push('Xhorse Key Tool Max Pro — key/remote generation; confirm exact chip and remote family');
  }
  if (owned.has('autel_km100x')) {
    generationTools.push('Autel KM100X — universal key generation and supported IMMO functions; confirm exact coverage');
  }
  if (owned.has('keydiy_kd_x4')) {
    generationTools.push('KEYDIY KD-X4 — remote/key generation; not a substitute for vehicle programming coverage');
  }

  const result = {};
  if (ownedCompatible.length) {
    result.your_compatible_tools = ownedCompatible.map(toolName);
  }
  if (!showOnlyOwned && otherCompatible.length) {
    result.other_supported_tools = otherCompatible.map(toolName);
  }
  if (generationTools.length) {
    result.your_key_generation_tools = generationTools;
  }

  const connection =
    explicitTools?.connection_or_cable ||
    explicitTools?.tool_or_cable_required ||
    vehicleInformation?.tool_or_cable_required;
  if (connection) result.connection_or_cable = connection;

  const programming = vehicleInformation?.programming || {};
  if (programming.route) result.programming_route = programming.route;
  if (programming.online_requirement) {
    result.online_or_fdrs = programming.online_requirement;
  }

  if (!compatibleIds.length && !generationTools.length && !connection) {
    return {};
  }
  return result;
}

function extractToolIds(tools) {
  if (!tools) return [];
  if (Array.isArray(tools)) return tools;
  if (Array.isArray(tools.tool_ids)) return tools.tool_ids;
  if (Array.isArray(tools.compatible_tool_ids)) return tools.compatible_tool_ids;
  if (Array.isArray(tools.compatible_tools)) {
    return tools.compatible_tools.map((item) =>
      typeof item === 'string' ? item : item?.id,
    );
  }
  return [];
}

function normaliseToolId(value) {
  if (!value) return '';
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function toolName(id) {
  return TOOL_CATALOG[id] || formatLabel(id);
}
'''
if helper_marker not in v:
    raise SystemExit('VehicleScreen helper marker not found')
v = v.replace(helper_marker, helpers + helper_marker, 1)
vehicle.write_text(v, encoding='utf-8')

# Force a new APK build.
data = json.loads(app_json.read_text(encoding='utf-8'))
expo = data['expo']
expo['version'] = '2.0.3'
expo['android']['versionCode'] = max(int(expo['android'].get('versionCode', 0)) + 1, 57)
expo['ios']['buildNumber'] = str(expo['android']['versionCode'])
app_json.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')

print('Owned-tool support applied')
