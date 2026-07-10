import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import BrandLogo from '../components/BrandLogo';
import { useDatabase } from '../context/DatabaseContext';

export default function ManufacturersScreen({ navigation }) {
  const {
    byManufacturer,
    loading,
    updating,
    error,
    updateDatabase,
    clearError,
  } = useDatabase();

  const [search, setSearch] = useState('');

  const manufacturers = useMemo(() => {
    const items = Object.entries(byManufacturer || {}).map(
      ([manufacturerId, manufacturerData]) => ({
        id: manufacturerId,
        name:
          manufacturerData?.manufacturer?.name ||
          manufacturerData?.name ||
          manufacturerId,
        recordCount: Array.isArray(manufacturerData?.records)
          ? manufacturerData.records.length
          : 0,
      })
    );

    const query = search.trim().toLowerCase();

    return items
      .filter((item) => item.name.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [byManufacturer, search]);

  async function handleDatabaseUpdate() {
    clearError();

    try {
      const result = await updateDatabase();

      if (result.upToDate) {
        Alert.alert('Database update', 'The database is already up to date.');
        return;
      }

      Alert.alert(
        'Database updated',
        result.updatedBrands.length
          ? `Updated manufacturers:\n\n${result.updatedBrands.join('\n')}`
          : 'The database was updated successfully.'
      );
    } catch (updateError) {
      Alert.alert(
        'Update failed',
        updateError?.message || 'The database update could not be completed.'
      );
    }
  }

  function openManufacturer(item) {
    navigation.navigate('Models', {
      manufacturer: item,
      manufacturerData: byManufacturer[item.id],
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading vehicle database...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Locksmith Companion Pro</Text>
          <Text style={styles.subtitle}>UK vehicle key information</Text>
        </View>

        <Pressable
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.settingsButtonText}>Settings</Text>
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.updateButton, updating && styles.disabledButton]}
          onPress={handleDatabaseUpdate}
          disabled={updating}
        >
          {updating ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.updateButtonText}>Check database updates</Text>
          )}
        </Pressable>
      </View>

      {error ? (
        <Pressable style={styles.errorBox} onPress={clearError}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorDismiss}>Tap to dismiss</Text>
        </Pressable>
      ) : null}

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search manufacturer"
        placeholderTextColor="#64748B"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.searchInput}
      />

      <FlatList
        data={manufacturers}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.column}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No manufacturers found</Text>
            <Text style={styles.emptyText}>
              Add manufacturer JSON files to the database or try another search.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
            onPress={() => openManufacturer(item)}
          >
            <BrandLogo brand={item.name} size={54} />

            <Text style={styles.cardTitle}>{item.name}</Text>

            <Text style={styles.cardMeta}>
              {item.recordCount} vehicle
              {item.recordCount === 1 ? '' : 's'}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: '#94A3B8',
    marginTop: 3,
  },
  settingsButton: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  settingsButtonText: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  actions: {
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  updateButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.65,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  errorBox: {
    marginHorizontal: 18,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#451A1A',
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  errorText: {
    color: '#FECACA',
    fontWeight: '700',
  },
  errorDismiss: {
    color: '#FCA5A5',
    marginTop: 4,
    fontSize: 12,
  },
  searchInput: {
    marginHorizontal: 18,
    marginBottom: 14,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#253047',
    color: '#F8FAFC',
    paddingHorizontal: 14,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  column: {
    gap: 10,
  },
  card: {
    flex: 1,
    minHeight: 140,
    margin: 5,
    borderRadius: 16,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#253047',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  cardPressed: {
    opacity: 0.75,
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
  },
  cardMeta: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 5,
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 7,
    lineHeight: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#CBD5E1',
    marginTop: 12,
  },
});
