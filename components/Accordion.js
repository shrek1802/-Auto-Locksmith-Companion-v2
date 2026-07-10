import React,{useState} from 'react';
import {View,Text,TouchableOpacity,StyleSheet,LayoutAnimation} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
export default function Accordion({title,right,children,initialOpen=false,level=0}){
 const [open,setOpen]=useState(initialOpen);
 const toggle=()=>{LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);setOpen(v=>!v)};
 return <View style={[styles.card,level===1&&styles.inner]}>
  <TouchableOpacity onPress={toggle} style={styles.header} activeOpacity={0.75}>
   <Text style={[styles.title,level===1&&styles.innerTitle]}>{title}</Text>
   <View style={styles.right}>{right}<Ionicons name={open?'chevron-up':'chevron-down'} size={20} color="#CBD5E1"/></View>
  </TouchableOpacity>
  {open?<View style={styles.body}>{children}</View>:null}
 </View>
}
const styles=StyleSheet.create({card:{backgroundColor:'#111827',borderRadius:14,marginBottom:12,borderWidth:1,borderColor:'#253047',overflow:'hidden'},inner:{backgroundColor:'#0F172A',marginBottom:8},header:{minHeight:56,paddingHorizontal:15,paddingVertical:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},title:{color:'#F8FAFC',fontSize:17,fontWeight:'800',flex:1},innerTitle:{fontSize:15},right:{flexDirection:'row',gap:9,alignItems:'center'},body:{padding:15,paddingTop:2,borderTopWidth:1,borderTopColor:'#253047'}});
