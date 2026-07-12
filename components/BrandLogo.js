import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, {
  Ellipse,
  Path,
  Text as SvgText,
} from 'react-native-svg';

const BRAND_CONFIG = {
  ford: {
    backgroundColor: '#0B2E63',
    borderColor: '#4A90E2',
  },
};

export default function BrandLogo({
  brand,
  size = 96,
}) {
  const brandId = normaliseBrandName(brand);
  const config = BRAND_CONFIG[brandId];

  if (brandId === 'ford') {
    return (
      <View
        style={[
          styles.tile,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.23),
            backgroundColor:
              config.backgroundColor,
            borderColor:
              config.borderColor,
          },
        ]}
      >
        <View style={styles.topHighlight} />

        <FordLogo
          width={Math.round(size * 0.76)}
          height={Math.round(size * 0.48)}
        />
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
          backgroundColor: '#1D4ED8',
          borderColor:
            'rgba(255,255,255,0.16)',
        },
      ]}
    >
      <View style={styles.topHighlight} />

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

function FordLogo({
  width,
  height,
}) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 220 100"
      accessibilityLabel="Ford logo"
    >
      <Ellipse
        cx="110"
        cy="50"
        rx="103"
        ry="43"
        fill="#0057A8"
        stroke="#FFFFFF"
        strokeWidth="7"
      />

      <Ellipse
        cx="110"
        cy="50"
        rx="92"
        ry="34"
        fill="none"
        stroke="rgba(255,255,255,0.34)"
        strokeWidth="2"
      />

      <SvgText
        x="110"
        y="61"
        fill="#FFFFFF"
        fontSize="39"
        fontWeight="700"
        fontStyle="italic"
        textAnchor="middle"
        letterSpacing="-1"
      >
        Ford
      </SvgText>

      <Path
        d="M61 67 C82 75, 139 75, 161 66"
        fill="none"
        stroke="rgba(255,255,255,0.42)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </Svg>
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
    return words[0]
      .slice(0, 2)
      .toUpperCase();
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
    backgroundColor:
      'rgba(255,255,255,0.07)',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
