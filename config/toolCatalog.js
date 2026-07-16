export const OWNED_TOOLS_STORAGE_KEY = '@locksmith_companion_owned_tools';
export const SHOW_ONLY_OWNED_STORAGE_KEY = '@locksmith_companion_show_only_owned';

export const TOOL_GROUPS = [
  {
    brand: 'Autel',
    tools: [
      { id: 'autel_im508', name: 'Autel IM508' },
      { id: 'autel_im508s_xp400_pro', name: 'Autel IM508S + XP400 Pro' },
      { id: 'autel_im608', name: 'Autel IM608' },
      { id: 'autel_im608_pro', name: 'Autel IM608 Pro' },
      { id: 'autel_km100', name: 'Autel KM100' },
      { id: 'autel_km100x', name: 'Autel KM100X' },
    ],
  },
  {
    brand: 'Xhorse',
    tools: [
      { id: 'xhorse_key_tool_max_pro', name: 'Xhorse Key Tool Max Pro' },
      { id: 'xhorse_key_tool_plus', name: 'Xhorse Key Tool Plus' },
      { id: 'xhorse_vvdi2', name: 'Xhorse VVDI2' },
      { id: 'xhorse_vvdi_prog', name: 'Xhorse VVDI Prog' },
      { id: 'xhorse_dolphin_xp005l', name: 'Xhorse Dolphin XP005L' },
      { id: 'xhorse_dolphin_xp005', name: 'Xhorse Dolphin XP005' },
      { id: 'xhorse_condor_xc_mini_plus_ii', name: 'Xhorse Condor XC-Mini Plus II' },
      { id: 'xhorse_condor_xc_009', name: 'Xhorse Condor XC-009' },
      { id: 'xhorse_mini_obd', name: 'Xhorse MINI OBD Tool' },
    ],
  },
  {
    brand: 'KEYDIY',
    tools: [
      { id: 'keydiy_kd_x4', name: 'KEYDIY KD-X4' },
      { id: 'keydiy_kd_max', name: 'KEYDIY KD-Max' },
      { id: 'keydiy_kd_pad_mini', name: 'KEYDIY KD Pad Mini' },
    ],
  },
  {
    brand: 'Xtool',
    tools: [
      { id: 'xtool_x100_pad2', name: 'Xtool X100 Pad 2' },
      { id: 'xtool_x100_max2', name: 'Xtool X100 Max 2' },
      { id: 'xtool_kc100', name: 'Xtool KC100' },
      { id: 'xtool_kc501', name: 'Xtool KC501' },
    ],
  },
  {
    brand: 'OBDSTAR',
    tools: [
      { id: 'obdstar_g3', name: 'OBDSTAR G3' },
      { id: 'obdstar_x300_dp_plus', name: 'OBDSTAR X300 DP Plus' },
      { id: 'obdstar_key_master_dp_plus', name: 'OBDSTAR Key Master DP Plus' },
    ],
  },
  {
    brand: 'Lonsdor',
    tools: [
      { id: 'lonsdor_k518_pro', name: 'Lonsdor K518 Pro' },
      { id: 'lonsdor_kh100_plus', name: 'Lonsdor KH100+' },
    ],
  },
  {
    brand: 'Other',
    tools: [
      { id: 'tango', name: 'Tango' },
      { id: 'tmpro2', name: 'TMPro2' },
      { id: 'orange5', name: 'Orange5' },
      { id: 'smok_uhds', name: 'SMOK UHDS' },
      { id: 'acdp_1', name: 'Yanhua ACDP 1' },
      { id: 'acdp_2', name: 'Yanhua ACDP 2' },
      { id: 'avdi', name: 'AVDI' },
      { id: 'zed_full', name: 'Zed-FULL' },
      { id: 'smart_pro', name: 'Advanced Diagnostics Smart Pro' },
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
    autel_km100x: 'autel_km100x',
    xhorse_key_tool_max: 'xhorse_key_tool_max_pro',
    xhorse_key_tool_max_pro: 'xhorse_key_tool_max_pro',
    xhorse_key_tool_plus: 'xhorse_key_tool_plus',
    xtool: 'xtool_x100_pad2',
    xtool_x100_pad_2: 'xtool_x100_pad2',
    xtool_x100_pad2: 'xtool_x100_pad2',
    obdstar: 'obdstar_g3',
    obdstar_g3: 'obdstar_g3',
    lonsdor: 'lonsdor_k518_pro',
    lonsdor_k518: 'lonsdor_k518_pro',
    keydiy_kd_x4: 'keydiy_kd_x4',
  };
  return aliases[raw] || raw;
}
