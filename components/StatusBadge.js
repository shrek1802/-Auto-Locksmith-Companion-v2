import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

const STATUS_CONFIG = {
  supported: {
    label: 'Supported',
    backgroundColor: '#14532D',
    borderColor: '#166534',
    textColor: '#BBF7D0',
  },

  partially_supported: {
    label: 'Partially supported',
    backgroundColor: '#713F12',
    borderColor: '#92400E',
    textColor: '#FDE68A',
  },

  conditional: {
    label: 'Conditional',
    backgroundColor: '#7C2D12',
    borderColor: '#9A3412',
    textColor: '#FED7AA',
  },

  verification_required: {
    label: 'Verify first',
    backgroundColor: '#3B2F10',
    borderColor: '#854D0E',
    textColor: '#FDE68A',
  },

  not_supported: {
    label: 'Not supported',
    backgroundColor: '#450A0A',
    borderColor: '#7F1D1D',
    textColor: '#FECACA',
  },

  unknown: {
    label: 'Unknown',
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    textColor: '#CBD5E1',
  },

  untested: {
    label: 'Untested',
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    textColor: '#CBD5E1',
  },
};

export default function StatusBadge({
  status = 'unknown',
  compact = false,
}) {
  const config =
    STATUS_CONFIG[status] ||
    STATUS_CONFIG.unknown;

  return (
    <View
      style={[
        styles.badge,
        compact && styles.badgeCompact,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          compact && styles.textCompact,
          {
            color: config.textColor,
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  badgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  text: {
    fontSize: 12,
    fontWeight: '900',
  },

  textCompact: {
    fontSize: 11,
  },
});