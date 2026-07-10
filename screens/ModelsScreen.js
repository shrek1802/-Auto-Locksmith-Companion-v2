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

export default function ModelsScreen({ route, navigation }) {
  const { manufacturer, manufacturerData } = route.params || {};

  const [search, setSearch] = useState('');

  const records = Array.isArray(manufacturerData?.records)
    ? manufacturerData.records
    : [];

  const groupedModels = useMemo(() => {
    const groups = {};

    records.forEach((record) => {
      const modelName = record?.vehicle?.model || 'Unknown model';

      if (!groups[modelName]) {
        groups[modelName] = [];
      }

      groups[modelName].push(record);
    });

    return Object.entries(groups)
      .map(([modelName, modelRecords]) => ({
        modelName,
        records: modelRecords.sort((a, b) => {
          const aYear = a?.vehicle?.year_from ?? 0;
          const bYear = b?.vehicle?.year_from ?? 0;

          return bYear - aYear;
        }),
      }))
      .filter((item) =>
        item.modelName.toLowerCase().includes(search.trim().toLowerCase())
      )
      .sort((a, b) => a.modelName.localeCompare(b.modelName));
  }, [records, search]);

  function openVehicle(record) {
    navigation.navigate('Vehicle', {
      record,
    });
  }

  function formatYearRange(record) {
    const yearFrom = record?.vehicle?.year_from;
    const yearTo = record?.vehicle?.year_to;

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {manufacturer?.name || manufacturerData?.manufacturer?.name || 'Models'}
        </Text>

        <Text style={styles.subtitle}>
          Select a model and year range
        </Text>
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search model"
        placeholderTextColor="#64748B"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.searchInput}
      />

      <FlatList
        data={groupedModels}
        keyExtractor={(item) => item.modelName}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No models found</Text>

            <Text style={styles.emptyText}>
              There are no matching vehicle records for this manufacturer.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.modelSection}>
            <Text style={styles.modelTitle}>{item.modelName}</Text>

            {item.records.map((record) => (
              <Pressable
                key={
                  record.record_id ||
                  `${record?.vehicle?.model}-${record?.vehicle?.year_from}-${record?.vehicle?.year_to}`
                }
                style={({ pressed }) => [
                  styles.yearCard,
                  pressed && styles.yearCardPressed,
                ]}
                onPress={() => openVehicle(record)}
              >
                <View style={styles.yearCardText}>
                  <Text style={styles.yearRange}>
                    {formatYearRange(record)}
                  </Text>

                  {record?.vehicle?.variant ? (
                    <Text style={styles.variant}>
                      {record.vehicle.variant}
                    </Text>
                  ) : null}

                  <Text style={styles.market}>
                    UK · RHD
                  </Text>
                </View>

                <Text style={styles.arrow}>›</Text>
              </Pressable>
            ))}
          </View>
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
  },
  title: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: '#94A3B8',
    marginTop: 4,
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
    paddingHorizontal: 18,
    paddingBottom: 30,
  },
  modelSection: {
    marginBottom: 20,
  },
  modelTitle: {
    color: '#F8FAFC',
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 9,
  },
  yearCard: {
    minHeight: 76,
    borderRadius: 14,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#253047',
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yearCardPressed: {
    opacity: 0.72,
  },
  yearCardText: {
    flex: 1,
    paddingRight: 12,
  },
  yearRange: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  variant: {
    color: '#CBD5E1',
    marginTop: 4,
  },
  market: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
  },
  arrow: {
    color: '#60A5FA',
    fontSize: 32,
    lineHeight: 32,
  },
  emptyState: {
    paddingVertical: 50,
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
});
