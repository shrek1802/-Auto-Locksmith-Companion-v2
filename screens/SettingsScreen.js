import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { masterData } from '../data';
import { useDatabase } from '../context/DatabaseContext';
import { applyAppUpdate, checkForAppUpdate } from '../services/AppUpdateService';

const DEFAULT = ['autel_im508s_xp400_pro', 'keydiy_kd_x4', 'xhorse_key_tool_plus'];

export default function SettingsScreen() {
  const [owned, setOwned] = useState(DEFAULT);
  const [checkingApp, setCheckingApp] = useState(false);
  const { resetDatabase } = useDatabase();

  useEffect(() => {
    AsyncStorage.getItem('ownedTools')
      .then(value => value && setOwned(JSON.parse(value)))
      .catch(() => {});
  }, []);

  const toggle = async id => {
    const next = owned.includes(id) ? owned.filter(x => x !== id) : [...owned, id];
    setOwned(next);
    await AsyncStorage.setItem('ownedTools', JSON.stringify(next));
  };

  const handleAppUpdate = async () => {
    setCheckingApp(true);
    try {
      const result = await checkForAppUpdate();
      if (!result.available) {
        Alert.alert('App update', result.message);
        return;
      }
      Alert.alert('App update ready', result.message, [
        { text: 'Later', style: 'cancel' },
        { text: 'Restart now', onPress: applyAppUpdate },
      ]);
    } catch (error) {
      Alert.alert('App update failed', error.message);
    } finally {
      setCheckingApp(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>My tools</Text>
        <Text style={styles.sub}>Only selected tools appear when “Show only my tools” is enabled.</Text>
        {Object.values(masterData.tools).map(tool => {
          const selected = owned.includes(tool.id);
          return <TouchableOpacity key={tool.id} style={styles.row} onPress={() => toggle(tool.id)}>
            <View><Text style={styles.name}>{tool.name}</Text><Text style={styles.make}>{tool.manufacturer}</Text></View>
            <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={26} color={selected ? '#22C55E' : '#64748B'} />
          </TouchableOpacity>;
        })}

        <Text style={styles.section}>App</Text>
        <TouchableOpacity style={styles.actionButton} onPress={handleAppUpdate} disabled={checkingApp}>
          {checkingApp ? <ActivityIndicator color="#60A5FA" /> : <Ionicons name="phone-portrait-outline" size={22} color="#60A5FA" />}
          <Text style={styles.actionText}>Check for app update</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reset}
          onPress={() => Alert.alert(
            'Reset database',
            'Replace downloaded data with the bundled starter database?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Reset', style: 'destructive', onPress: resetDatabase },
            ],
          )}
        >
          <Text style={styles.resetText}>Reset downloaded database</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B1220' },
  content: { padding: 16 },
  title: { color: '#F8FAFC', fontSize: 26, fontWeight: '900' },
  sub: { color: '#94A3B8', marginTop: 5, marginBottom: 16, lineHeight: 20 },
  row: { backgroundColor: '#111827', borderWidth: 1, borderColor: '#253047', borderRadius: 13, padding: 14, marginBottom: 9, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: '#F8FAFC', fontWeight: '800' },
  make: { color: '#94A3B8', marginTop: 3, fontSize: 12 },
  section: { color: '#F8FAFC', fontSize: 19, fontWeight: '900', marginTop: 22, marginBottom: 10 },
  actionButton: { backgroundColor: '#111827', borderWidth: 1, borderColor: '#253047', borderRadius: 13, padding: 14, flexDirection: 'row', alignItems: 'center' },
  actionText: { color: '#F8FAFC', fontWeight: '800', marginLeft: 10 },
  reset: { marginTop: 12, borderWidth: 1, borderColor: '#7F1D1D', backgroundColor: '#2A1114', padding: 14, borderRadius: 13, alignItems: 'center' },
  resetText: { color: '#FCA5A5', fontWeight: '800' },
});
