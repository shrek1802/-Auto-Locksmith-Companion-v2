import React,{useEffect,useState} from 'react';
import {SafeAreaView,ScrollView,View,Text,StyleSheet,Switch} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OperationSection from '../components/OperationSection'; import InfoRow from '../components/InfoRow'; import {masterData} from '../data';
const DEFAULT_TOOLS=['autel_im508s_xp400_pro','keydiy_kd_x4','xhorse_key_tool_plus'];
export default function VehicleScreen({route}){
 const {record}=route.params; const [owned,setOwned]=useState(DEFAULT_TOOLS); const [only,setOnly]=useState(true);
 useEffect(()=>{(async()=>{try{const a=await AsyncStorage.getItem('ownedTools');const b=await AsyncStorage.getItem('showOnlyOwned');if(a)setOwned(JSON.parse(a));if(b!==null)setOnly(b==='true')}catch{}})()},[]);
 const v=record.vehicle, info=record.vehicle_information||{};
 return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
  <Text style={styles.title}>{v.make} {v.model}</Text><Text style={styles.years}>{v.year_from}–{v.year_to} • UK • RHD</Text>
  <View style={styles.panel}><Text style={styles.panelTitle}>Vehicle information</Text><InfoRow label="Immobiliser" value={info.immobiliser_system}/><InfoRow label="Transponder" value={info.transponder_type}/><InfoRow label="Frequency" value={info.frequency_mhz?`${info.frequency_mhz} MHz`:''}/><InfoRow label="Blade" value={info.blade_profile}/><InfoRow label="Key type" value={info.key_type}/>{info.notes?<Text style={styles.note}>{info.notes}</Text>:null}</View>
  <View style={styles.filter}><View><Text style={styles.filterTitle}>Show only my tools</Text><Text style={styles.filterSub}>{owned.length} selected in Settings</Text></View><Switch value={only} onValueChange={setOnly}/></View>
  {Object.values(record.operations||{}).map(op=><OperationSection key={op.display_name} operation={op} masterData={masterData} ownedToolIds={owned} showOnlyOwned={only}/>) }
  <View style={styles.verify}><Text style={styles.verifyTitle}>Verification</Text><Text style={styles.verifyText}>Status: {record.verification?.status||'unknown'}</Text><Text style={styles.verifyText}>{record.verification?.notes}</Text></View>
 </ScrollView></SafeAreaView>
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#0B1220'},content:{padding:16,paddingBottom:40},title:{color:'#F8FAFC',fontSize:27,fontWeight:'900'},years:{color:'#60A5FA',fontWeight:'800',marginTop:3,marginBottom:16},panel:{backgroundColor:'#111827',borderWidth:1,borderColor:'#253047',borderRadius:15,padding:15,marginBottom:12},panelTitle:{color:'#F8FAFC',fontSize:18,fontWeight:'900',marginBottom:4},note:{color:'#CBD5E1',lineHeight:21,marginTop:12},filter:{backgroundColor:'#111827',borderWidth:1,borderColor:'#253047',borderRadius:14,padding:14,marginBottom:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},filterTitle:{color:'#F8FAFC',fontWeight:'900'},filterSub:{color:'#94A3B8',marginTop:3,fontSize:12},verify:{backgroundColor:'#111827',borderRadius:14,padding:14,borderWidth:1,borderColor:'#253047'},verifyTitle:{color:'#F8FAFC',fontWeight:'900'},verifyText:{color:'#94A3B8',marginTop:6,lineHeight:20}});
