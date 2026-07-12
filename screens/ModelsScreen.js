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

export default function ModelsScreen({
  route,
  navigation,
}) {
  const {
    manufacturer,
    manufacturerData,
  } = route.params || {};

  const [search, setSearch] = useState('');

  const records = Array.isArray(
    manufacturerData?.records,
  )
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
                  value !== undefined &&
                  value !== null &&
                  value !== '',
              )
              .join('_'),
          record,
          modelName:
            vehicle.model ||
            vehicle.model_name ||
            'Unknown model',
          variant:
            vehicle.variant ||
            vehicle.generation ||
            '',
          yearText: formatYearRange(record),
        };
      })
      .filter((item) => {
        if (!query) {
          return true;
        }

        return [
          item.modelName,
          item.variant,
          item.yearText,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((first, second) => {
        const modelComparison =
          first.modelName.localeCompare(
            second.modelName,
          );

        if (modelComparison !== 0) {
          return modelComparison;
        }

        const firstYear =
          first.record?.vehicle?.year_from ??
          0;

        const secondYear =
          second.record?.vehicle?.year_from ??
          0;

        return secondYear - firstYear;
      });
  }, [records, search]);

  function openVehicle(record) {
    navigation.navigate('Vehicle', {
      record,
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {manufacturer?.name ||
            manufacturerData?.manufacturer
              ?.name ||
            'Models'}
        </Text>

        <Text style={styles.subtitle}>
          Select a model and year range
        </Text>
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
        data={modelCards}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.listContent
        }
        columnWrapperStyle={
          styles.columnWrapper
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="car-sport-outline"
              size={52}
              color="#475569"
            />

            <Text style={styles.emptyTitle}>
              No models found
            </Text>

            <Text style={styles.emptyText}>
              There are no matching vehicle
              records for this manufacturer.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.modelCard,
              pressed &&
                styles.modelCardPressed,
            ]}
            onPress={() =>
              openVehicle(item.record)
            }
          >
            <View
              style={
                styles.vehicleIconContainer
              }
            >
              <View
                style={
                  styles.vehicleIconHighlight
                }
              />

              <Ionicons
                name="car-sport"
                size={54}
                color="#BFDBFE"
              />
            </View>

            <Text
              style={styles.modelName}
              numberOfLines={2}
            >
              {item.modelName}
            </Text>

            <Text
              style={styles.yearRange}
              numberOfLines={1}
            >
              {item.yearText}
            </Text>

            {item.variant ? (
              <Text
                style={styles.variant}
                numberOfLines={1}
              >
                {item.variant}
              </Text>
            ) : null}

            <View style={styles.marketPill}>
              <Text
                style={styles.marketPillText}
              >
                UK · RHD
              </Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function formatYearRange(record) {
  const yearFrom =
    record?.vehicle?.year_from;

  const yearTo =
    record?.vehicle?.year_to;

  if (yearFrom && yearTo) {
    return `${yearFrom}–${yearTo}`;
  }

  if (yearFrom && !yearTo) {
    return `${yearFrom} onwards`;
  }

  if (!yearFrom && yearTo) {
    return `Up to ${yearTo}`;
  }

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
    paddingHorizontal: 13,
    paddingBottom: 34,
  },
  columnWrapper: {
    gap: 10,
  },
  modelCard: {
    flex: 1,
    aspectRatio: 1,
    margin: 5,
    paddingHorizontal: 12,
    paddingVertical: 15,
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
  modelCardPressed: {
    opacity: 0.82,
    transform: [
      {
        scale: 0.975,
      },
    ],
  },
  vehicleIconContainer: {
    width: 94,
    height: 72,
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#172554',
    borderWidth: 1,
    borderColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 5,
  },
  vehicleIconHighlight: {
    position: 'absolute',
    top: 4,
    left: 6,
    right: 6,
    height: 29,
    borderRadius: 15,
    backgroundColor:
      'rgba(255,255,255,0.06)',
  },
  modelName: {
    width: '100%',
    color: '#F8FAFC',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 12,
  },
  yearRange: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 5,
  },
  variant: {
    width: '100%',
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 3,
  },
  marketPill: {
    minHeight: 25,
    marginTop: 8,
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
