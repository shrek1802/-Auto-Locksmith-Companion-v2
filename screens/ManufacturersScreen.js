import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { manufacturers } from '../data/manufacturers';
import BrandLogo from '../components/BrandLogo';
import { useDatabase } from '../context/DatabaseContext';

export default function ManufacturersScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const { byManufacturer, loading, updating, updateDatabase } = useDatabase();
  const data = useMemo(
    () => manufacturers.filter(x => x.name.toLowerCase().includes(search.toLowerCase())),
    [search],
  );

  const handleUpdate = async () => {
    try {
      const result = await updateDatabase();
      if (result.upToDate) {
        Alert.alert('Database', 'Database is already up to date.');
        return;
      }
      Alert.alert(
        'Database updated',
        `Updated manufacturers:\n\n${result.updatedBrands.join('\n')}`,
      );
    } catch (error) {
      Alert.alert('Update failed', error.message);
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.loading}><ActivityIndicator size="large" color="#60A5FA" /><Text style={styles.loadingText}>Loading saved database…</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <View><Text style={styles.title}>Locksmith Companion Pro</Text><Text style={styles.sub}>UK market • RHD only • Offline first</Text></View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleUpdate} disabled={updating} style={styles.settings} accessibilityLabel="Update database">
            {updating ? <ActivityIndicator color="#60A5FA" /> : <Ionicons name="cloud-download-outline" size={24} color="#E5E7EB" />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settings} accessibilityLabel="Settings">
            <Ionicons name="settings-outline" size={23} color="#E5E7EB" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.search}><Ionicons name="search" size={19} color="#64748B" /><TextInput value={search} onChangeText={setSearch} placeholder="Search manufacturer" placeholderTextColor="#64748B" style={styles.input} /></View>
      <FlatList
        data={data}
        keyExtractor={x => x.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => {
          const available = Boolean(byManufacturer[item.id]);
          return <TouchableOpacity style={[styles.card, !available && styles.unavailable]} disabled={!available} onPress={() => navigation.navigate('Models', { manufacturer: item })}>
            <BrandLogo {...item} />
            <Text style={styles.name}>{item.name}</Text>
            {!available && <Text style={styles.noData}>No data downloaded</Text>}
          </TouchableOpacity>;
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B1220' },
  loading: { flex: 1, backgroundColor: '#0B1220', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#94A3B8', marginTop: 12 },
  top: { padding: 18, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#F8FAFC', fontSize: 23, fontWeight: '900' },
  sub: { color: '#94A3B8', marginTop: 3 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  settings: { padding: 8 },
  search: { marginHorizontal: 16, backgroundColor: '#111827', borderWidth: 1, borderColor: '#253047', borderRadius: 13, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  input: { color: '#F8FAFC', paddingVertical: 12, flex: 1, marginLeft: 7 },
  grid: { padding: 12, paddingBottom: 30 },
  row: { gap: 10 },
  card: { flex: 1, backgroundColor: '#111827', borderWidth: 1, borderColor: '#253047', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 10, minHeight: 128, justifyContent: 'center' },
  unavailable: { opacity: 0.42 },
  name: { color: '#F8FAFC', fontWeight: '800', marginTop: 8, textAlign: 'center' },
  noData: { color: '#94A3B8', fontSize: 10, marginTop: 5 },
});
