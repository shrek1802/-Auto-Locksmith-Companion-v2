import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Circle,
  Line,
  Path,
  Rect,
} from 'react-native-svg';

export default function AutomotiveIcon({
  name,
  size = 46,
  color = '#BFDBFE',
}) {
  if (name === 'obd') {
    return (
      <ObdConnectorIcon
        size={size}
        color={color}
      />
    );
  }

  if (name === 'chip') {
    return (
      <MicrochipIcon
        size={size}
        color={color}
      />
    );
  }

  if (name === 'modules') {
    return (
      <EcuModuleIcon
        size={size}
        color={color}
      />
    );
  }

  const ioniconName = {
    key: 'key-outline',
    programming: 'construct-outline',
    tools: 'briefcase-outline',
    photos: 'camera-outline',
    notes: 'document-text-outline',
    warning: 'warning-outline',
  }[name] || 'information-circle-outline';

  return (
    <Ionicons
      name={ioniconName}
      size={size}
      color={color}
    />
  );
}

function ObdConnectorIcon({
  size,
  color,
}) {
  const pinXs = [
    14,
    20,
    26,
    32,
    38,
    44,
    50,
    56,
  ];

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 70 70"
      accessibilityLabel="16-pin OBD-II connector"
    >
      <Path
        d="M13 18H57L63 28V52C63 56.4 59.4 60 55 60H15C10.6 60 7 56.4 7 52V28L13 18Z"
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinejoin="round"
      />

      <Path
        d="M14 27H56L59 32V49C59 52.3 56.3 55 53 55H17C13.7 55 11 52.3 11 49V32L14 27Z"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        opacity="0.7"
      />

      {pinXs.map((x) => (
        <Rect
          key={`top-${x}`}
          x={x - 1.6}
          y="34"
          width="3.2"
          height="4.3"
          rx="1"
          fill={color}
        />
      ))}

      {pinXs.map((x) => (
        <Rect
          key={`bottom-${x}`}
          x={x - 1.6}
          y="44"
          width="3.2"
          height="4.3"
          rx="1"
          fill={color}
        />
      ))}
    </Svg>
  );
}

function MicrochipIcon({
  size,
  color,
}) {
  const pins = [
    18,
    27,
    36,
    45,
    54,
  ];

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      accessibilityLabel="EEPROM microchip"
    >
      <Rect
        x="19"
        y="19"
        width="34"
        height="34"
        rx="5"
        fill="none"
        stroke={color}
        strokeWidth="4"
      />

      <Rect
        x="27"
        y="27"
        width="18"
        height="18"
        rx="3"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        opacity="0.75"
      />

      <Circle
        cx="25"
        cy="25"
        r="2"
        fill={color}
      />

      {pins.map((position) => (
        <React.Fragment key={`pin-${position}`}>
          <Line
            x1={position}
            y1="10"
            x2={position}
            y2="18"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <Line
            x1={position}
            y1="54"
            x2={position}
            y2="62"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <Line
            x1="10"
            y1={position}
            x2="18"
            y2={position}
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <Line
            x1="54"
            y1={position}
            x2="62"
            y2={position}
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
          />
        </React.Fragment>
      ))}
    </Svg>
  );
}


function EcuModuleIcon({
  size,
  color,
}) {
  const sidePins = [18, 27, 36, 45, 54];

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      accessibilityLabel="Vehicle ECU control module"
    >
      <Rect
        x="18"
        y="18"
        width="36"
        height="36"
        rx="5"
        fill="none"
        stroke={color}
        strokeWidth="4"
      />
      <Rect
        x="25"
        y="25"
        width="22"
        height="22"
        rx="3"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        opacity="0.8"
      />
      {sidePins.map((position) => (
        <React.Fragment key={`ecu-${position}`}>
          <Line x1="10" y1={position} x2="18" y2={position} stroke={color} strokeWidth="4" strokeLinecap="round" />
          <Line x1="54" y1={position} x2="62" y2={position} stroke={color} strokeWidth="4" strokeLinecap="round" />
        </React.Fragment>
      ))}
      <Circle cx="30" cy="36" r="2.2" fill={color} />
      <Circle cx="36" cy="36" r="2.2" fill={color} />
      <Circle cx="42" cy="36" r="2.2" fill={color} />
    </Svg>
  );
          }
          
