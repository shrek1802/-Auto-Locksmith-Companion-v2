import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import ToolCard from './ToolCard';
import StatusBadge from './StatusBadge';

export default function OperationSection({
  title,
  operation,
  isOpen,
  onToggle,
}) {
  const tools = operation?.tools || {};
  const toolEntries = Object.entries(tools);
  const overallStatus =
    operation?.overall_status ||
    operation?.status ||
    deriveOverallStatus(toolEntries);

  const summary = displayOperationText(operation?.summary);
  const method = displayOperationText(operation?.method_text);

  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={onToggle}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>

          {summary ? (
            <Text style={styles.summary} numberOfLines={2}>
              {summary}
            </Text>
          ) : null}
        </View>

        <View style={styles.headerRight}>
          <StatusBadge status={overallStatus} compact />
          <Text style={styles.chevron}>{isOpen ? '⌃' : '⌄'}</Text>
        </View>
      </Pressable>

      {isOpen ? (
        <View style={styles.content}>
          {operation?.working_key_required !== undefined ? (
            <InfoRow
              label="Working key required"
              value={operation.working_key_required ? 'Yes' : 'No'}
            />
          ) : null}

          {operation?.minimum_keys_to_program !== undefined ? (
            <InfoRow
              label="Minimum keys"
              value={String(operation.minimum_keys_to_program)}
            />
          ) : null}

          {operation?.dealer_key_required !== undefined ? (
            <InfoRow
              label="Dealer key required"
              value={operation.dealer_key_required ? 'Yes' : 'No'}
            />
          ) : null}

          {method ? <InfoRow label="Method" value={method} /> : null}

          {operation?.programming_method ? (
            <InfoRow
              label="Programming Method"
              value={operation.programming_method}
            />
          ) : null}

          {operation?.online_requirement ? (
            <InfoRow
              label="Online / Server Access"
              value={operation.online_requirement}
            />
          ) : null}

          {operation?.estimated_minutes ? (
            <InfoRow
              label="Estimated time"
              value={formatEstimatedTime(operation.estimated_minutes)}
            />
          ) : null}

          {operation?.warnings?.length ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>Warnings</Text>
              {operation.warnings.map((warning, index) => (
                <View key={`warning-${index}`} style={styles.warningRow}>
                  <Text style={styles.warningBullet}>•</Text>
                  <Text style={styles.warningText}>{warning}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <Text style={styles.toolsTitle}>Tool compatibility</Text>

          {toolEntries.length ? (
            toolEntries.map(([toolId, tool]) => (
              <ToolCard key={toolId} toolId={toolId} tool={tool} />
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                No verified tool information has been added for this operation.
              </Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;

  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function displayOperationText(value) {
  if (!value) return '';
  const text = String(value).trim();
  return /^PROC_[A-Z0-9_]+$/i.test(text) ? '' : text;
}

function deriveOverallStatus(toolEntries) {
  if (!toolEntries.length) return 'unknown';

  const statuses = toolEntries.map(([, tool]) => tool?.status);
  if (statuses.some((status) => status === 'supported')) return 'supported';

  if (
    statuses.some(
      (status) =>
        status === 'partially_supported' || status === 'conditional',
    )
  ) {
    return 'partially_supported';
  }

  if (statuses.every((status) => status === 'not_supported')) {
    return 'not_supported';
  }

  return 'unknown';
}

function formatEstimatedTime(value) {
  if (typeof value === 'number') return `${value} minutes`;

  const minimum = value?.minimum;
  const typical = value?.typical;
  const maximum = value?.maximum;

  if (minimum && maximum) return `${minimum}–${maximum} minutes`;
  if (typical) return `${typical} minutes`;
  if (minimum) return `From ${minimum} minutes`;
  if (maximum) return `Up to ${maximum} minutes`;
  return '';
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#253047',
    marginBottom: 14,
    overflow: 'hidden',
  },
  header: {
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: { flex: 1, paddingRight: 12 },
  title: { color: '#F8FAFC', fontSize: 18, fontWeight: '900' },
  summary: { color: '#94A3B8', marginTop: 4, lineHeight: 18 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chevron: { color: '#60A5FA', fontSize: 22, fontWeight: '900' },
  content: { paddingHorizontal: 16, paddingBottom: 16 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#253047',
  },
  infoLabel: { color: '#94A3B8', flex: 1 },
  infoValue: {
    color: '#F8FAFC',
    flex: 1,
    textAlign: 'right',
    fontWeight: '700',
  },
  warningBox: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#3B2F10',
    borderWidth: 1,
    borderColor: '#854D0E',
    padding: 12,
  },
  warningTitle: { color: '#FDE68A', fontWeight: '900', marginBottom: 6 },
  warningRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  warningBullet: { color: '#FBBF24', marginRight: 8, lineHeight: 20 },
  warningText: { color: '#FEF3C7', flex: 1, lineHeight: 20 },
  toolsTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 18,
    marginBottom: 10,
  },
  emptyBox: { borderRadius: 12, backgroundColor: '#0F172A', padding: 14 },
  emptyText: { color: '#94A3B8', lineHeight: 20 },
});
