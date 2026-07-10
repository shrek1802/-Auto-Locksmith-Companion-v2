import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as SimpleIcons from 'simple-icons';

export default function BrandLogo({ iconKey, name, size = 54 }) {
  const icon = SimpleIcons[iconKey];
  if (!icon?.path) {
    const initials = name.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase();
    return <View style={[styles.fallback,{width:size,height:size,borderRadius:size/2}]}><Text style={styles.initials}>{initials}</Text></View>;
  }
  return (
    <View style={[styles.wrap,{width:size,height:size}]}>
      <Svg width={size * 0.78} height={size * 0.78} viewBox="0 0 24 24" accessibilityLabel={`${name} logo`}>
        <Path d={icon.path} fill="#E5E7EB" />
      </Svg>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap:{alignItems:'center',justifyContent:'center'},
  fallback:{backgroundColor:'#1F2937',alignItems:'center',justifyContent:'center'},
  initials:{color:'#F9FAFB',fontSize:18,fontWeight:'800'}
});
