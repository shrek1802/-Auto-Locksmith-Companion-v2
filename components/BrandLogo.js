import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, {
  Circle,
  G,
  Path,
  Rect,
} from 'react-native-svg';

const BRAND_COLOURS = {
  audi: '#BB0A30',
  bmw: '#1C69D4',
  citroen: '#D71920',
  cupra: '#C5A572',
  dacia: '#4F7F63',
  fiat: '#9D0B2F',
  ford: '#003478',
  honda: '#CC0000',
  hyundai: '#002C5F',
  jaguar: '#0E3C2C',
  jeep: '#6B6B3C',
  kia: '#D71920',
  landrover: '#005A2B',
  lexus: '#111111',
  mazda: '#1D4E89',
  mercedesbenz: '#111111',
  mini: '#111111',
  mitsubishi: '#E60012',
  nissan: '#C3002F',
  peugeot: '#1A3C7A',
  porsche: '#A43131',
  renault: '#F8D000',
  seat: '#D71920',
  skoda: '#4BA82E',
  subaru: '#003B8F',
  suzuki: '#E30613',
  tesla: '#CC0000',
  toyota: '#EB0A1E',
  vauxhall: '#D71920',
  volkswagen: '#001E50',
  volvo: '#003057',
};

export default function BrandLogo({
  brand,
  size = 54,
}) {
  const normalisedBrand = normaliseBrandName(brand);
  const colour =
    BRAND_COLOURS[normalisedBrand] ||
    '#2563EB';

  const initials = getInitials(brand);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
      >
        <Circle
          cx="50"
          cy="50"
          r="47"
          fill="#F8FAFC"
          stroke={colour}
          strokeWidth="6"
        />

        <G>
          <Rect
            x="19"
            y="36"
            width="62"
            height="28"
            rx="14"
            fill={colour}
          />

          <Path
            d="M30 50h40"
            stroke="#FFFFFF"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.35"
          />
        </G>
      </Svg>

      <View style={styles.initialsOverlay}>
        <Text
          style={[
            styles.initials,
            {
              fontSize: Math.max(12, size * 0.25),
            },
          ]}
        >
          {initials}
        </Text>
      </View>
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
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  initialsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.4,
  },
});
