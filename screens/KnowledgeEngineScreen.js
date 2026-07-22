import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { buildMqb45Decision, getMqb5dKeyOptions, loadKnowledgeEngine } from '../services/KnowledgeEngineService';

const DASHBOARDS = [
  { id: 'analogue_or_mono_v850_nec', label: 'Analogue / mono V850-NEC' },
  { id: 'virtual_cockpit_active_info_display', label: 'Virtual Cockpit / Active Info Display' },
];

export default function KnowledgeEngineScreen() {
  const [engine, setEngine] = useState(null);
  const [dashboard, setDashboard] = useState(DASHBOARDS[0].id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(force = false) {
    setLoading(true);
    setError('');
    try {
      setEngine(await loadKnowledgeEngine({ force }));
    } catch (loadError) {
      setError(loadError?.message || 'The Knowledge Engine could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const decision = useMemo(() => buildMqb45Decision(engine, dashboard), [engine, dashboard]);
  const keyOptions = useMemo(() => getMqb5dKeyOptions(engine), [engine]);

  if (loading && !engine) {
    return <SafeAreaView style={styles.safe}><View style={styles.centre}><ActivityIndicator size="large" color="#60A5FA" /><Text style={styles.muted}>Loading Locksmith Knowledge Engine…</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Knowledge Engine V3</Text>
        <Text style={styles.subtitle}>Live pilot using the database repository</Text>

        {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => load(true)}><Text style={styles.retry}>Retry</Text></Pressable></View> : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>MQB48 / MQB 4.5</Text>
          <Text style={styles.label}>Which dashboard type is fitted?</Text>
          {DASHBOARDS.map((item) => (
            <Pressable key={item.id} style={[styles.option, dashboard === item.id && styles.optionSelected]} onPress={() => setDashboard(item.id)}>
              <Text style={[styles.optionText, dashboard === item.id && styles.optionTextSelected]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {decision ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recommended IMMO route</Text>
            <Row label="Preferred" value={formatMethod(decision.preferredMethod)} />
            <Row label="Available" value={decision.availableMethods.map(formatMethod).join(' · ')} />
            {decision.excludedMethods.length ? <Row label="Not supported" value={decision.excludedMethods.map(formatMethod).join(' · ')} /> : null}
            <View style={styles.whyBox}><Text style={styles.whyTitle}>Why?</Text><Text style={styles.whyText}>{decision.why}</Text></View>
            <Text style={styles.confidence}>Evidence: {formatMethod(decision.confidence)}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>MQB 5D key options</Text>
          <Text style={styles.muted}>Only dedicated supported keys are shown.</Text>
          {keyOptions.map((key) => (
            <View key={key.id} style={styles.keyRow}>
              <Text style={styles.keyName}>{key.display_name || key.name || key.product || key.id}</Text>
              <Text style={styles.keyMeta}>{key.manufacturer || key.brand || 'OEM / supported aftermarket'}</Text>
            </View>
          ))}
          {!keyOptions.length ? <Text style={styles.muted}>No key profiles loaded.</Text> : null}
        </View>

        <Pressable style={styles.refresh} onPress={() => load(true)} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.refreshText}>Reload live V3 data</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>;
}

function formatMethod(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B1220' },
  content: { padding: 16, paddingBottom: 36 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { color: '#F8FAFC', fontSize: 26, fontWeight: '900' },
  subtitle: { color: '#94A3B8', marginTop: 4, marginBottom: 16 },
  card: { backgroundColor: '#111827', borderWidth: 1, borderColor: '#253047', borderRadius: 16, padding: 16, marginBottom: 14 },
  cardTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '900', marginBottom: 12 },
  label: { color: '#CBD5E1', marginBottom: 10 },
  option: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0F172A', justifyContent: 'center', paddingHorizontal: 13, marginBottom: 9 },
  optionSelected: { borderColor: '#2563EB', backgroundColor: '#10213F' },
  optionText: { color: '#CBD5E1', fontWeight: '700' },
  optionTextSelected: { color: '#BFDBFE' },
  row: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#334155', paddingVertical: 11, gap: 15 },
  rowLabel: { color: '#94A3B8', flex: 1 },
  rowValue: { color: '#F8FAFC', flex: 2, textAlign: 'right', fontWeight: '700' },
  whyBox: { marginTop: 10, borderRadius: 12, backgroundColor: '#172554', borderWidth: 1, borderColor: '#1D4ED8', padding: 13 },
  whyTitle: { color: '#93C5FD', fontWeight: '900', marginBottom: 5 },
  whyText: { color: '#DBEAFE', lineHeight: 20 },
  confidence: { color: '#94A3B8', fontSize: 12, marginTop: 10 },
  keyRow: { paddingVertical: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#334155' },
  keyName: { color: '#F8FAFC', fontWeight: '800' },
  keyMeta: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  muted: { color: '#94A3B8', lineHeight: 20 },
  error: { backgroundColor: '#451A1A', borderColor: '#991B1B', borderWidth: 1, borderRadius: 13, padding: 14, marginBottom: 14 },
  errorText: { color: '#FECACA' },
  retry: { color: '#FCA5A5', fontWeight: '900', marginTop: 8 },
  refresh: { minHeight: 50, borderRadius: 13, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  refreshText: { color: '#FFFFFF', fontWeight: '900' },
});
