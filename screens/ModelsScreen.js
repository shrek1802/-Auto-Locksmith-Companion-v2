import React, { useMemo } from 'react';
import { SafeAreaView, View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useDatabase } from '../context/DatabaseContext';

export default function ModelsScreen({ route, navigation }) {
  const { manufacturer } = route.params;
  const { byManufacturer } = useDatabase();
  const records = byManufacturer[manufacturer.id]?.vehicles || [];
  const grouped = useMemo(
    () => Object.values(records.reduce((acc, vehicle) => {
      const key = vehicle.vehicle.model;
      (acc[key] ??= []).push(vehicle);
      return acc;
    }, {})),
    [records],
  );

  return <SafeAreaView style={styles.safe}><FlatList
    data={grouped}
    keyExtractor={group => group[0].vehicle.model}
    contentContainerStyle={styles.list}
    ListHeaderComponent={<View style={styles.head}><Text style={styles.title}>{manufacturer.name}</Text><Text style={styles.sub}>Choose a model and year range</Text></View>}
    ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>No records saved</Text><Text style={styles.emptyText}>Use the database update button on the manufacturer screen.</Text></View>}
    renderItem={({ item: group }) => <View style={styles.group}><Text style={styles.model}>{group[0].vehicle.model}</Text>{group.sort((a, b) => a.vehicle.year_from - b.vehicle.year_from).map(record => <TouchableOpacity key={record.record_id} style={styles.range} onPress={() => navigation.navigate('Vehicle', { record })}><Text style={styles.rangeText}>{record.vehicle.year_from}–{record.vehicle.year_to}</Text><Text style={styles.arrow}>›</Text></TouchableOpacity>)}</View>}
  /></SafeAreaView>;
}
const styles = StyleSheet.create({safe:{flex:1,backgroundColor:'#0B1220'},list:{padding:16},head:{marginBottom:15},title:{color:'#F8FAFC',fontSize:26,fontWeight:'900'},sub:{color:'#94A3B8',marginTop:4},group:{backgroundColor:'#111827',borderWidth:1,borderColor:'#253047',borderRadius:15,marginBottom:12,overflow:'hidden'},model:{color:'#F8FAFC',fontSize:18,fontWeight:'900',padding:15,borderBottomWidth:1,borderBottomColor:'#253047'},range:{padding:15,flexDirection:'row',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#1F2937'},rangeText:{color:'#CBD5E1',fontWeight:'700'},arrow:{color:'#60A5FA',fontSize:22},empty:{padding:20,backgroundColor:'#111827',borderRadius:15},emptyTitle:{color:'#F8FAFC',fontWeight:'900',fontSize:17},emptyText:{color:'#94A3B8',marginTop:8,lineHeight:21}});
