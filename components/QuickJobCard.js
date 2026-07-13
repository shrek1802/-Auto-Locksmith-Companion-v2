import React, { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AutomotiveIcon from './AutomotiveIcon';

export default function QuickJobCard({
  record,
}) {
  const [expanded, setExpanded] = useState(true);
  const summary = useMemo(
    () => buildQuickSummary(record),
    [record],
  );

  return (
    <View style={styles.card}>
      <Pressable
        style={({ pressed }) => [
          styles.header,
          pressed && styles.pressed,
        ]}
        onPress={() =>
          setExpanded((current) => !current)
        }
      >
        <View style={styles.headerIcon}>
          <Ionicons
            name="flash-outline"
            size={25}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.title}>
            Quick Job
          </Text>

          <Text style={styles.subtitle}>
            Job essentials at a glance
          </Text>
        </View>

        <Ionicons
          name={
            expanded
              ? 'chevron-up'
              : 'chevron-down'
          }
          size={23}
          color="#93C5FD"
        />
      </Pressable>

      {expanded ? (
        <View style={styles.content}>

          <View style={styles.topSummary}>
            <SummaryMetric
              icon="speedometer-outline"
              label="Difficulty"
              value={summary.difficulty}
            />

            <SummaryMetric
              icon="time-outline"
              label="Typical time"
              value={summary.time}
            />
          </View>

          <View style={styles.requirementGrid}>
            <RequirementTile
              icon="obd"
              title="OBD"
              value={summary.obd}
              positive={
                summary.obd === 'Supported' ||
                summary.obd === 'Required'
              }
            />

            <RequirementTile
              icon="chip"
              title="EEPROM"
              value={summary.eeprom}
              positive={
                summary.eeprom === 'Supported' ||
                summary.eeprom === 'Required'
              }
            />

            <RequirementTile
              ionicon="battery-charging-outline"
              title="Battery support"
              value={summary.batterySupport}
              positive={
                summary.batterySupport === 'Required' ||
                summary.batterySupport === 'Recommended'
              }
            />

            <RequirementTile
              ionicon="key-outline"
              title="Working key"
              value={summary.workingKey}
              positive={
                summary.workingKey === 'Required'
              }
            />
          </View>

          <View style={styles.detailsBox}>
            <QuickRow
              label="Transponder"
              value={summary.transponder}
            />

            <QuickRow
              label="Remote frequency"
              value={summary.frequency}
            />

            <QuickRow
              label="Blade"
              value={summary.blade}
            />

            <QuickRow
              label="Key type"
              value={summary.keyType}
            />

            <QuickRow
              label="Dealer key"
              value={summary.dealerKey}
            />
          </View>

          <View style={styles.toolsBox}>
            <View style={styles.toolsHeader}>
              <Ionicons
                name="briefcase-outline"
                size={19}
                color="#93C5FD"
              />

              <Text style={styles.toolsTitle}>
                Compatible tools
              </Text>
            </View>

            {summary.tools.length ? (
              <View style={styles.toolPills}>
                {summary.tools.map((tool) => (
                  <View
                    key={tool}
                    style={styles.toolPill}
                  >
                    <Text
                      style={styles.toolPillText}
                      numberOfLines={1}
                    >
                      {tool}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>
                No compatible tools have been
                added yet.
              </Text>
            )}
          </View>

          {summary.warning ? (
            <View style={styles.warningBox}>
              <Ionicons
                name="warning-outline"
                size={20}
                color="#FBBF24"
              />

              <Text style={styles.warningText}>
                {summary.warning}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function SummaryMetric({
  icon,
  label,
  value,
}) {
  return (
    <View style={styles.metric}>
      <Ionicons
        name={icon}
        size={22}
        color="#93C5FD"
      />

      <View style={styles.metricText}>
        <Text style={styles.metricLabel}>
          {label}
        </Text>

        <Text
          style={styles.metricValue}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function RequirementTile({
  icon,
  ionicon,
  title,
  value,
  positive,
}) {
  return (
    <View style={styles.requirementTile}>
      <View style={styles.requirementIcon}>
        {icon ? (
          <AutomotiveIcon
            name={icon}
            size={31}
            color="#BFDBFE"
          />
        ) : (
          <Ionicons
            name={ionicon}
            size={29}
            color="#BFDBFE"
          />
        )}
      </View>

      <Text style={styles.requirementTitle}>
        {title}
      </Text>

      <Text
        style={[
          styles.requirementValue,
          positive && styles.positiveText,
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function QuickRow({
  label,
  value,
}) {
  return (
    <View style={styles.quickRow}>
      <Text style={styles.quickLabel}>
        {label}
      </Text>

      <Text
        style={styles.quickValue}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function buildQuickSummary(
  record,
) {
  const vehicleInfo =
    record?.vehicle_information ||
    record?.key_information ||
    {};

  const operations =
    record?.operations ||
    record?.procedures ||
    {};

  const addKey =
    operations?.add_key || {};

  const allKeysLost =
    operations?.all_keys_lost || {};

  const operation =
    hasContent(addKey)
      ? addKey
      : allKeysLost;

  return {
    difficulty:
      normaliseDifficulty(
        operation?.difficulty ||
        operation?.skill_level ||
        record?.difficulty ||
        record?.skill_level,
      ),
    time:
      formatEstimatedTime(
        operation?.estimated_minutes ||
        operation?.estimated_time ||
        record?.estimated_minutes,
      ),
    obd: deriveMethodStatus(
      operation,
      record,
      'obd',
    ),
    eeprom: deriveMethodStatus(
      operation,
      record,
      'eeprom',
    ),
    batterySupport:
      deriveBatterySupport(operation, record),
    workingKey:
      operation?.working_key_required === true
        ? 'Required'
        : operation?.working_key_required === false
          ? 'Not required'
          : 'Not stated',
    transponder:
      firstValue(
        vehicleInfo.transponder_type,
        vehicleInfo.transponder,
        vehicleInfo.chip,
      ),
    frequency:
      formatFrequency(
        firstValue(
          vehicleInfo.frequency_mhz,
          vehicleInfo.remote_frequency,
          vehicleInfo.frequency,
        ),
      ),
    blade:
      firstValue(
        vehicleInfo.blade_profile,
        vehicleInfo.blade,
        vehicleInfo.key_blade,
      ),
    keyType:
      firstValue(
        vehicleInfo.key_type,
        vehicleInfo.remote_type,
      ),
    dealerKey:
      operation?.dealer_key_required === true
        ? 'Required'
        : operation?.dealer_key_required === false
          ? 'Not required'
          : 'Not stated',
    tools: extractTools(operation, record),
    warning: extractWarning(operation, record),
  };
}

function deriveMethodStatus(
  operation,
  record,
  method,
) {
  const direct =
    operation?.[`${method}_required`];

  if (direct === true) {
    return 'Required';
  }

  if (direct === false) {
    return 'Not required';
  }

  const methodValue =
    operation?.method ||
    operation?.methods ||
    operation?.programming_method ||
    operation?.programming_methods;

  const searchable = JSON.stringify({
    methodValue,
    operation,
    directRecord: record?.[method],
    wiring: record?.wiring?.[method],
  }).toLowerCase();

  if (searchable.includes(method)) {
    return 'Supported';
  }

  return 'Not stated';
}

function deriveBatterySupport(
  operation,
  record,
) {
  const direct =
    operation?.battery_support_required ??
    operation?.power_supply_required ??
    record?.battery_support_required;

  if (direct === true) {
    return 'Required';
  }

  if (direct === false) {
    return 'Not required';
  }

  const searchable =
    JSON.stringify({
      warnings: operation?.warnings,
      notes: operation?.notes,
      recordNotes: record?.notes,
    }).toLowerCase();

  if (
    searchable.includes('battery support') ||
    searchable.includes('maintainer') ||
    searchable.includes('stabilised') ||
    searchable.includes('stabilized')
  ) {
    return 'Recommended';
  }

  return 'Not stated';
}

function extractTools(
  operation,
  record,
) {
  const tools =
    operation?.tools ||
    operation?.supported_tools ||
    operation?.tool_ids ||
    record?.tools ||
    record?.required_tools ||
    {};

  if (Array.isArray(tools)) {
    return tools
      .map(formatToolName)
      .filter(Boolean)
      .slice(0, 8);
  }

  if (tools && typeof tools === 'object') {
    return Object.entries(tools)
      .filter(([, value]) => {
        const status =
          value?.status ||
          value?.support ||
          value;

        return ![
          'not_supported',
          'unsupported',
          false,
        ].includes(status);
      })
      .map(([toolId, value]) =>
        formatToolName(
          value?.display_name ||
          value?.name ||
          toolId,
        ),
      )
      .filter(Boolean)
      .slice(0, 8);
  }

  return [];
}

function extractWarning(
  operation,
  record,
) {
  const warnings =
    operation?.warnings ||
    record?.common_problems ||
    [];

  if (Array.isArray(warnings)) {
    return warnings[0] || '';
  }

  return typeof warnings === 'string'
    ? warnings
    : '';
}

function normaliseDifficulty(value) {
  if (!value) {
    return 'Not rated';
  }

  const text = String(value)
    .replace(/_/g, ' ')
    .trim();

  return text.replace(
    /\b\w/g,
    (character) => character.toUpperCase(),
  );
}

function formatEstimatedTime(value) {
  if (!value) {
    return 'Not stated';
  }

  if (typeof value === 'number') {
    return `${value} min`;
  }

  if (typeof value === 'string') {
    return value;
  }

  const minimum = value?.minimum;
  const typical = value?.typical;
  const maximum = value?.maximum;

  if (minimum && maximum) {
    return `${minimum}–${maximum} min`;
  }

  if (typical) {
    return `${typical} min`;
  }

  if (minimum) {
    return `From ${minimum} min`;
  }

  if (maximum) {
    return `Up to ${maximum} min`;
  }

  return 'Not stated';
}

function formatFrequency(value) {
  if (!value) {
    return 'Not stated';
  }

  const text = String(value);

  return text.toLowerCase().includes('mhz')
    ? text
    : `${text} MHz`;
}

function firstValue(...values) {
  const value = values.find(
    (item) =>
      item !== undefined &&
      item !== null &&
      item !== '',
  );

  return value === undefined
    ? 'Not stated'
    : String(value);
}

function formatToolName(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    )
    .trim();
}

function hasContent(value) {
  if (!value) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }

  return Boolean(value);
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
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#14213A',
  },
  headerIcon: {
    width: 46,
    height: 46,
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
  topSummary: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 10,
  },
  metric: {
    flex: 1,
    minHeight: 62,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#253047',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
  },
  metricText: {
    flex: 1,
    marginLeft: 9,
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
  },
  metricValue: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  requirementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 9,
  },
  requirementTile: {
    width: '48%',
    minHeight: 115,
    margin: '1%',
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#253047',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requirementIcon: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requirementTitle: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 5,
  },
  requirementValue: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 5,
  },
  positiveText: {
    color: '#86EFAC',
  },
  detailsBox: {
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#253047',
    marginTop: 2,
  },
  quickRow: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    borderBottomColor: '#253047',
  },
  quickLabel: {
    color: '#94A3B8',
    flex: 1,
  },
  quickValue: {
    color: '#F8FAFC',
    flex: 1.2,
    textAlign: 'right',
    fontWeight: '800',
  },
  toolsBox: {
    borderRadius: 14,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#253047',
    padding: 12,
    marginTop: 10,
  },
  toolsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolsTitle: {
    color: '#F8FAFC',
    fontWeight: '900',
    marginLeft: 8,
  },
  toolPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 10,
  },
  toolPill: {
    maxWidth: '100%',
    borderRadius: 999,
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toolPillText: {
    color: '#BFDBFE',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyText: {
    color: '#94A3B8',
    marginTop: 8,
    lineHeight: 19,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    backgroundColor: '#422006',
    borderWidth: 1,
    borderColor: '#92400E',
    padding: 11,
    marginTop: 10,
  },
  warningText: {
    flex: 1,
    color: '#FDE68A',
    lineHeight: 19,
    marginLeft: 8,
  },
  pressed: {
    opacity: 0.8,
  },
});
                  
