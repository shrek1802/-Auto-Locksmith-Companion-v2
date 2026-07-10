import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import StatusBadge from './StatusBadge';

export default function ToolCard({ toolId, tool }) {
  const [open, setOpen] = useState(false);

  const status = tool?.status || 'unknown';
  const displayName =
    tool?.display_name ||
    formatToolName(toolId);

  const connectionText = getConnectionText(tool);
  const accessoryText = getAccessoryText(tool);
  const estimatedTime = formatEstimatedTime(tool?.estimated_minutes);

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.header}
        onPress={() => setOpen((current) => !current)}
      >
        <View style={styles.headerText}>
          <Text style={styles.toolName}>{displayName}</Text>

          {tool?.summary ? (
            <Text style={styles.summary} numberOfLines={2}>
              {tool.summary}
            </Text>
          ) : null}
        </View>

        <View style={styles.headerRight}>
          <StatusBadge status={status} compact />
          <Text style={styles.chevron}>{open ? '⌃' : '⌄'}</Text>
        </View>
      </Pressable>

      {open ? (
        <View style={styles.content}>
          {status === 'not_supported' ? (
            <View style={styles.unsupportedBox}>
              <Text style={styles.unsupportedTitle}>Not supported</Text>

              <Text style={styles.unsupportedText}>
                {tool?.reason ||
                  'This tool is not compatible with this operation.'}
              </Text>
            </View>
          ) : (
            <>
              <InfoRow
                label="Method"
                value={formatMethod(tool?.method)}
              />

              {tool?.internet_required !== undefined ? (
                <InfoRow
                  label="Internet"
                  value={tool.internet_required ? 'Required' : 'Not required'}
                />
              ) : null}

              {tool?.working_key_required !== undefined ? (
                <InfoRow
                  label="Working key"
                  value={tool.working_key_required ? 'Required' : 'Not required'}
                />
              ) : null}

              {tool?.vehicle_required !== undefined ? (
                <InfoRow
                  label="Vehicle required"
                  value={tool.vehicle_required ? 'Yes' : 'No'}
                />
              ) : null}

              {tool?.module_removal_required !== undefined ? (
                <InfoRow
                  label="Module removal"
                  value={tool.module_removal_required ? 'Required' : 'Not required'}
                />
              ) : null}

              {tool?.eeprom_required !== undefined ? (
                <InfoRow
                  label="EEPROM work"
                  value={tool.eeprom_required ? 'Required' : 'Not required'}
                />
              ) : null}

              <InfoRow
                label="Vehicle connection"
                value={connectionText}
              />

              <InfoRow
                label="Tool accessories"
                value={accessoryText}
              />

              {tool?.online_requirement_ids?.length ? (
                <InfoRow
                  label="Online requirements"
                  value={tool.online_requirement_ids.join(', ')}
                />
              ) : (
                <InfoRow
                  label="Online requirements"
                  value="Not needed"
                />
              )}

              {estimatedTime ? (
                <InfoRow
                  label="Estimated time"
                  value={estimatedTime}
                />
              ) : null}

              {tool?.procedure_summary ? (
                <View style={styles.textBox}>
                  <Text style={styles.textBoxTitle}>Procedure</Text>
                  <Text style={styles.textBoxText}>
                    {tool.procedure_summary}
                  </Text>
                </View>
              ) : null}

              {tool?.warnings?.length ? (
                <View style={styles.warningBox}>
                  <Text style={styles.warningTitle}>Warnings</Text>

                  {tool.warnings.map((warning, index) => (
                    <View
                      key={`tool-warning-${index}`}
                      style={styles.warningRow}
                    >
                      <Text style={styles.warningBullet}>•</Text>
                      <Text style={styles.warningText}>{warning}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {tool?.notes ? (
                <View style={styles.textBox}>
                  <Text style={styles.textBoxTitle}>Notes</Text>
                  <Text style={styles.textBoxText}>{tool.notes}</Text>
                </View>
              ) : null}
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

function InfoRow({ label, value }) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{String(value)}</Text>
    </View>
  );
}

function getConnectionText(tool) {
  const connection = tool?.vehicle_connection;

  if (connection?.required === false) {
    return connection.display_text || 'Not needed';
  }

  if (connection?.required === true) {
    if (connection.display_text) {
      return connection.display_text;
    }

    if (connection.adapter_ids?.length) {
      return connection.adapter_ids.join(', ');
    }

    return 'Required';
  }

  if (tool?.vehicle_connection_ids?.length) {
    return tool.vehicle_connection_ids.join(', ');
  }

  return 'Not needed';
}

function getAccessoryText(tool) {
  if (tool?.tool_accessory_ids?.length) {
    return tool.tool_accessory_ids.join(', ');
  }

  return 'Not needed';
}

function formatMethod(value) {
  if (!value) {
    return '';
  }

  const labels = {
    obd: 'OBD',
    bench: 'Bench',
    boot: 'Boot mode',
    eeprom: 'EEPROM',
    service_mode: 'Service mode',
    transponder_clone: 'Transponder clone',
    module_clone: 'Module clone',
    manual_remote_learning: 'Manual remote learning',
  };

  return labels[value] || value;
}

function formatToolName(toolId) {
  return String(toolId || '')
    .split('_')
    .map((part) => {
      const upperCaseNames = {
        im508s: 'IM508S',
        im608: 'IM608',
        kd: 'KD',
        x4: 'X4',
        obdstar: 'OBDSTAR',
        xtool: 'Xtool',
        vvdi2: 'VVDI2',
      };

      return (
        upperCaseNames[part.toLowerCase()] ||
        part.charAt(0).toUpperCase() + part.slice(1)
      );
    })
    .join(' ');
}

function formatEstimatedTime(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'number') {
    return `${value} minutes`;
  }

  const minimum = value.minimum;
  const typical = value.typical;
  const maximum = value.maximum;

  if (minimum && maximum) {
    return `${minimum}–${maximum} minutes`;
  }

  if (typical) {
    return `${typical} minutes`;
  }

  if (minimum) {
    return `From ${minimum} minutes`;
  }

  if (maximum) {
    return `Up to ${maximum} minutes`;
  }

  return '';
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 13,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#253047',
    marginBottom: 10,
    overflow: 'hidden',
  },
  header: {
    minHeight: 62,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    paddingRight: 10,
  },
  toolName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '900',
  },
  summary: {
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 17,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chevron: {
    color: '#60A5FA',
    fontSize: 20,
    fontWeight: '900',
  },
  content: {
    paddingHorizontal: 13,
    paddingBottom: 13,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#253047',
  },
  infoLabel: {
    color: '#94A3B8',
    flex: 1,
  },
  infoValue: {
    color: '#F8FAFC',
    flex: 1.2,
    textAlign: 'right',
    fontWeight: '700',
  },
  unsupportedBox: {
    borderRadius: 11,
    backgroundColor: '#3F1515',
    borderWidth: 1,
    borderColor: '#7F1D1D',
    padding: 12,
  },
  unsupportedTitle: {
    color: '#FCA5A5',
    fontWeight: '900',
  },
  unsupportedText: {
    color: '#FECACA',
    lineHeight: 20,
    marginTop: 5,
  },
  textBox: {
    marginTop: 12,
    borderRadius: 11,
    backgroundColor: '#111827',
    padding: 12,
  },
  textBoxTitle: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  textBoxText: {
    color: '#CBD5E1',
    lineHeight: 20,
    marginTop: 6,
  },
  warningBox: {
    marginTop: 12,
    borderRadius: 11,
    backgroundColor: '#3B2F10',
    borderWidth: 1,
    borderColor: '#854D0E',
    padding: 12,
  },
  warningTitle: {
    color: '#FDE68A',
    fontWeight: '900',
    marginBottom: 6,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  warningBullet: {
    color: '#FBBF24',
    marginRight: 8,
    lineHeight: 20,
  },
  warningText: {
    color: '#FEF3C7',
    flex: 1,
    lineHeight: 20,
  },
});
