import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { siFord } from 'simple-icons/icons';

const BRAND_CONFIG = {
  ford: {
    icon: siFord,
    backgroundColor: '#003478',
    logoColor: '#FFFFFF',
  },
};

export default function BrandLogo({
  brand,
  size = 96,
}) {
  const brandId = normaliseBrandName(brand);
  const config = BRAND_CONFIG[brandId];
  const iconSize = Math.round(size * 0.7);

  if (!config?.icon?.path) {
    return (
      <View
        style={[
          styles.tile,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.23),
            backgroundColor: '#1D4ED8',
          },
        ]}
      >
        <Text
          style={[
            styles.initials,
            {
              fontSize: Math.round(size * 0.28),
            },
          ]}
        >
          {getInitials(brand)}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.23),
          backgroundColor: config.backgroundColor,
        },
      ]}
    >
      <View style={styles.topHighlight} />

      <Svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        accessibilityLabel={`${brand} logo`}
      >
        <Path
          d={config.icon.path}
          fill={config.logoColor}
        />
      </Svg>
    </View>
  );
}

function normaliseBrandName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function getInitials(value) {
  const words = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return '?';
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
}

const styles = StyleSheet.create({
  tile: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  topHighlight: {
    position: 'absolute',
    top: 5,
    left: 7,
    right: 7,
    height: '42%',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
