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

  const modelCards = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records
      .map((record, index) => {
        const vehicle = record?.vehicle || {};

        return {
          id:
            record?.record_id ||
            [
              vehicle.make,
              vehicle.model,
              vehicle.year_from,
              vehicle.year_to,
              vehicle.variant,
              index,
            ]
              .filter(
                (value) =>
                  value !== undefined && value !== null && value !== '',
              )
              .join('_'),
          record,
          modelName:
            vehicle.model || vehicle.model_name || 'Unknown model',
          variant: vehicle.variant || vehicle.generation || '',
          yearText: formatYearRange(record),
        };
      })
      .filter((item) => {
        if (!query) return true;

        return [item.modelName, item.variant, item.yearText]
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((first, second) => {
        const modelComparison = first.modelName.localeCompare(
          second.modelName,
        );

        if (modelComparison !== 0) return modelComparison;

        const firstYear = first.record?.vehicle?.year_from ?? 0;
        const secondYear = second.record?.vehicle?.year_from ?? 0;
        return secondYear - firstYear;
      });
  }, [records, search]);

  function openVehicle(record) {
    navigation.navigate('Vehicle', {
      record: normaliseRecord(record),
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
        <Text style={styles.subtitle}>Select a model and year range</Text>
      </View>

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
          placeholder="Search models or years"
          placeholderTextColor="#64748B"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch('')} hitSlop={10}>
            <Ionicons
              name="close-circle"
              size={22}
              color="#64748B"
            />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={modelCards}
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
            <Text style={styles.emptyTitle}>No models found</Text>
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
            onPress={() => openVehicle(item.record)}
          >
            <View style={styles.vehicleIconContainer}>
              <View style={styles.vehicleIconHighlight} />
              <Ionicons
                name="car-sport"
                size={42}
                color="#BFDBFE"
              />
            </View>

            <Text style={styles.modelName} numberOfLines={2}>
              {item.modelName}
            </Text>
            <Text style={styles.yearRange} numberOfLines={1}>
              {item.yearText}
            </Text>
            {item.variant ? (
              <Text style={styles.variant} numberOfLines={2}>
                {item.variant}
              </Text>
            ) : null}
            <View style={styles.marketPill}>
              <Text style={styles.marketPillText}>UK · RHD</Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function normaliseRecord(record = {}) {
  const vehicleInformation = record.vehicle_information || {};
  const keyInformation = record.key_information || {
    key_type: vehicleInformation.key_type,
    blade_profile: vehicleInformation.blade_profile,
    emergency_blade:
      vehicleInformation.emergency_blade ||
      vehicleInformation.blade_profile,
    transponder_type: vehicleInformation.transponder_type,
    frequency_mhz: vehicleInformation.frequency_mhz,
    battery: vehicleInformation.battery,
    buttons: vehicleInformation.buttons,
  };

  const security = record.security || {
    family:
      vehicleInformation.immobiliser_system ||
      vehicleInformation.security_system,
    platform:
      record.vehicle?.platform || vehicleInformation.platform,
    programming_module:
      vehicleInformation.programming_module,
    programming_route:
      vehicleInformation.programming_route,
    security_access:
      vehicleInformation.immobiliser_generation,
    online_requirement:
      vehicleInformation.online_requirement,
    fdrs_requirement:
      vehicleInformation.fdrs_requirement,
    gateway_requirement:
      vehicleInformation.gateway_requirement,
  };

  return {
    ...record,
    key_information: keyInformation,
    security,
    operations: record.operations || record.procedures || {},
    tools: record.tools || {},
    modules: record.modules || {},
    notes:
      record.notes ||
      (vehicleInformation.notes
        ? { general: vehicleInformation.notes }
        : {}),
  };
}

function formatYearRange(record) {
  const yearFrom = record?.vehicle?.year_from;
  const yearTo = record?.vehicle?.year_to;

  if (yearFrom && yearTo) return `${yearFrom}–${yearTo}`;
  if (yearFrom && !yearTo) return `${yearFrom} onwards`;
  if (!yearFrom && yearTo) return `Up to ${yearTo}`;
  return 'Year range unknown';
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
  },
  title: {
    color: '#F8FAFC',
    fontSize: 25,
    fontWeight: '900',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 15,
    marginTop: 4,
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
    paddingHorizontal: 12,
    paddingBottom: 34,
  },
  columnWrapper: {
    gap: 10,
    alignItems: 'stretch',
  },
  modelCard: {
    flex: 1,
    minHeight: 245,
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
  modelCardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
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
    minHeight: 48,
    color: '#F8FAFC',
    fontSize: 17,
    lineHeight: 21,
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
  variant: {
    width: '100%',
    minHeight: 34,
    color: '#94A3B8',
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 4,
  },
  marketPill: {
    minHeight: 25,
    marginTop: 'auto',
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  marketPillText: {
    color: '#94A3B8',
    fontSize: 11,
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
});