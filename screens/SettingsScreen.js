import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useDatabase } from '../context/DatabaseContext';
import {
  checkForAppUpdate,
  openLatestAppRelease,
} from '../services/AppUpdateService';

const OWNED_TOOLS_STORAGE_KEY = '@locksmith_companion_owned_tools';
const SHOW_ONLY_OWNED_STORAGE_KEY = '@locksmith_companion_show_only_owned';

const AVAILABLE_TOOLS = [
  {
    id: 'autel_im508s_xp400_pro',
    name: 'Autel IM508S + XP400 Pro',
  },
  {
    id: 'autel_im608_pro',
    name: 'Autel IM608 Pro',
  },
  {
    id: 'keydiy_kd_x4',
    name: 'KEYDIY KD-X4',
  },
  {
    id: 'xhorse_key_tool_plus',
    name: 'Xhorse Key Tool Plus',
  },
  {
    id: 'xhorse_vvdi2',
    name: 'Xhorse VVDI2',
  },
  {
    id: 'obdstar',
    name: 'OBDSTAR',
  },
  {
    id: 'xtool',
    name: 'Xtool',
  },
  {
    id: 'lonsdor',
    name: 'Lonsdor',
  },
];

export default function SettingsScreen() {
  const {
    resetDatabase,
    loading,
    updating,
  } = useDatabase();

  const [ownedTools, setOwnedTools] = useState([]);
  const [showOnlyOwnedTools, setShowOnlyOwnedTools] = useState(false);
  const [checkingAppUpdate, setCheckingAppUpdate] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const selectedToolCount = useMemo(
    () => ownedTools.length,
    [ownedTools]
  );

  async function loadSettings() {
    try {
      const [storedTools, storedShowOnlyOwned] = await Promise.all([
        AsyncStorage.getItem(OWNED_TOOLS_STORAGE_KEY),
        AsyncStorage.getItem(SHOW_ONLY_OWNED_STORAGE_KEY),
      ]);

      if (storedTools) {
        const parsedTools = JSON.parse(storedTools);

        if (Array.isArray(parsedTools)) {
          setOwnedTools(parsedTools);
        }
      }

      if (storedShowOnlyOwned !== null) {
        setShowOnlyOwnedTools(storedShowOnlyOwned === 'true');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async function saveOwnedTools(nextOwnedTools) {
    setOwnedTools(nextOwnedTools);
    setSaving(true);

    try {
      await AsyncStorage.setItem(
        OWNED_TOOLS_STORAGE_KEY,
        JSON.stringify(nextOwnedTools)
      );
    } catch (error) {
      console.error('Failed to save owned tools:', error);

      Alert.alert(
        'Settings error',
        'Your tool selection could not be saved.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleOwnedTool(toolId) {
    const nextOwnedTools = ownedTools.includes(toolId)
      ? ownedTools.filter((id) => id !== toolId)
      : [...ownedTools, toolId];

    await saveOwnedTools(nextOwnedTools);
  }

  async function handleShowOnlyOwnedChange(value) {
    setShowOnlyOwnedTools(value);

    try {
      await AsyncStorage.setItem(
        SHOW_ONLY_OWNED_STORAGE_KEY,
        String(value)
      );
    } catch (error) {
      console.error('Failed to save tool filter setting:', error);

      Alert.alert(
        'Settings error',
        'The tool filter setting could not be saved.'
      );
    }
  }

  async function handleDatabaseReset() {
    Alert.alert(
      'Reset local database',
      'This will replace the downloaded vehicle database with the bundled version included in the app.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset database',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetDatabase();

              Alert.alert(
                'Database reset',
                'The bundled database has been restored.'
              );
            } catch (error) {
              Alert.alert(
                'Reset failed',
                error?.message ||
                  'The local database could not be reset.'
              );
            }
          },
        },
      ]
    );
  }

  async function handleAppUpdateCheck() {
    setCheckingAppUpdate(true);

    try {
      const result = await checkForAppUpdate();

      if (!result?.updateAvailable) {
        Alert.alert(
          'App update',
          'You already have the latest app version.'
        );
        return;
      }

      Alert.alert(
        'App update available',
        result.latestVersion
          ? `Version ${result.latestVersion} is available.`
          : 'A newer version is available.',
        [
          {
            text: 'Later',
            style: 'cancel',
          },
          {
            text: 'Open release',
            onPress: openLatestAppRelease,
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Update check failed',
        error?.message ||
          'The app update could not be checked.'
      );
    } finally {
      setCheckingAppUpdate(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Tools</Text>

          <Text style={styles.sectionDescription}>
            Select the programmers you own. The vehicle page can then prioritise
            your tools.
          </Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Selected tools</Text>
            <Text style={styles.summaryValue}>{selectedToolCount}</Text>
          </View>

          {AVAILABLE_TOOLS.map((tool) => {
            const selected = ownedTools.includes(tool.id);

            return (
              <Pressable
                key={tool.id}
                style={[
                  styles.toolRow,
                  selected && styles.toolRowSelected,
                ]}
                onPress={() => toggleOwnedTool(tool.id)}
              >
                <View style={styles.toolText}>
                  <Text style={styles.toolName}>{tool.name}</Text>
                  <Text style={styles.toolStatus}>
                    {selected ? 'Owned' : 'Not selected'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.checkbox,
                    selected && styles.checkboxSelected,
                  ]}
                >
                  <Text style={styles.checkboxText}>
                    {selected ? '✓' : ''}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          {saving ? (
            <View style={styles.savingRow}>
              <ActivityIndicator size="small" />
              <Text style={styles.savingText}>Saving tool settings...</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tool Display</Text>

          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.switchTitle}>Show only my tools</Text>
              <Text style={styles.switchDescription}>
                Hide tools you have not selected.
              </Text>
            </View>

            <Switch
              value={showOnlyOwnedTools}
              onValueChange={handleShowOnlyOwnedChange}
              trackColor={{
                false: '#334155',
                true: '#2563EB',
              }}
              thumbColor="#F8FAFC"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Database</Text>

          <Text style={styles.sectionDescription}>
            Vehicle records are stored locally and only changed manufacturers
            are downloaded during updates.
          </Text>

          <Pressable
            style={[
              styles.secondaryButton,
              (loading || updating) && styles.disabledButton,
            ]}
            onPress={handleDatabaseReset}
            disabled={loading || updating}
          >
            <Text style={styles.secondaryButtonText}>
              Reset to bundled database
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Updates</Text>

          <Text style={styles.sectionDescription}>
            Check GitHub releases for a newer APK version.
          </Text>

          <Pressable
            style={[
              styles.primaryButton,
              checkingAppUpdate && styles.disabledButton,
            ]}
            onPress={handleAppUpdateCheck}
            disabled={checkingAppUpdate}
          >
            {checkingAppUpdate ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.primaryButtonText}>
                Check for app update
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>
            Locksmith Companion Pro V2
          </Text>

          <Text style={styles.footerText}>
            UK market · RHD vehicle information
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  section: {
    borderRadius: 16,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#253047',
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
  },
  sectionDescription: {
    color: '#94A3B8',
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    color: '#94A3B8',
  },
  summaryValue: {
    color: '#F8FAFC',
    fontWeight: '900',
  },
  toolRow: {
    minHeight: 62,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#253047',
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolRowSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#10213F',
  },
  toolText: {
    flex: 1,
    paddingRight: 12,
  },
  toolName: {
    color: '#F8FAFC',
    fontWeight: '800',
  },
  toolStatus: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkboxText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  savingText: {
    color: '#94A3B8',
    marginLeft: 8,
  },
  switchRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchText: {
    flex: 1,
    paddingRight: 15,
  },
  switchTitle: {
    color: '#F8FAFC',
    fontWeight: '800',
  },
  switchDescription: {
    color: '#94A3B8',
    marginTop: 4,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#F8FAFC',
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.6,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 10,
  },
  footerTitle: {
    color: '#CBD5E1',
    fontWeight: '800',
  },
  footerText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
  },
});
