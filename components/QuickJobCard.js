import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function QuickJobCard({ record }) {
  const key = record?.key_information || {};
  const security = record?.security || {};
  const operations = record?.operations || {};

  const addKey = operations.add_key || {};
  const allKeysLost = operations.all_keys_lost || {};

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons
            name="flash-outline"
            size={24}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.title}>Quick Job</Text>
          <Text style={styles.subtitle}>
            Key programming essentials
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.grid}>
          <QuickValue
            label="Blade"
            value={key.blade_profile}
          />
          <QuickValue
            label="Transponder"
            value={key.transponder_type}
          />
          <QuickValue
            label="Frequency"
            value={formatFrequency(key.frequency_mhz)}
          />
          <QuickValue
            label="Key type"
            value={key.key_type}
          />
        </View>

        <View style={styles.operationBox}>
          <OperationRow
            label="Add Key"
            value={operationSummary(addKey)}
          />
          <OperationRow
            label="All Keys Lost"
            value={operationSummary(allKeysLost)}
          />
          <OperationRow
            label="Security"
            value={
              security.family ||
              security.system ||
              key.immobiliser_system
            }
          />
          <OperationRow
            label="Online / FDRS"
            value={onlineSummary(security, operations)}
          />
        </View>

        {firstWarning(record, addKey, allKeysLost) ? (
          <View style={styles.warningBox}>
            <Ionicons
              name="warning-outline"
              size={20}
              color="#FBBF24"
            />
            <Text style={styles.warningText}>
              {firstWarning(record, addKey, allKeysLost)}
            </Text>
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
      <Text style={styles.quickText} numberOfLines={2}>
        {display(value)}
      </Text>
    </View>
  );
}

function OperationRow({ label, value }) {
  return (
    <View style={styles.operationRow}>
      <Text style={styles.operationLabel}>{label}</Text>
      <Text style={styles.operationValue}>
        {display(value)}
      </Text>
    </View>
  );
}

function operationSummary(operation) {
  if (!hasContent(operation)) {
    return 'Not stated';
  }

  if (operation.supported === false) {
    return 'Not supported';
  }

  return (
    operation.method ||
    operation.programming_method ||
    operation.status ||
    (operation.supported === true ? 'Supported' : 'See details')
  );
}

function onlineSummary(security, operations) {
  const value =
    security.online_requirement ||
    security.fdrs_requirement ||
    operations.online_requirement;

  if (value === true) {
    return 'Required';
  }

  if (value === false) {
    return 'Not required';
  }

  return value || 'Not stated';
}

function firstWarning(record, addKey, allKeysLost) {
  const warnings = [
    addKey.warnings,
    allKeysLost.warnings,
    record?.notes?.warnings,
    record?.notes?.job_warning,
  ];

  for (const warning of warnings) {
    if (Array.isArray(warning) && warning.length) {
      return String(warning[0]);
    }
    if (typeof warning === 'string' && warning.trim()) {
      return warning;
    }
  }

  return '';
}

function formatFrequency(value) {
  if (!hasContent(value)) {
    return '';
  }

  const text = String(value);
  return text.toLowerCase().includes('mhz')
    ? text
    : `${text} MHz`;
}

function display(value) {
  return hasContent(value) ? String(value) : 'Not stated';
}

function hasContent(value) {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }
  return true;
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#31538A',
    marginBottom: 18,
  },
  header: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#14213A',
  },
  headerIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 19,
    fontWeight: '900',
  },
  subtitle: {
    color: '#93C5FD',
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    padding: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  quickValue: {
    width: '48%',
    minHeight: 68,
    borderRadius: 14,
    padding: 11,
    backgroundColor: '#172033',
    borderWidth: 1,
    borderColor: '#2B3A52',
  },
  quickLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  quickText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 6,
  },
  operationBox: {
    marginTop: 12,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#253047',
  },
  operationRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#334155',
    gap: 12,
  },
  operationLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '800',
  },
  operationValue: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 12,
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#2A2112',
    borderWidth: 1,
    borderColor: '#7C5C17',
  },
  warningText: {
    flex: 1,
    color: '#FDE68A',
    fontSize: 13,
    lineHeight: 19,
  },
});
