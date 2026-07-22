import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMqb48KeyOptions, getMqb5dKeyOptions, loadKnowledgeEngine } from '../services/KnowledgeEngineService';

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

  const mqb48Keys = useMemo(() => getMqb48KeyOptions(engine), [engine]);
  const mqb5dKeys = useMemo(() => getMqb5dKeyOptions(engine), [engine]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Key Library</Text>
        <Text style={styles.subtitle}>Verified OEM and supported aftermarket key profiles, separated by platform.</Text>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color="#93C5FD" />
          <Text style={styles.infoText}>MQB48 / MQB 4.5 and MQB 5D are different systems. Keys are only shown under their verified platform.</Text>
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

        <SectionTitle title="MQB48 / MQB 4.5" subtitle="Workshop-verified key option" />
        {mqb48Keys.map((key) => <KeyCard key={key.id} keyProfile={key} platformLabel="MQB48 / MQB 4.5" />)}
        {!loading && !error && !mqb48Keys.length ? <Text style={styles.muted}>No verified MQB48 key profiles are currently available.</Text> : null}

        <SectionTitle title="MQB 5D" subtitle="Dedicated OEM or supported aftermarket keys" />
        {mqb5dKeys.map((key) => <KeyCard key={key.id} keyProfile={key} platformLabel="MQB 5D" />)}
        {!loading && !error && !mqb5dKeys.length ? <Text style={styles.muted}>No verified MQB 5D key profiles are currently available.</Text> : null}

        <Pressable style={styles.reloadButton} onPress={() => load(true)} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.reloadText}>Reload V3 key data</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ title, subtitle }) {
  return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionSubtitle}>{subtitle}</Text></View>;
}

function KeyCard({ keyProfile, platformLabel }) {
  return (
    <View style={styles.keyCard}>
      <View style={styles.keyHeader}>
        <View style={styles.keyIcon}><Ionicons name="key-outline" size={25} color="#BFDBFE" /></View>
        <View style={styles.keyHeaderText}>
          <Text style={styles.keyName}>{keyProfile.display_name || keyProfile.name || keyProfile.product || keyProfile.id}</Text>
          <Text style={styles.keyBrand}>{keyProfile.manufacturer || keyProfile.brand || 'OEM / supported aftermarket'}</Text>
        </View>
      </View>
      <View style={styles.pillRow}>
        <View style={styles.pill}><Text style={styles.pillText}>{platformLabel}</Text></View>
        <View style={styles.verifiedPill}><Text style={styles.verifiedText}>{formatConfidence(keyProfile.confidence)}</Text></View>
      </View>
      {keyProfile.frequency ? <Text style={styles.detail}>Frequency: {keyProfile.frequency}</Text> : null}
      {keyProfile.reference ? <Text style={styles.detail}>Reference: {keyProfile.reference}</Text> : null}
      {(keyProfile.conditions || []).map((condition) => <Text key={condition} style={styles.condition}>• {condition}</Text>)}
    </View>
  );
}

function formatConfidence(value) {
  return String(value || 'supported profile').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070D1A' },
  content: { padding: 18, paddingBottom: 38 },
  title: { color: '#F8FAFC', fontSize: 28, fontWeight: '900' },
  subtitle: { color: '#94A3B8', lineHeight: 20, marginTop: 5, marginBottom: 16 },
  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F1D38', borderWidth: 1, borderColor: '#1D4ED8', borderRadius: 15, padding: 13, marginBottom: 15 },
  infoText: { color: '#BFDBFE', flex: 1, lineHeight: 19, paddingLeft: 10 },
  loadingBox: { alignItems: 'center', paddingVertical: 34, gap: 12 },
  sectionHeader: { marginTop: 8, marginBottom: 10 },
  sectionTitle: { color: '#F8FAFC', fontSize: 20, fontWeight: '900' },
  sectionSubtitle: { color: '#94A3B8', marginTop: 3 },
  keyCard: { backgroundColor: '#111827', borderWidth: 1, borderColor: '#263247', borderRadius: 17, padding: 15, marginBottom: 12 },
  keyHeader: { flexDirection: 'row', alignItems: 'center' },
  keyIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: '#172554', alignItems: 'center', justifyContent: 'center' },
  keyHeaderText: { flex: 1, paddingLeft: 12 },
  keyName: { color: '#F8FAFC', fontSize: 16, fontWeight: '900' },
  keyBrand: { color: '#94A3B8', fontSize: 12.5, marginTop: 4 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 },
  pill: { backgroundColor: '#1E293B', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  pillText: { color: '#CBD5E1', fontSize: 11, fontWeight: '800' },
  verifiedPill: { backgroundColor: '#052E16', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  verifiedText: { color: '#86EFAC', fontSize: 11, fontWeight: '800' },
  detail: { color: '#CBD5E1', marginTop: 9, fontSize: 13 },
  condition: { color: '#94A3B8', marginTop: 7, lineHeight: 18 },
  muted: { color: '#94A3B8', textAlign: 'center', lineHeight: 20, marginBottom: 12 },
  errorCard: { backgroundColor: '#451A1A', borderWidth: 1, borderColor: '#991B1B', borderRadius: 14, padding: 14, marginBottom: 14 },
  errorText: { color: '#FECACA' },
  retry: { color: '#FCA5A5', fontWeight: '900', marginTop: 8 },
  reloadButton: { minHeight: 50, backgroundColor: '#2563EB', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  reloadText: { color: '#FFFFFF', fontWeight: '900' },
});
