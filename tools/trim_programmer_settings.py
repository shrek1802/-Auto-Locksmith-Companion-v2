#!/usr/bin/env python3
from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[1]
settings_path = ROOT / 'screens' / 'SettingsScreen.js'
text = settings_path.read_text(encoding='utf-8')

catalogue = """const AVAILABLE_TOOLS = [
  { id: 'autel_im508', name: 'Autel IM508', group: 'Autel' },
  { id: 'autel_im508s_xp400_pro', name: 'Autel IM508S + XP400 Pro', group: 'Autel' },
  { id: 'autel_im608_pro', name: 'Autel IM608 / IM608 Pro', group: 'Autel' },
  { id: 'autel_km100x', name: 'Autel KM100 / KM100X', group: 'Autel' },

  { id: 'xhorse_key_tool_max_pro', name: 'Xhorse Key Tool Max Pro', group: 'Xhorse' },
  { id: 'xhorse_key_tool_plus', name: 'Xhorse Key Tool Plus', group: 'Xhorse' },
  { id: 'xhorse_vvdi2', name: 'Xhorse VVDI2', group: 'Xhorse' },

  { id: 'keydiy_kd_x4', name: 'KEYDIY KD-X4', group: 'KEYDIY' },
  { id: 'keydiy_kd_max', name: 'KEYDIY KD-Max', group: 'KEYDIY' },

  { id: 'xtool_x100_pad2', name: 'Xtool X100 Pad 2', group: 'Xtool' },
  { id: 'xtool_x100_max2', name: 'Xtool X100 Max 2', group: 'Xtool' },

  { id: 'obdstar_g3', name: 'OBDSTAR G3', group: 'OBDSTAR' },
  { id: 'obdstar_x300_dp_plus', name: 'OBDSTAR X300 DP Plus / Key Master DP Plus', group: 'OBDSTAR' },

  { id: 'lonsdor_k518_pro', name: 'Lonsdor K518 Pro', group: 'Lonsdor' },

  { id: 'smart_pro', name: 'Advanced Diagnostics Smart Pro', group: 'Other' },
  { id: 'zed_full', name: 'Zed-FULL', group: 'Other' },
  { id: 'avdi', name: 'ABRITES AVDI', group: 'Other' },
  { id: 'tango', name: 'Tango', group: 'Other' },
];"""

pattern = re.compile(r"const AVAILABLE_TOOLS = \[.*?\n\];", re.S)
if not pattern.search(text):
    raise SystemExit('Could not find AVAILABLE_TOOLS block')
text = pattern.sub(catalogue, text, count=1)
settings_path.write_text(text, encoding='utf-8')

app_path = ROOT / 'app.json'
app = json.loads(app_path.read_text(encoding='utf-8'))
expo = app['expo']
code = int(expo['android'].get('versionCode', 0))
if code < 58:
    expo['version'] = '2.0.4'
    expo['android']['versionCode'] = 58
    expo['ios']['buildNumber'] = '58'
app_path.write_text(json.dumps(app, indent=2) + '\n', encoding='utf-8')
print('Trimmed programmer settings applied.')
