#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

# This is a compatibility migration. The app may already contain some or all of
# these changes from later direct edits, so missing legacy patch targets are not
# errors. Each patch is applied only when its old target is still present.


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        print(f'Skipping already-applied patch: {label}')
        return text
    if old not in text:
        print(f'Skipping unavailable legacy patch target: {label}')
        return text
    print(f'Applying patch: {label}')
    return text.replace(old, new, 1)


# Settings: add legacy missing options only when the old list is still present.
settings_path = ROOT / 'screens' / 'SettingsScreen.js'
settings = settings_path.read_text(encoding='utf-8')
settings = replace_once(
    settings,
    "  {\n    id: 'autel_im608_pro',\n    name: 'Autel IM608 Pro',\n  },",
    "  {\n    id: 'autel_im608_pro',\n    name: 'Autel IM608 Pro',\n  },\n  {\n    id: 'autel_km100x',\n    name: 'Autel KM100X',\n  },",
    'Autel KM100X option',
)
settings = replace_once(
    settings,
    "  {\n    id: 'xhorse_key_tool_plus',\n    name: 'Xhorse Key Tool Plus',\n  },",
    "  {\n    id: 'xhorse_key_tool_plus',\n    name: 'Xhorse Key Tool Plus',\n  },\n  {\n    id: 'xhorse_key_tool_max_pro',\n    name: 'Xhorse Key Tool Max Pro',\n  },",
    'Xhorse Key Tool Max Pro option',
)
settings = replace_once(
    settings,
    "  {\n    id: 'xtool',\n    name: 'Xtool',\n  },",
    "  {\n    id: 'xtool_x100_pad2',\n    name: 'Xtool X100 Pad 2',\n  },",
    'Xtool X100 Pad 2 option',
)
settings_path.write_text(settings, encoding='utf-8')

# Vehicle screen: add fallbacks only when the legacy source still needs them.
vehicle_path = ROOT / 'screens' / 'VehicleScreen.js'
vehicle = vehicle_path.read_text(encoding='utf-8')
vehicle = replace_once(
    vehicle,
    "import React, { useMemo, useState } from 'react';",
    "import React, { useEffect, useMemo, useState } from 'react';",
    'React useEffect import',
)
vehicle = replace_once(
    vehicle,
    "import { Ionicons } from '@expo/vector-icons';",
    "import { Ionicons } from '@expo/vector-icons';\nimport AsyncStorage from '@react-native-async-storage/async-storage';",
    'AsyncStorage import',
)
vehicle = replace_once(
    vehicle,
    'const TILE_CONFIG = [',
    "const OWNED_TOOLS_STORAGE_KEY = '@locksmith_companion_owned_tools';\nconst SHOW_ONLY_OWNED_STORAGE_KEY = '@locksmith_companion_show_only_owned';\n\nconst TOOL_NAMES = {\n  autel_im508s: 'Autel IM508S + XP400 Pro',\n  autel_im508s_xp400_pro: 'Autel IM508S + XP400 Pro',\n  autel_km100x: 'Autel KM100X',\n  xhorse_key_tool_plus: 'Xhorse Key Tool Plus',\n  xhorse_key_tool_max_pro: 'Xhorse Key Tool Max Pro',\n  keydiy_kd_x4: 'KEYDIY KD-X4',\n  obdstar: 'OBDSTAR',\n  obdstar_g3: 'OBDSTAR G3',\n  xtool: 'Xtool',\n  xtool_x100_pad2: 'Xtool X100 Pad 2',\n  lonsdor: 'Lonsdor',\n  lonsdor_k518: 'Lonsdor K518',\n};\n\nconst TILE_CONFIG = [",
    'tool constants',
)
vehicle = replace_once(
    vehicle,
    "  const [openOperations, setOpenOperations] = useState({\n    add_key: true,\n    all_keys_lost: false,\n  });",
    "  const [openOperations, setOpenOperations] = useState({\n    add_key: true,\n    all_keys_lost: false,\n  });\n  const [ownedTools, setOwnedTools] = useState([]);\n  const [showOnlyOwnedTools, setShowOnlyOwnedTools] = useState(false);\n\n  useEffect(() => {\n    let active = true;\n    Promise.all([\n      AsyncStorage.getItem(OWNED_TOOLS_STORAGE_KEY),\n      AsyncStorage.getItem(SHOW_ONLY_OWNED_STORAGE_KEY),\n    ]).then(([storedTools, storedFilter]) => {\n      if (!active) return;\n      try {\n        const parsed = storedTools ? JSON.parse(storedTools) : [];\n        setOwnedTools(Array.isArray(parsed) ? parsed : []);\n      } catch {\n        setOwnedTools([]);\n      }\n      setShowOnlyOwnedTools(storedFilter === 'true');\n    });\n    return () => { active = false; };\n  }, []);",
    'owned tool state',
)
vehicle = replace_once(
    vehicle,
    "  const vehicle = record.vehicle || {};\n  const keyInformation = record.key_information || {};\n  const operations = record.operations || {};\n  const security = record.security || {};\n  const tools = record.tools || {};",
    "  const vehicle = record.vehicle || {};\n  const vehicleInformation = record.vehicle_information || {};\n  const keyInformation = record.key_information || vehicleInformation || {};\n  const operations = record.operations || record.procedures || vehicleInformation.programming || {};\n  const security = record.security || {\n    family: vehicleInformation.immobiliser_system,\n    programming_route: vehicleInformation.programming?.route,\n    online_requirement: vehicleInformation.programming?.online_requirement,\n  };\n  const tools = buildToolDisplay(record.tools, vehicleInformation, ownedTools, showOnlyOwnedTools);",
    'vehicle data fallbacks',
)
vehicle = replace_once(
    vehicle,
    'function GenericSection({ data, empty }) {',
    "function buildToolDisplay(topLevelTools, vehicleInformation, ownedTools, showOnlyOwnedTools) {\n  const output = {};\n  const rawIds = Array.isArray(vehicleInformation?.tool_ids) ? vehicleInformation.tool_ids : [];\n  const topIds = Array.isArray(topLevelTools?.tool_ids) ? topLevelTools.tool_ids : [];\n  const ids = [...new Set([...rawIds, ...topIds])];\n\n  const normaliseOwned = (id) => {\n    if (id === 'autel_im508s') return 'autel_im508s_xp400_pro';\n    if (id === 'xtool') return 'xtool_x100_pad2';\n    if (id === 'obdstar') return 'obdstar_g3';\n    return id;\n  };\n\n  const rows = ids.map((id) => {\n    const selectedId = normaliseOwned(id);\n    return {\n      id,\n      name: TOOL_NAMES[id] || formatLabel(id),\n      owned: ownedTools.includes(selectedId) || ownedTools.includes(id),\n    };\n  });\n\n  const visibleRows = showOnlyOwnedTools ? rows.filter((item) => item.owned) : rows;\n  if (visibleRows.length) {\n    const owned = visibleRows.filter((item) => item.owned).map((item) => `✓ ${item.name}`);\n    const supported = visibleRows.filter((item) => !item.owned).map((item) => item.name);\n    if (owned.length) output['Your owned tools'] = owned;\n    if (supported.length) output['Also supported'] = supported;\n  }\n\n  if (vehicleInformation?.tool_or_cable_required) {\n    output['Connection / cable'] = vehicleInformation.tool_or_cable_required;\n  }\n  if (vehicleInformation?.programming?.route) {\n    output['Programming route'] = vehicleInformation.programming.route;\n  }\n  if (vehicleInformation?.programming?.online_requirement) {\n    output['Online / FDRS'] = vehicleInformation.programming.online_requirement;\n  }\n  if (vehicleInformation?.battery_type) {\n    output['Key battery'] = vehicleInformation.battery_type;\n  }\n\n  if (topLevelTools && typeof topLevelTools === 'object' && !Array.isArray(topLevelTools)) {\n    Object.entries(topLevelTools).forEach(([key, value]) => {\n      if (key !== 'tool_ids' && value !== undefined && value !== null && value !== '') {\n        output[key] = value;\n      }\n    });\n  }\n  return output;\n}\n\nfunction GenericSection({ data, empty }) {",
    'tool display builder',
)
vehicle_path.write_text(vehicle, encoding='utf-8')

# Keep the intended release version without repeatedly incrementing it.
app_json_path = ROOT / 'app.json'
app = json.loads(app_json_path.read_text(encoding='utf-8'))
expo = app['expo']
if int(expo['android'].get('versionCode', 0)) < 57:
    expo['version'] = '2.0.3'
    expo['android']['versionCode'] = 57
    expo['ios']['buildNumber'] = '57'
    app_json_path.write_text(json.dumps(app, indent=2) + '\n', encoding='utf-8')

print('Owned-tool integration check completed successfully.')
