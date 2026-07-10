import React, { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import OperationSection from '../components/OperationSection';

export default function VehicleScreen({ route }) {
  const { record } = route.params || {};

  const [openSections, setOpenSections] = useState({
    add_key: true,
    all_keys_lost: false,
  });

  const vehicle = record?.vehicle || {};
  const vehicleInformation = record?.vehicle_information || {};
  const operations = record?.operations || {};

  const title = useMemo(() => {
    const parts = [vehicle.make, vehicle.model];

    if (vehicle.variant) {
      parts.push(vehicle.variant);
    }

    return parts.filter(Boolean).join(' ');
  }, [vehicle]);

  function formatYearRange() {
    const yearFrom = vehicle.year_from;
    const yearTo = vehicle.year_to;

    if (yearFrom && yearTo) {
      return `${yearFrom}–${yearTo}`;
    }

    if (yearFrom) {
      return `${yearFrom} onwards`;
    }

    if (yearTo) {
      return `Up to ${yearTo}`;
    }

    return 'Year range unknown';
  }

  function toggleSection(sectionId) {
    setOpenSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }

  if (!record) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Vehicle record unavailable</Text>
          <Text style={styles.emptyText}>
            This vehicle record could not be loaded.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.vehicleTitle}>{title || 'Vehicle details'}</Text>

          <Text style={styles.yearRange}>{formatYearRange()}</Text>

          <View style={styles.marketRow}>
            <View style={styles.marketBadge}>
              <Text style={styles.marketBadgeText}>
                {vehicle.market || 'UK'}
              </Text>
            </View>

            <View style={styles.marketBadge}>
              <Text style={styles.marketBadgeText}>
                {vehicle.drive_side || 'RHD'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Vehicle Information</Text>

          <InfoRow
            label="Immobiliser"
            value={vehicleInformation.immobiliser_system}
          />

          <InfoRow
            label="Immobiliser generation"
            value={vehicleInformation.immobiliser_generation}
          />

          <InfoRow
            label="Transponder"
            value={vehicleInformation.transponder_type}
          />

          <InfoRow
            label="Frequency"
            value={
              vehicleInformation.frequency_mhz
                ? `${vehicleInformation.frequency_mhz} MHz`
                : ''
            }
          />

          <InfoRow
            label="Blade"
            value={vehicleInformation.blade_profile}
          />

          <InfoRow
            label="Key type"
            value={vehicleInformation.key_type}
          />

          {vehicleInformation.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesText}>
                {vehicleInformation.notes}
              </Text>
            </View>
          ) : null}
        </View>

        <OperationSection
          operationId="add_key"
          title="Add Key"
          operation={operations.add_key}
          isOpen={openSections.add_key}
          onToggle={() => toggleSection('add_key')}
        />

        <OperationSection
          operationId="all_keys_lost"
          title="All Keys Lost"
          operation={operations.all_keys_lost}
          isOpen={openSections.all_keys_lost}
          onToggle={() => toggleSection('all_keys_lost')}
        />

        {record?.common_problems?.length ? (
          <ExpandableSimpleSection
            title="Common Problems"
            items={record.common_problems}
          />
        ) : null}

        {record?.notes ? (
          <ExpandableTextSection
            title="Additional Notes"
            text={record.notes}
          />
        ) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }) {
  if (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  ) {
    return null;
  }

  const displayValue = Array.isArray(value) ? value.join(', ') : String(value);

  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{displayValue}</Text>
    </View>
  );
}

function ExpandableSimpleSection({ title, items }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.expandableCard}>
      <Pressable
        style={styles.expandableHeader}
        onPress={() => setOpen((current) => !current)}
      >
        <Text style={styles.expandableTitle}>{title}</Text>
        <Text style={styles.chevron}>{open ? '⌃' : '⌄'}</Text>
      </Pressable>

      {open ? (
        <View style={styles.expandableContent}>
          {items.map((item, index) => (
            <View
              key={`${title}-${index}`}
              style={styles.listItem}
            >
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>{String(item)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ExpandableTextSection({ title, text }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.expandableCard}>
      <Pressable
        style={styles.expandableHeader}
        onPress={() => setOpen((current) => !current)}
      >
        <Text style={styles.expandableTitle}>{title}</Text>
        <Text style={styles.chevron}>{open ? '⌃' : '⌄'}</Text>
      </Pressable>

      {open ? (
        <View style={styles.expandableContent}>
          <Text style={styles.additionalNotes}>{text}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  content: {
    padding: 16,
  },
  heroCard: {
    borderRadius: 18,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#253047',
    padding: 18,
    marginBottom: 14,
  },
  vehicleTitle: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '900',
  },
  yearRange: {
    color: '#CBD5E1',
    fontSize: 16,
    marginTop: 5,
  },
  marketRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  marketBadge: {
    borderRadius: 999,
    backgroundColor: '#1E293B',
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  marketBadgeText: {
    color: '#BFDBFE',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionCard: {
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
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#253047',
  },
  infoLabel: {
    color: '#94A3B8',
    flex: 1,
  },
  infoValue: {
    color: '#F8FAFC',
    flex: 1.2,
    textAlign: 'right',
    fontWeight: '700',
  },
  notesBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#0F172A',
  },
  notesLabel: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  notesText: {
    color: '#CBD5E1',
    lineHeight: 20,
    marginTop: 6,
  },
  expandableCard: {
    borderRadius: 16,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#253047',
    marginBottom: 14,
    overflow: 'hidden',
  },
  expandableHeader: {
    minHeight: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expandableTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '900',
  },
  chevron: {
    color: '#60A5FA',
    fontSize: 22,
    fontWeight: '900',
  },
  expandableContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  bullet: {
    color: '#60A5FA',
    marginRight: 9,
    fontSize: 18,
    lineHeight: 21,
  },
  listText: {
    color: '#CBD5E1',
    flex: 1,
    lineHeight: 21,
  },
  additionalNotes: {
    color: '#CBD5E1',
    lineHeight: 21,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '900',
  },
  emptyText: {
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
  bottomSpacer: {
    height: 24,
  },
});
