import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMqb5dKeyOptions, loadKnowledgeEngine } from '../services/KnowledgeEngineService';

export default function KeyLibraryScreen() {
  const [engine, setEngine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(force = false) {
    setLoading(true);
    setError('');
    try {
      setEngine(await loadKnowledgeEngine({ force }));
    } catch (loadError) {
      setError(loadError?.message || 'The key library could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const keys = useMemo(() => getMqb5dKeyOptions(engine), [engine]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Key Library</Text>
        <Text style={styles.subtitle}>Verified OEM and supported aftermarket key profiles</Text>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color="#93C5FD" />
          <Text style={styles.infoText}>This first library contains the MQB 5D key profiles from the V3 Knowledge Engine.</Text>
        </View>

        {loading && !engine ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#60A5FA" />
            <Text style={styles.muted}>Loading key profiles…</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => load(true)}><Text style={styles.retry}>Retry</Text></Pressable>
          </View>
        ) : null}

        {keys.map((key) => (
          <View key={key.id} style={styles.keyCard}>
            <View style={styles.keyHeader}>
              <View style={styles.keyIcon}><Ionicons name="key-outline" size={25} color="#BFDBFE" /></View>
              <View style={styles.keyHeaderText}>
                <Text style={styles.keyName}>{key.display_name || key.name || key.product || key.id}</Text>
                <Text style={styles.keyBrand}>{key.manufacturer || key.brand || 'OEM / supported aftermarket'}</Text>
              </View>
            </View>
            <View style={styles.pillRow}>
              <View style={styles.pill}><Text style={styles.pillText}>MQB 5D</Text></View>
              <View style={styles.verifiedPill}><Text style={styles.verifiedText}>Supported profile</Text></View>
            </View>
          </View>
        ))}

        {!loading && !error && !keys.length ? <Text style={styles.muted}>No key profiles are currently available.</Text> : null}

        <Pressable style={styles.reloadButton} onPress={() => load(true)} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.reloadText}>Reload V3 key data</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070D1A' },
  content: { padding: 18, paddingBottom: 38 },
  title: { color: '#F8FAFC', fontSize: 28, fontWeight: '900' },
  subtitle: { color: '#94A3B8', lineHeight: 20, marginTop: 5, marginBottom: 16 },
  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F1D38', borderWidth: 1, borderColor: '#1D4ED8', borderRadius: 15, padding: 13, marginBottom: 15 },
  infoText: { color: '#BFDBFE', flex: 1, lineHeight: 19, paddingLeft: 10 },
  loadingBox: { alignItems: 'center', paddingVertical: 34, gap: 12 },
  keyCard: { backgroundColor: '#111827', borderWidth: 1, borderColor: '#263247', borderRadius: 17, padding: 15, marginBottom: 12 },
  keyHeader: { flexDirection: 'row', alignItems: 'center' },
  keyIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: '#172554', alignItems: 'center', justifyContent: 'center' },
  keyHeaderText: { flex: 1, paddingLeft: 12 },
  keyName: { color: '#F8FAFC', fontSize: 16, fontWeight: '900' },
  keyBrand: { color: '#94A3B8', fontSize: 12.5, marginTop: 4 },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 13 },
  pill: { backgroundColor: '#1E293B', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  pillText: { color: '#CBD5E1', fontSize: 11, fontWeight: '800' },
  verifiedPill: { backgroundColor: '#052E16', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  verifiedText: { color: '#86EFAC', fontSize: 11, fontWeight: '800' },
  muted: { color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
  errorCard: { backgroundColor: '#451A1A', borderWidth: 1, borderColor: '#991B1B', borderRadius: 14, padding: 14, marginBottom: 14 },
  errorText: { color: '#FECACA' },
  retry: { color: '#FCA5A5', fontWeight: '900', marginTop: 8 },
  reloadButton: { minHeight: 50, backgroundColor: '#2563EB', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  reloadText: { color: '#FFFFFF', fontWeight: '900' },
});
