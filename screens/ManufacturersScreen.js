import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import BrandLogo from '../components/BrandLogo';
import { useDatabase } from '../context/DatabaseContext';

export default function ManufacturersScreen({
  navigation,
}) {
  const {
    byManufacturer,
    loading,
    updating,
    updateProgress,
    error,
    updateDatabase,
    clearError,
  } = useDatabase();

  const [search, setSearch] = useState('');

  const manufacturers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return Object.entries(byManufacturer || {})
      .map(([manufacturerId, manufacturerData]) => {
        const records = Array.isArray(
          manufacturerData?.records,
        )
          ? manufacturerData.records
          : [];

        const modelNames = new Set(
          records
            .map((record) =>
              String(
                record?.vehicle?.model ||
                  record?.vehicle?.model_name ||
                  '',
              ).trim(),
            )
            .filter(Boolean),
        );

        return {
          id: manufacturerId,
          name:
            manufacturerData?.manufacturer?.name ||
            manufacturerData?.name ||
            manufacturerId,
          recordCount: manufacturerData?.recordCount ?? records.length,
          modelCount: manufacturerData?.modelCount ?? modelNames.size,
          logo: manufacturerData?.logo || null,
        };
      })
      .filter((manufacturer) =>
        manufacturer.name
          .toLowerCase()
          .includes(query),
      )
      .sort((first, second) =>
        first.name.localeCompare(second.name),
      );
  }, [byManufacturer, search]);

  async function handleDatabaseUpdate() {
    clearError?.();

    try {
      const result = await updateDatabase();

      if (result.upToDate) {
        Alert.alert(
          'Database',
          'The database is already up to date.',
        );
        return;
      }

      Alert.alert(
        'Database updated',
        [
          `Version: ${result.databaseVersion || 'Current'}`,
          `Manufacturers: ${result.summary?.manufacturers ?? manufacturers.length}`,
          `Models: ${result.summary?.models ?? '—'}`,
          `Vehicle records: ${result.summary?.vehicle_records ?? '—'}`,
          `Package: ${formatMegabytes(result.packageSize)}`,
        ].join('\n'),
      );
    } catch (updateError) {
      Alert.alert(
        'Update failed',
        updateError?.message ||
          'The database update could not be completed.',
      );
    }
  }

  function openManufacturer(item) {
    navigation.navigate('Models', {
      manufacturer: item,
      manufacturerData:
        byManufacturer[item.id],
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color="#60A5FA"
          />
          <Text style={styles.loadingText}>
            Loading saved database…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            Locksmith Companion Pro
          </Text>

          <Text style={styles.subtitle}>
            UK vehicle key information
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.settingsButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() =>
            navigation.navigate('Settings')
          }
          accessibilityLabel="Open settings"
        >
          <Ionicons
            name="settings-outline"
            size={24}
            color="#F8FAFC"
          />
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.updateButton,
          updating && styles.disabledButton,
          pressed &&
            !updating &&
            styles.buttonPressed,
        ]}
        disabled={updating}
        onPress={handleDatabaseUpdate}
      >
        <View style={styles.updateContent}>
          {updating ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Ionicons
              name="cloud-download-outline"
              size={23}
              color="#FFFFFF"
            />
          )}

          <Text style={styles.updateButtonText}>
            {updating
              ? updateProgress?.stage || 'Checking for updates…'
              : 'Check database updates'}
          </Text>
        </View>
      </Pressable>

      {updating && updateProgress?.stage === 'Downloading database' ? (
        <View style={styles.progressBox}>
          <Text style={styles.progressText}>
            {formatMegabytes(updateProgress.downloadedBytes)} / {formatMegabytes(updateProgress.totalBytes)}{' '}
            ({updateProgress.percentage || 0}%)
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(0, Math.min(100, updateProgress.percentage || 0))}%` },
              ]}
            />
          </View>
        </View>
      ) : null}

      {error ? (
        <Pressable
          style={styles.errorBox}
          onPress={clearError}
        >
          <Text style={styles.errorText}>
            {error}
          </Text>

          <Text style={styles.errorDismiss}>
            Tap to dismiss
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.searchBox}>
        <Ionicons
          name="search-outline"
          size={21}
          color="#64748B"
        />

        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search manufacturers"
          placeholderTextColor="#64748B"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {search.length > 0 ? (
          <Pressable
            onPress={() => setSearch('')}
            hitSlop={10}
          >
            <Ionicons
              name="close-circle"
              size={22}
              color="#64748B"
            />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={manufacturers}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="car-sport-outline"
              size={52}
              color="#475569"
            />

            <Text style={styles.emptyTitle}>
              No manufacturers found
            </Text>

            <Text style={styles.emptyText}>
              Add manufacturer data or try
              another search.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.manufacturerCard,
              pressed && styles.cardPressed,
            ]}
            onPress={() =>
              openManufacturer(item)
            }
          >
            <BrandLogo
              brand={item.name}
              downloadedLogo={item.logo}
              size={96}
            />

            <Text
              style={styles.manufacturerName}
              numberOfLines={1}
            >
              {item.name}
            </Text>

            <View style={styles.countPill}>
              <Text style={styles.countText}>
                {item.modelCount > 0
                  ? `${item.modelCount} ${
                      item.modelCount === 1
                        ? 'model'
                        : 'models'
                    }`
                  : `${item.recordCount} ${
                      item.recordCount === 1
                        ? 'record'
                        : 'records'
                    }`}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function formatMegabytes(bytes) {
  return `${((Number(bytes) || 0) / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  header: {
    minHeight: 78,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 15,
    marginTop: 3,
  },
  settingsButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  updateButton: {
    minHeight: 56,
    marginHorizontal: 18,
    marginBottom: 15,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  updateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  progressBox: {
    marginHorizontal: 18,
    marginTop: -5,
    marginBottom: 15,
  },
  progressText: {
    color: '#CBD5E1',
    fontSize: 13,
    marginBottom: 6,
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#334155',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#60A5FA',
  },
  disabledButton: {
    opacity: 0.65,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  errorBox: {
    marginHorizontal: 18,
    marginBottom: 14,
    padding: 14,
    borderRadius: 13,
    backgroundColor: '#451A1A',
    borderWidth: 1,
    borderColor: '#991B1B',
  },
  errorText: {
    color: '#FECACA',
    fontSize: 15,
    fontWeight: '700',
  },
  errorDismiss: {
    color: '#FCA5A5',
    marginTop: 5,
  },
  searchBox: {
    minHeight: 52,
    marginHorizontal: 18,
    marginBottom: 14,
    paddingHorizontal: 14,
    borderRadius: 15,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#253047',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  listContent: {
    paddingHorizontal: 13,
    paddingBottom: 34,
  },
  columnWrapper: {
    gap: 10,
  },
  manufacturerCard: {
    flex: 1,
    aspectRatio: 1,
    margin: 5,
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 21,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#283449',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  cardPressed: {
    opacity: 0.82,
    transform: [
      {
        scale: 0.975,
      },
    ],
  },
  manufacturerName: {
    width: '100%',
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 12,
  },
  countPill: {
    minHeight: 27,
    marginTop: 8,
    paddingHorizontal: 11,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyState: {
    paddingTop: 72,
    paddingHorizontal: 34,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 15,
  },
  emptyText: {
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
  },
});
