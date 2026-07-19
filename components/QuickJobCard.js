import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function QuickJobCard({ record }) {
  const vehicleInfo = record?.vehicle_information || {};
  const programming = vehicleInfo.programming || {};

  const key = {
    blade_profile: vehicleInfo.blade_profile,
    transponder_type: vehicleInfo.transponder_type,
    transponder_id: vehicleInfo.transponder_id,
    technology_family: vehicleInfo.technology_family || vehicleInfo.transponder_type,
    chip_type: vehicleInfo.chip_type,
    chip_ic: vehicleInfo.chip_ic || vehicleInfo.chip_or_ic,
    remote_configuration: vehicleInfo.remote_configuration,
    frequency: vehicleInfo.frequency || vehicleInfo.frequency_mhz,
    immobiliser_generation: vehicleInfo.immobiliser_generation,
    frequency_mhz: vehicleInfo.frequency_mhz,
    key_type: vehicleInfo.key_type,
    immobiliser_system: vehicleInfo.immobiliser_system,
    ...(record?.key_information || {}),
  };

  const security = record?.security || {
    family: vehicleInfo.immobiliser_system,
    fdrs_requirement: vehicleInfo.fdrs_requirement,
    online_requirement:
      vehicleInfo.online_requirement ?? programming.online_requirement,
  };

  // Merge old and V2 layouts field-by-field. This prevents placeholder values in
  // record.operations from hiding verified vehicle_information.programming data.
  const legacyOperations = record?.operations || record?.procedures || {};
  const operations = {
    ...legacyOperations,
    add_key: preferredOperation(legacyOperations.add_key, programming.add_key),
    all_keys_lost: preferredOperation(
      legacyOperations.all_keys_lost,
      programming.all_keys_lost,
    ),
    online_requirement: preferredValue(
      legacyOperations.online_requirement,
      programming.online_requirement,
    ),
    route: preferredValue(legacyOperations.route, programming.route),
  };

  const addKey = operations.add_key;
  const allKeysLost = operations.all_keys_lost;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="flash-outline" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Quick Job</Text>
          <Text style={styles.subtitle}>Key programming essentials</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.grid}>
          <QuickValue label="Blade" value={key.blade_profile} />
          <QuickValue label="Transponder" value={key.transponder_id} />
          <QuickValue label="Technology" value={key.technology_family} />
          <QuickValue label="Chip Type" value={key.chip_type} />
          <QuickValue label="Chip IC" value={key.chip_ic} />
          <QuickValue label="Remote" value={key.remote_configuration} />
          <QuickValue label="Frequency" value={formatFrequency(key.frequency)} />
        </View>

        <View style={styles.operationBox}>
          <OperationRow label="Add Key" value={operationSummary(addKey)} />
          <OperationRow label="All Keys Lost" value={operationSummary(allKeysLost)} />
          <OperationRow
            label="Immobiliser System"
            value={security.family || security.system || key.immobiliser_system}
          />
          <OperationRow
            label="Online / Server Access"
            value={onlineSummary(security, operations, programming)}
          />
          {hasContent(operations.route) ? (
            <OperationRow label="Programming Method" value={operations.route} />
          ) : null}
        </View>

        {!hasProgrammingContent(operations, programming) ? (
          <View style={styles.pendingBox}>
            <Ionicons name="time-outline" size={19} color="#93C5FD" />
            <Text style={styles.pendingText}>
              Programming procedures are still to be verified.
            </Text>
          </View>
        ) : null}

        {firstWarning(record, addKey, allKeysLost) ? (
          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={20} color="#FBBF24" />
            <Text style={styles.warningText}>{firstWarning(record, addKey, allKeysLost)}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function QuickValue({ label, value }) {
  return (
    <View style={styles.quickValue}>
      <Text style={styles.quickLabel}>{label}</Text>
      <Text style={[styles.quickText, !hasContent(value) && styles.pendingValue]} numberOfLines={4}>
        {display(value)}
      </Text>
    </View>
  );
}

function OperationRow({ label, value }) {
  const available = hasContent(value);
  return (
    <View style={styles.operationRow}>
      <Text style={styles.operationLabel}>{label}</Text>
      <Text style={[styles.operationValue, !available && styles.pendingValue]} numberOfLines={3}>
        {display(value)}
      </Text>
    </View>
  );
}

function preferredOperation(primary, fallback) {
  return hasVerifiedContent(primary) ? primary : fallback;
}

function preferredValue(primary, fallback) {
  return hasVerifiedContent(primary) ? primary : fallback;
}

function operationSummary(operation) {
  if (!hasVerifiedContent(operation)) return '';
  if (typeof operation === 'string') return operation;
  if (operation.supported === false) return 'Not supported';
  return (
    verifiedValue(operation.method) ||
    verifiedValue(operation.method_text) ||
    verifiedValue(operation.programming_method) ||
    verifiedValue(operation.route) ||
    verifiedValue(operation.summary) ||
    verifiedValue(operation.procedure_summary) ||
    verifiedValue(operation.status) ||
    verifiedValue(operation.notes) ||
    (operation.supported === true ? 'Supported' : 'See details')
  );
}

function onlineSummary(security, operations, programming) {
  const values = [
    security.online_requirement,
    security.fdrs_requirement,
    operations.online_requirement,
    programming.online_requirement,
  ];
  const value = values.find((item) => hasVerifiedContent(item));
  if (value === true) return 'Required';
  if (value === false) return 'Not Required';
  return value || '';
}

function firstWarning(record, addKey, allKeysLost) {
  const warnings = [
    typeof addKey === 'object' ? addKey?.warnings : null,
    typeof allKeysLost === 'object' ? allKeysLost?.warnings : null,
    record?.notes?.warnings,
    record?.notes?.job_warning,
  ];
  for (const warning of warnings) {
    if (Array.isArray(warning) && warning.length) return String(warning[0]);
    if (typeof warning === 'string' && warning.trim()) return warning;
  }
  return '';
}

function formatFrequency(value) {
  if (!hasContent(value)) return '';
  const text = String(value);
  return text.toLowerCase().includes('mhz') ? text : `${text} MHz`;
}

function display(value) {
  return hasVerifiedContent(value) ? String(value) : 'Research Required';
}

function verifiedValue(value) {
  return hasVerifiedContent(value) ? value : '';
}

function hasProgrammingContent(operations, programming) {
  return [
    operations?.add_key,
    operations?.all_keys_lost,
    operations?.route,
    operations?.online_requirement,
    programming?.add_key,
    programming?.all_keys_lost,
    programming?.route,
    programming?.online_requirement,
  ].some(hasVerifiedContent);
}

function hasVerifiedContent(value) {
  if (!hasContent(value)) return false;
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    return ![
      'unknown',
      'awaiting verification',
      'verification required',
      'not yet verified',
      'confirm exact tool route',
    ].includes(text);
  }
  if (Array.isArray(value)) return value.some(hasVerifiedContent);
  if (typeof value === 'object') return Object.values(value).some(hasVerifiedContent);
  return true;
}

function hasContent(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden', borderRadius: 20, backgroundColor: '#111827',
    borderWidth: 1, borderColor: '#31538A', marginBottom: 18,
  },
  header: {
    minHeight: 70, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 15, paddingVertical: 12, backgroundColor: '#14213A',
  },
  headerIcon: {
    width: 45, height: 45, borderRadius: 14, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1, marginLeft: 12 },
  title: { color: '#F8FAFC', fontSize: 19, fontWeight: '900' },
  subtitle: { color: '#93C5FD', fontSize: 12, marginTop: 2 },
  content: { padding: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  quickValue: {
    width: '48%', minHeight: 82, borderRadius: 14, padding: 11,
    backgroundColor: '#172033', borderWidth: 1, borderColor: '#2B3A52',
  },
  quickLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  quickText: { color: '#F8FAFC', fontSize: 14, lineHeight: 19, fontWeight: '800', marginTop: 6 },
  pendingValue: { color: '#93C5FD', fontStyle: 'italic', fontWeight: '700' },
  operationBox: {
    marginTop: 12, borderRadius: 14, paddingHorizontal: 12,
    backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#253047',
  },
  operationRow: {
    minHeight: 52, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#334155', gap: 12,
  },
  operationLabel: { color: '#94A3B8', fontSize: 13, fontWeight: '800' },
  operationValue: { flex: 1, color: '#E2E8F0', fontSize: 13, fontWeight: '800', textAlign: 'right' },
  pendingBox: {
    flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 12,
    borderRadius: 14, padding: 12, backgroundColor: '#10203B',
    borderWidth: 1, borderColor: '#1E4E8C',
  },
  pendingText: { flex: 1, color: '#BFDBFE', fontSize: 13, lineHeight: 19 },
  warningBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 12,
    borderRadius: 14, padding: 12, backgroundColor: '#2A2112',
    borderWidth: 1, borderColor: '#7C5C17',
  },
  warningText: { flex: 1, color: '#FDE68A', fontSize: 13, lineHeight: 19 },
});
