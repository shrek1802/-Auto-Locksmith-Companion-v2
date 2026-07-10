import React from 'react'; import {View,Text,StyleSheet} from 'react-native';
export default function InfoRow({label,value}){if(value===undefined||value===null||value==='')return null;return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{String(value)}</Text></View>}
const styles=StyleSheet.create({row:{flexDirection:'row',justifyContent:'space-between',gap:16,paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#1F2937'},label:{color:'#94A3B8',fontWeight:'700',flex:1},value:{color:'#F8FAFC',fontWeight:'700',flex:1,textAlign:'right'}});
