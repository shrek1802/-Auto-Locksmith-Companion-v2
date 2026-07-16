#!/usr/bin/env python3
"""Remove unsafe inferred Ford tool compatibility from the app display adapter.

The app must never turn a manufacturer/security-family match into an Add Key or
AKL claim. Only operation-level tool mappings may be shown as operation support.
Record-level tools remain visible as listed equipment, with an explicit warning
that they do not imply support for the selected operation.
"""
from pathlib import Path

PATH = Path("services/vehicleDisplayAdapter.js")
text = PATH.read_text(encoding="utf-8")

start = text.index("const FORD_TOOL_PROFILES = {")
end = text.index("\n\nfunction canonicalToolId", start)
text = text[:start] + text[end + 2:]

start = text.index("function inferFordProfile(record) {")
end = text.index("\n\nfunction collectToolIds", start)
text = text[:start] + text[end + 2:]

unsafe_ford_add = """  if (String(record?.vehicle?.make || '').toLowerCase() === 'ford') {\n    FORD_TOOL_PROFILES[inferFordProfile(record)].forEach(add);\n    ['xhorse_key_tool_max_pro', 'keydiy_kd_x4'].forEach(add);\n  }\n"""
if unsafe_ford_add not in text:
    raise SystemExit("Expected Ford inference block was not found")
text = text.replace(unsafe_ford_add, "")

text = text.replace(
"""  if (ownedNames.length) output['Your owned tools'] = ownedNames;\n  if (otherNames.length) output['Also compatible'] = otherNames;\n  if (showOnlyOwnedTools && !ownedNames.length) output['Your owned tools'] = 'No selected tool is listed for this vehicle.';\n""",
"""  if (ownedNames.length) output['Your listed tools (operation not implied)'] = ownedNames;\n  if (otherNames.length) output['Other listed tools (operation not implied)'] = otherNames;\n  if (showOnlyOwnedTools && !ownedNames.length) {\n    output['Your listed tools (operation not implied)'] = 'No selected tool is explicitly listed for this vehicle.';\n  }\n  if (String(record?.vehicle?.make || '').toLowerCase() === 'ford') {\n    output['Tool safety'] = 'A listed tool is not proof of Add Key or All Keys Lost support. Check the operation-specific tool status, exact build/security platform and current software before accepting the job.';\n  }\n""")

text = text.replace(
"""  if (hasValue(online)) output['Online / FDRS'] = online;\n  if (hasValue(info.battery_type)) output['Key battery'] = info.battery_type;\n""",
"""  if (hasValue(online)) output['Online / FDRS'] = online;\n  const securityAccess = info.security_access || info.programming?.security_access || record?.security?.security_access;\n  if (hasValue(securityAccess)) output['Security access'] = securityAccess;\n  if (hasValue(info.battery_type)) output['Key battery'] = info.battery_type;\n""")

fallback_start = text.index("  collectToolIds(record).forEach((id) => {", text.index("function operationToolMap"))
fallback_end = text.index("  return result;", fallback_start)
text = text[:fallback_start] + "  // Safety: never infer operation support from record-level or manufacturer-level tool lists.\n  // Add Key / AKL tools must be explicitly defined on the operation itself.\n" + text[fallback_end:]

marker = "function normaliseOperation(record, operationId, ownedTools, showOnlyOwnedTools) {"
helper = """function isRestrictedSecurityRecord(record) {\n  const info = record?.vehicle_information || {};\n  const vehicle = record?.vehicle || {};\n  const text = [\n    info.immobiliser_system, info.immobiliser_generation, info.platform,\n    info.transponder_type, info.programming?.route, info.programming?.online_requirement,\n    info.security_access, vehicle.generation, vehicle.variant,\n  ].filter(Boolean).join(' ').toLowerCase();\n  const year = Number(vehicle.year_from || 0);\n  return year >= 2022 || [\n    'mqb49', 'mqb', 'meb', 'fdrs', 'can fd', 'can-fd', 'doip', 'sfd',\n    'online security', 'authorised online', 'shared volkswagen', 'volkswagen',\n  ].some((term) => text.includes(term));\n}\n\n"""
text = text.replace(marker, helper + marker)

old_status = """    overall_status: validStatus\n      ? explicitStatus\n      : meaningfulMethod || Object.keys(tools).length\n        ? 'supported'\n        : 'verification_required',\n"""
new_status = """    overall_status: validStatus\n      ? explicitStatus\n      : isRestrictedSecurityRecord(record)\n        ? (Object.keys(tools).length ? 'conditional' : 'verification_required')\n        : meaningfulMethod || Object.keys(tools).length\n          ? 'supported'\n          : 'verification_required',\n"""
if old_status not in text:
    raise SystemExit("Expected operation status block was not found")
text = text.replace(old_status, new_status)

PATH.write_text(text, encoding="utf-8")
print(f"Patched {PATH}")
