import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ModelsScreen({ route, navigation }) {
  const { manufacturer, manufacturerData } = route.params || {};
  const [search, setSearch] = useState('');

  const records = Array.isArray(manufacturerData?.records)
    ? manufacturerData.records
    : [];

  const modelFamilies = useMemo(() => {
    const query = search.trim().toLowerCase();
    const grouped = new Map();

    records.forEach((record, index) => {
      const vehicle = record?.vehicle || {};
      const familyName = getModelFamily(vehicle);
      const key = normaliseFamilyKey(familyName);

      if (!grouped.has(key)) {
        grouped.set(key, {
          id: key || `model_family_${index}`,
          familyName,
          records: [],
          yearFrom: null,
          yearTo: null,
        });
      }

      const family = grouped.get(key);
      family.records.push(record);

      const yearFrom = toYear(vehicle.year_from);
      const yearTo = toYear(vehicle.year_to);

      if (yearFrom !== null) {
        family.yearFrom = family.yearFrom === null
          ? yearFrom
          : Math.min(family.yearFrom, yearFrom);
      }

      if (yearTo !== null) {
        family.yearTo = family.yearTo === null
          ? yearTo
          : Math.max(family.yearTo, yearTo);
      }
    });

    return Array.from(grouped.values())
      .map((family) => ({
        ...family,
        yearText: formatFamilyYearRange(family),
      }))
      .filter((family) => {
        if (!query) return true;

        return [family.familyName, family.yearText]
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((first, second) =>
        first.familyName.localeCompare(second.familyName),
      );
  }, [records, search]);

  function openFamily(family) {
    navigation.navigate('ModelFamily', {
      manufacturer,
      familyName: family.familyName,
      records: family.records,
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {manufacturer?.name ||
            manufacturerData?.manufacturer?.name ||
            'Models'}
        </Text>
        <Text style={styles.subtitle}>Select a model family</Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={21} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search model families"
          placeholderTextColor="#64748B"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch('')} hitSlop={10}>
            <Ionicons name="close-circle" size={22} color="#64748B" />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={modelFamilies}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="car-sport-outline" size={52} color="#475569" />
            <Text style={styles.emptyTitle}>No model families found</Text>
            <Text style={styles.emptyText}>
              There are no matching vehicle records for this manufacturer.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.modelCard,
              pressed && styles.modelCardPressed,
            ]}
            onPress={() => openFamily(item)}
          >
            <View style={styles.vehicleIconContainer}>
              <View style={styles.vehicleIconHighlight} />
              <Ionicons name="car-sport" size={42} color="#BFDBFE" />
            </View>

            <Text style={styles.modelName} numberOfLines={2}>
              {item.familyName}
            </Text>
            <Text style={styles.yearRange} numberOfLines={1}>
              {item.yearText}
            </Text>
            <Text style={styles.generationCount} numberOfLines={1}>
              {item.records.length} {item.records.length === 1 ? 'generation' : 'generations'}
            </Text>

            <View style={styles.openPill}>
              <Text style={styles.openPillText}>Open</Text>
              <Ionicons name="chevron-forward" size={15} color="#93C5FD" />
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function getModelFamily(vehicle = {}) {
  const explicitFamily =
    vehicle.model_family ||
    vehicle.family ||
    vehicle.base_model;

  if (hasText(explicitFamily)) return String(explicitFamily).trim();

  const modelName = String(
    vehicle.model || vehicle.model_name || 'Unknown model',
  ).trim();
  const generation = String(
    vehicle.generation || vehicle.variant || '',
  ).trim();

  if (generation) {
    const escapedGeneration = escapeRegExp(generation);
    const withoutGeneration = modelName
      .replace(new RegExp(`\\s*[-–—(]*${escapedGeneration}[)]*\\s*$`, 'i'), '')
      .trim();

    if (withoutGeneration) return withoutGeneration;
  }

  return modelName;
}

function normaliseFamilyKey(value) {
  return String(value || 'unknown-model')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function formatFamilyYearRange(family) {
  if (family.yearFrom && family.yearTo) {
    return `${family.yearFrom}–${family.yearTo}`;
  }
  if (family.yearFrom && !family.yearTo) return `${family.yearFrom} onwards`;
  if (!family.yearFrom && family.yearTo) return `Up to ${family.yearTo}`;
  return 'Year range unknown';
}

function toYear(value) {
  const year = Number.parseInt(value, 10);
  return Number.isFinite(year) && year > 1900 ? year : null;
}

function hasText(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B1220' },
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
  },
  title: { color: '#F8FAFC', fontSize: 25, fontWeight: '900' },
  subtitle: { color: '#94A3B8', fontSize: 15, marginTop: 4 },
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
  listContent: { paddingHorizontal: 12, paddingBottom: 34 },
  columnWrapper: { gap: 10, alignItems: 'stretch' },
  modelCard: {
    flex: 1,
    minHeight: 222,
    marginVertical: 5,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
    borderRadius: 19,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#283449',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  modelCardPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  vehicleIconContainer: {
    width: 82,
    height: 62,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#172554',
    borderWidth: 1,
    borderColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleIconHighlight: {
    position: 'absolute',
    top: 4,
    left: 6,
    right: 6,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  modelName: {
    width: '100%',
    minHeight: 44,
    color: '#F8FAFC',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 10,
  },
  yearRange: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 3,
  },
  generationCount: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  openPill: {
    minHeight: 27,
    marginTop: 'auto',
    paddingHorizontal: 11,
    borderRadius: 14,
    backgroundColor: '#172554',
    borderWidth: 1,
    borderColor: '#1D4ED8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  openPillText: { color: '#BFDBFE', fontSize: 11, fontWeight: '900' },
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
});
