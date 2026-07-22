import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { buildMqb45JobWorkflow, loadKnowledgeEngine } from '../services/KnowledgeEngineService';

const JOB_TYPES = [
  { id: 'add_key', label: 'Add Key' },
  { id: 'all_keys_lost', label: 'All Keys Lost' },
];

const DASHBOARDS = [
  { id: 'analogue_or_mono_v850_nec', label: 'Analogue / mono V850-NEC' },
  { id: 'virtual_cockpit_active_info_display', label: 'Virtual Cockpit / Active Info Display' },
];

const TOOLS = [
  { id: 'autel_im508s', label: 'Autel IM508S' },
  { id: 'other_tool', label: 'Another tool' },
];

export default function KnowledgeEngineScreen() {
  const [engine, setEngine] = useState(null);
  const [jobType, setJobType] = useState('add_key');
  const [workingKeyAvailable, setWorkingKeyAvailable] = useState(true);
  const [dashboardType, setDashboardType] = useState(DASHBOARDS[0].id);
  const [toolId, setToolId] = useState('autel_im508s');
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

  const result = useMemo(() => buildMqb45JobWorkflow(engine, {
    jobType,
    workingKeyAvailable,
    dashboardType,
    toolId,
  }), [engine, jobType, workingKeyAvailable, dashboardType, toolId]);

  if (loading && !engine) {
    return <SafeAreaView style={styles.safe}><View style={styles.centre}><ActivityIndicator size="large" color="#60A5FA" /><Text style={styles.muted}>Loading Locksmith Knowledge Engine…</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Start MQB48 Job</Text>
        <Text style={styles.subtitle}>Guided UK auto-locksmith workflow using verified workshop evidence</Text>

        {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => load(true)}><Text style={styles.retry}>Retry</Text></Pressable></View> : null}

        <QuestionCard title="1. What job are you doing?" options={JOB_TYPES} selected={jobType} onSelect={setJobType} />

        {jobType === 'add_key' ? (
          <QuestionCard
            title="2. Is a working key available?"
            options={[{ id: true, label: 'Yes' }, { id: false, label: 'No' }]}
            selected={workingKeyAvailable}
            onSelect={setWorkingKeyAvailable}
          />
        ) : null}

        <QuestionCard title="3. Which dashboard is fitted?" options={DASHBOARDS} selected={dashboardType} onSelect={setDashboardType} />
        <QuestionCard title="4. Which tool will you use?" options={TOOLS} selected={toolId} onSelect={setToolId} />

        {result ? (
          <View style={[styles.resultCard, result.status !== 'recommended' && styles.resultWarning]}>
            <Text style={styles.resultTitle}>{result.title}</Text>
            <Text style={styles.confidence}>Evidence: {formatText(result.confidence)}</Text>

            {result.preferredMethod ? <Row label="Preferred IMMO route" value={formatText(result.preferredMethod)} /> : null}
            {result.availableMethods?.length ? <Row label="Available routes" value={result.availableMethods.map(formatText).join(' · ')} /> : null}
            {result.excludedMethods?.length ? <Row label="Not supported" value={result.excludedMethods.map(formatText).join(' · ')} /> : null}

            <View style={styles.whyBox}>
              <Text style={styles.whyTitle}>Why this result?</Text>
              <Text style={styles.whyText}>{result.why}</Text>
            </View>

            {result.keys?.length ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Verified key option</Text>
                {result.keys.map((key) => (
                  <View key={key.id} style={styles.keyBox}>
                    <Text style={styles.keyName}>{key.product || key.id}</Text>
                    <Text style={styles.keyMeta}>{key.manufacturer} · {key.frequency || 'Frequency not recorded'}</Text>
                    {key.reference ? <Text style={styles.keyMeta}>Reference: {key.reference}</Text> : null}
                  </View>
                ))}
              </View>
            ) : null}

            {result.steps?.length ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Workshop sequence</Text>
                {result.steps.map((step) => (
                  <View key={step.id} style={styles.stepRow}>
                    <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{step.number}</Text></View>
                    <View style={styles.stepTextBox}>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                      <Text style={styles.stepRisk}>Risk: {formatText(step.risk || 'unknown')}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {result.warnings?.length ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>Warnings</Text>
                {result.warnings.map((warning) => <Text key={warning} style={styles.warningText}>• {warning}</Text>)}
              </View>
            ) : null}
          </View>
        ) : null}

        <Pressable style={styles.refresh} onPress={() => load(true)} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.refreshText}>Reload live workflow data</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuestionCard({ title, options, selected, onSelect }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {options.map((item) => (
        <Pressable key={String(item.id)} style={[styles.option, selected === item.id && styles.optionSelected]} onPress={() => onSelect(item.id)}>
          <Text style={[styles.optionText, selected === item.id && styles.optionTextSelected]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Row({ label, value }) {
  return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>;
}

function formatText(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#070D1A' },
  content: { padding: 16, paddingBottom: 40 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { color: '#F8FAFC', fontSize: 28, fontWeight: '900' },
  subtitle: { color: '#94A3B8', marginTop: 5, marginBottom: 16, lineHeight: 20 },
  card: { backgroundColor: '#111827', borderWidth: 1, borderColor: '#253047', borderRadius: 16, padding: 16, marginBottom: 14 },
  cardTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '900', marginBottom: 11 },
  option: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0F172A', justifyContent: 'center', paddingHorizontal: 13, marginBottom: 9 },
  optionSelected: { borderColor: '#2563EB', backgroundColor: '#10213F' },
  optionText: { color: '#CBD5E1', fontWeight: '700' },
  optionTextSelected: { color: '#BFDBFE' },
  resultCard: { backgroundColor: '#0B1F18', borderWidth: 1, borderColor: '#166534', borderRadius: 18, padding: 16, marginBottom: 14 },
  resultWarning: { backgroundColor: '#2A1A0B', borderColor: '#92400E' },
  resultTitle: { color: '#F8FAFC', fontSize: 20, fontWeight: '900' },
  confidence: { color: '#94A3B8', fontSize: 12, marginTop: 5, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#334155', paddingVertical: 11, gap: 15 },
  rowLabel: { color: '#94A3B8', flex: 1 },
  rowValue: { color: '#F8FAFC', flex: 2, textAlign: 'right', fontWeight: '700' },
  whyBox: { marginTop: 10, borderRadius: 12, backgroundColor: '#172554', borderWidth: 1, borderColor: '#1D4ED8', padding: 13 },
  whyTitle: { color: '#93C5FD', fontWeight: '900', marginBottom: 5 },
  whyText: { color: '#DBEAFE', lineHeight: 20 },
  sectionBlock: { marginTop: 16 },
  sectionTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '900', marginBottom: 9 },
  keyBox: { backgroundColor: '#111827', borderWidth: 1, borderColor: '#334155', borderRadius: 12, padding: 12 },
  keyName: { color: '#F8FAFC', fontWeight: '900' },
  keyMeta: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  stepNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  stepNumberText: { color: '#FFFFFF', fontWeight: '900' },
  stepTextBox: { flex: 1, backgroundColor: '#111827', borderRadius: 11, borderWidth: 1, borderColor: '#334155', padding: 10 },
  stepTitle: { color: '#F8FAFC', fontWeight: '800' },
  stepRisk: { color: '#94A3B8', fontSize: 11, marginTop: 4 },
  warningBox: { marginTop: 15, backgroundColor: '#451A03', borderWidth: 1, borderColor: '#B45309', borderRadius: 12, padding: 13 },
  warningTitle: { color: '#FCD34D', fontWeight: '900', marginBottom: 7 },
  warningText: { color: '#FEF3C7', lineHeight: 20, marginBottom: 4 },
  muted: { color: '#94A3B8', lineHeight: 20 },
  error: { backgroundColor: '#451A1A', borderColor: '#991B1B', borderWidth: 1, borderRadius: 13, padding: 14, marginBottom: 14 },
  errorText: { color: '#FECACA' },
  retry: { color: '#FCA5A5', fontWeight: '900', marginTop: 8 },
  refresh: { minHeight: 50, borderRadius: 13, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  refreshText: { color: '#FFFFFF', fontWeight: '900' },
});
