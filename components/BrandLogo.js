import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { SvgXml,
  Path,
} from 'react-native-svg';
import {
  siAstonmartin, siAudi, siBentley, siBmw, siChrysler, siCitroen,
  siDacia, siDsautomobiles, siFerrari, siFiat, siFord, siHonda,
  siHyundai, siJeep, siKia, siLamborghini, siMaserati, siMazda,
  siMclaren, siMg, siMini, siMitsubishi, siNissan, siOpel,
  siPeugeot, siPolestar, siPorsche, siRenault, siRollsroyce,
  siSeat, siSkoda, siSmart, siSubaru, siSuzuki, siTesla,
  siToyota, siVauxhall, siVolkswagen, siVolvo,
} from 'simple-icons';

const { selectLogoSource } = require('../services/brandLogoCore');

const BRAND_ICONS = {
  astonmartin: siAstonmartin, audi: siAudi, bentley: siBentley, bmw: siBmw,
  chrysler: siChrysler, citroen: siCitroen, dacia: siDacia,
  ds: siDsautomobiles, dsautomobiles: siDsautomobiles, ferrari: siFerrari,
  fiat: siFiat, ford: siFord, honda: siHonda, hyundai: siHyundai,
  jeep: siJeep, kia: siKia, lamborghini: siLamborghini,
  maserati: siMaserati, mazda: siMazda, mclaren: siMclaren, mg: siMg,
  mini: siMini, mitsubishi: siMitsubishi, nissan: siNissan, opel: siOpel,
  peugeot: siPeugeot, polestar: siPolestar, porsche: siPorsche,
  renault: siRenault, rollsroyce: siRollsroyce, seat: siSeat,
  skoda: siSkoda, smart: siSmart, subaru: siSubaru, suzuki: siSuzuki,
  tesla: siTesla, toyota: siToyota, vauxhall: siVauxhall,
  volkswagen: siVolkswagen, volvo: siVolvo,
};

export default function BrandLogo({
  brand,
  downloadedLogo,
  size = 96,
}) {
  const brandId = normaliseBrandName(brand);
  const icon = BRAND_ICONS[brandId];
  const logoSource = selectLogoSource(downloadedLogo, icon);

  if (logoSource === 'downloaded') {
    return (
      <View style={[styles.tile, { width: size, height: size, borderRadius: Math.round(size * 0.23), backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }]}>
        <SvgXml xml={downloadedLogo} width={Math.round(size * 0.76)} height={Math.round(size * 0.76)} />
      </View>
    );
  }

  if (logoSource === 'bundled') {
    return (
      <View
        style={[
          styles.tile,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.23),
            backgroundColor: '#F8FAFC',
            borderColor: '#CBD5E1',
          },
        ]}
      >
        <View style={styles.topHighlight} />

        <CatalogueLogo
          icon={icon}
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

function CatalogueLogo({
  icon,
  width,
  height,
}) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      accessibilityLabel={`${icon.title} logo`}
    >
      <Path
        d={icon.path}
        fill={`#${icon.hex}`}
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
