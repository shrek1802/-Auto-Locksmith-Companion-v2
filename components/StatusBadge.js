import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
const MAP = {
  supported:{label:'Supported',bg:'#DCFCE7',fg:'#166534'},
  partially_supported:{label:'Partially supported',bg:'#FEF3C7',fg:'#92400E'},
  conditional:{label:'Conditional',bg:'#FEF3C7',fg:'#92400E'},
  not_supported:{label:'Not compatible',bg:'#FEE2E2',fg:'#991B1B'},
  unknown:{label:'Unknown',bg:'#E5E7EB',fg:'#374151'},
  untested:{label:'Untested',bg:'#E5E7EB',fg:'#374151'}
};
export default function StatusBadge({status='unknown'}) {
  const x = MAP[status] ?? MAP.unknown;
  return <View style={[styles.badge,{backgroundColor:x.bg}]}><Text style={[styles.text,{color:x.fg}]}>{x.label}</Text></View>;
}
const styles=StyleSheet.create({badge:{paddingHorizontal:9,paddingVertical:4,borderRadius:999},text:{fontWeight:'800',fontSize:12}});
