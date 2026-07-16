export const OWNED_TOOLS_STORAGE_KEY = '@locksmith_companion_owned_tools';
export const SHOW_ONLY_OWNED_STORAGE_KEY = '@locksmith_companion_show_only_owned';

export const TOOL_GROUPS = [
  {
    brand: 'Autel',
    tools: [
      { id: 'autel_im508', name: 'Autel IM508' },
      { id: 'autel_im508s_xp400_pro', name: 'Autel IM508S + XP400 Pro' },
      { id: 'autel_im608_pro', name: 'Autel IM608 / IM608 Pro' },
      { id: 'autel_km100x', name: 'Autel KM100 / KM100X' },
    ],
  },
  {
    brand: 'Xhorse',
    tools: [
      { id: 'xhorse_key_tool_max_pro', name: 'Xhorse Key Tool Max Pro' },
      { id: 'xhorse_key_tool_plus', name: 'Xhorse Key Tool Plus' },
      { id: 'xhorse_vvdi2', name: 'Xhorse VVDI2' },
    ],
  },
  {
    brand: 'KEYDIY',
    tools: [
      { id: 'keydiy_kd_x4', name: 'KEYDIY KD-X4' },
      { id: 'keydiy_kd_max', name: 'KEYDIY KD-Max' },
    ],
  },
  {
    brand: 'Xtool',
    tools: [
      { id: 'xtool_x100_pad2', name: 'Xtool X100 Pad 2' },
      { id: 'xtool_x100_max2', name: 'Xtool X100 Max 2' },
    ],
  },
  {
    brand: 'OBDSTAR',
    tools: [
      { id: 'obdstar_g3', name: 'OBDSTAR G3' },
      { id: 'obdstar_x300_dp_plus', name: 'OBDSTAR X300 DP Plus / Key Master DP Plus' },
    ],
  },
  {
    brand: 'Lonsdor',
    tools: [
      { id: 'lonsdor_k518_pro', name: 'Lonsdor K518 Pro' },
    ],
  },
  {
    brand: 'Other',
    tools: [
      { id: 'smart_pro', name: 'Advanced Diagnostics Smart Pro' },
      { id: 'zed_full', name: 'Zed-FULL' },
      { id: 'avdi', name: 'AVDI' },
      { id: 'tango', name: 'Tango' },
    ],
  },
];

export const AVAILABLE_TOOLS = TOOL_GROUPS.flatMap((group) => group.tools);
export const TOOL_NAME_BY_ID = Object.fromEntries(AVAILABLE_TOOLS.map((tool) => [tool.id, tool.name]));

export function normaliseToolId(value) {
  const raw = String(value || '').trim().toLowerCase();
  const aliases = {
    autel_im508s: 'autel_im508s_xp400_pro',
    autel_im508s_xp400: 'autel_im508s_xp400_pro',
    autel_im608: 'autel_im608_pro',
    autel_km100: 'autel_km100x',
    xhorse_key_tool_max: 'xhorse_key_tool_max_pro',
    xtool: 'xtool_x100_pad2',
    xtool_x100_pad_2: 'xtool_x100_pad2',
    obdstar: 'obdstar_g3',
    obdstar_key_master_dp_plus: 'obdstar_x300_dp_plus',
    lonsdor: 'lonsdor_k518_pro',
    lonsdor_k518: 'lonsdor_k518_pro',
  };
  return aliases[raw] || raw;
}
