import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MAIN_ACTIONS = [
  {
    id: 'start',
    title: 'Start Job',
    subtitle: 'Answer a few questions and get the recommended locksmith workflow.',
    icon: 'play-circle-outline',
    route: 'KnowledgeEngine',
    primary: true,
  },
  {
    id: 'vehicles',
    title: 'Vehicle Database',
    subtitle: 'Browse UK vehicles, key systems, modules, tools and procedures.',
    icon: 'car-sport-outline',
    route: 'Manufacturers',
  },
  {
    id: 'keys',
    title: 'Key Library',
    subtitle: 'Search OEM and supported aftermarket key profiles.',
    icon: 'key-outline',
    route: 'KeyLibrary',
  },
  {
    id: 'knowledge',
    title: 'Workshop Knowledge',
    subtitle: 'Verified methods, workarounds, warnings and evidence.',
    icon: 'shield-checkmark-outline',
    route: 'KnowledgeEngine',
  },
];

export default function DashboardScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>PRO LOCKS UK</Text>
            <Text style={styles.title}>Locksmith Knowledge Engine</Text>
            <Text style={styles.subtitle}>UK auto locksmith decision support</Text>
          </View>
          <Pressable style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={25} color="#F8FAFC" />
          </Pressable>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Ionicons name="sparkles-outline" size={23} color="#93C5FD" />
          </View>
          <View style={styles.statusText}>
            <Text style={styles.statusTitle}>V3 development build</Text>
            <Text style={styles.statusSubtitle}>MQB48 / MQB 4.5 decision workflow is ready to test.</Text>
          </View>
        </View>

        {MAIN_ACTIONS.map((action) => (
          <Pressable
            key={action.id}
            style={({ pressed }) => [
              styles.actionCard,
              action.primary && styles.primaryCard,
              pressed && styles.pressed,
            ]}
            onPress={() => navigation.navigate(action.route)}
          >
            <View style={[styles.actionIcon, action.primary && styles.primaryIcon]}>
              <Ionicons
                name={action.icon}
                size={30}
                color={action.primary ? '#FFFFFF' : '#93C5FD'}
              />
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionTitle, action.primary && styles.primaryTitle]}>{action.title}</Text>
              <Text style={[styles.actionSubtitle, action.primary && styles.primarySubtitle]}>{action.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={action.primary ? '#FFFFFF' : '#64748B'} />
          </Pressable>
        ))}

        <View style={styles.footerCard}>
          <Ionicons name="construct-outline" size={22} color="#FBBF24" />
          <View style={styles.footerText}>
            <Text style={styles.footerTitle}>Built for working auto locksmiths</Text>
            <Text style={styles.footerSubtitle}>Only verified UK/RHD information should be treated as confirmed.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070D1A' },
  content: { padding: 18, paddingTop: 24, paddingBottom: 38 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  headerText: { flex: 1, paddingRight: 12 },
  eyebrow: { color: '#60A5FA', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: '#F8FAFC', fontSize: 30, lineHeight: 35, fontWeight: '900', marginTop: 5 },
  subtitle: { color: '#94A3B8', fontSize: 15, marginTop: 7 },
  settingsButton: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#111827', borderWidth: 1, borderColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  statusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F1D38', borderWidth: 1, borderColor: '#1D4ED8', borderRadius: 17, padding: 14, marginBottom: 16 },
  statusIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#172554', alignItems: 'center', justifyContent: 'center' },
  statusText: { flex: 1, paddingLeft: 12 },
  statusTitle: { color: '#DBEAFE', fontWeight: '900', fontSize: 15 },
  statusSubtitle: { color: '#93C5FD', fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  actionCard: { minHeight: 102, flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderWidth: 1, borderColor: '#263247', borderRadius: 19, padding: 15, marginBottom: 12 },
  primaryCard: { minHeight: 118, backgroundColor: '#2563EB', borderColor: '#60A5FA' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  actionIcon: { width: 55, height: 55, borderRadius: 17, backgroundColor: '#172554', alignItems: 'center', justifyContent: 'center' },
  primaryIcon: { backgroundColor: 'rgba(255,255,255,0.16)' },
  actionText: { flex: 1, paddingHorizontal: 14 },
  actionTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '900' },
  primaryTitle: { color: '#FFFFFF', fontSize: 21 },
  actionSubtitle: { color: '#94A3B8', fontSize: 13, lineHeight: 18, marginTop: 5 },
  primarySubtitle: { color: '#DBEAFE' },
  footerCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#17150C', borderWidth: 1, borderColor: '#854D0E', borderRadius: 16, padding: 14, marginTop: 4 },
  footerText: { flex: 1, paddingLeft: 11 },
  footerTitle: { color: '#FDE68A', fontWeight: '900' },
  footerSubtitle: { color: '#D6B96B', fontSize: 12.5, lineHeight: 18, marginTop: 4 },
});
