from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
vehicle = ROOT / 'screens' / 'VehicleScreen.js'
operation = ROOT / 'components' / 'OperationSection.js'

text = vehicle.read_text(encoding='utf-8')

text = text.replace(
    "import React, { useEffect, useMemo, useState } from 'react';",
    "import React, { useCallback, useMemo, useState } from 'react';",
)
text = text.replace(
    "import AsyncStorage from '@react-native-async-storage/async-storage';",
    "import AsyncStorage from '@react-native-async-storage/async-storage';\nimport { useFocusEffect } from '@react-navigation/native';",
)

adapter_import = """import {
  buildVehicleOperations,
  buildVehicleToolDisplay,
} from '../services/vehicleDisplayAdapter';
"""
marker = "import QuickJobCard from '../components/QuickJobCard';\n"
if adapter_import not in text:
    text = text.replace(marker, marker + adapter_import)

start = text.find("const TOOL_NAMES = {")
if start != -1:
    end = text.find("};\n\nconst TILE_CONFIG", start)
    if end == -1:
        raise SystemExit('Could not locate TOOL_NAMES end')
    text = text[:start] + text[end + 3:]

old_effect_start = text.find("  useEffect(() => {")
old_effect_end = text.find("\n\n  if (!record)", old_effect_start)
if old_effect_start == -1 or old_effect_end == -1:
    raise SystemExit('Could not locate owned tool useEffect')
new_effect = """  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        AsyncStorage.getItem(OWNED_TOOLS_STORAGE_KEY),
        AsyncStorage.getItem(SHOW_ONLY_OWNED_STORAGE_KEY),
      ]).then(([storedTools, storedFilter]) => {
        if (!active) return;
        try {
          const parsed = storedTools ? JSON.parse(storedTools) : [];
          setOwnedTools(Array.isArray(parsed) ? parsed : []);
        } catch {
          setOwnedTools([]);
        }
        setShowOnlyOwnedTools(storedFilter === 'true');
      });
      return () => { active = false; };
    }, []),
  );"""
text = text[:old_effect_start] + new_effect + text[old_effect_end:]

old_lines = """  const operations = record.operations || record.procedures || vehicleInformation.programming || {};
  const security = record.security || {
    family: vehicleInformation.immobiliser_system,
    programming_route: vehicleInformation.programming?.route,
    online_requirement: vehicleInformation.programming?.online_requirement,
  };
  const tools = buildToolDisplay(record.tools, vehicleInformation, ownedTools, showOnlyOwnedTools);"""
new_lines = """  const operations = buildVehicleOperations(record, ownedTools, showOnlyOwnedTools);
  const security = record.security || {
    family: vehicleInformation.immobiliser_system,
    programming_route: vehicleInformation.programming?.route,
    online_requirement: vehicleInformation.programming?.online_requirement,
  };
  const tools = buildVehicleToolDisplay(record, ownedTools, showOnlyOwnedTools);"""
if old_lines not in text:
    raise SystemExit('Could not locate operation/tool setup')
text = text.replace(old_lines, new_lines)

fn_start = text.find("function buildToolDisplay(")
fn_end = text.find("\nfunction GenericSection", fn_start)
if fn_start != -1 and fn_end != -1:
    text = text[:fn_start] + text[fn_end + 1:]

vehicle.write_text(text, encoding='utf-8')

op = operation.read_text(encoding='utf-8')
needle = """          {operation?.estimated_minutes ? (
            <InfoRow
              label=\"Estimated time\"
              value={formatEstimatedTime(operation.estimated_minutes)}
            />
          ) : null}

          {operation?.warnings?.length ? ("""
replacement = """          {operation?.method_text ? (
            <InfoRow label=\"Method\" value={operation.method_text} />
          ) : null}

          {operation?.programming_method ? (
            <InfoRow label=\"Programming route\" value={operation.programming_method} />
          ) : null}

          {operation?.online_requirement ? (
            <InfoRow label=\"Online / FDRS\" value={operation.online_requirement} />
          ) : null}

          {operation?.estimated_minutes ? (
            <InfoRow
              label=\"Estimated time\"
              value={formatEstimatedTime(operation.estimated_minutes)}
            />
          ) : null}

          {operation?.warnings?.length ? ("""
if needle not in op:
    raise SystemExit('Could not locate OperationSection insertion point')
op = op.replace(needle, replacement)
operation.write_text(op, encoding='utf-8')

print('Vehicle tool filtering and programming display fixed.')
