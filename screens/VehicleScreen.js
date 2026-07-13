import React, {
  useMemo,
  useState,
} from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AutomotiveIcon from '../components/AutomotiveIcon';
import OperationSection from '../components/OperationSection';
import QuickJobCard from '../components/QuickJobCard';

const TILE_CONFIG = [
  { id: 'key_information', title: 'Key Info', icon: 'key' },
  { id: 'programming', title: 'Programming', icon: 'programming' },
  { id: 'obd', title: 'OBD', icon: 'obd' },
  { id: 'eeprom', title: 'EEPROM', icon: 'chip' },
  { id: 'modules', title: 'Modules', icon: 'modules' },
  { id: 'tools', title: 'Tools', icon: 'tools' },
  { id: 'photos', title: 'Photos', icon: 'photos' },
  { id: 'notes', title: 'Notes', icon: 'notes' },
];

export default function VehicleScreen({
  route,
}) {
  const { record } = route.params || {};
  const [activeSection, setActiveSection] =
    useState(null);

  const [openOperations, setOpenOperations] =
    useState({
      add_key: true,
      all_keys_lost: false,
    });

  const vehicle = record?.vehicle || {};
  const vehicleInformation =
    record?.vehicle_information ||
    record?.key_information ||
    {};
  const operations =
    record?.operations ||
    record?.procedures ||
    {};

  const title = useMemo(
    () =>
      [
        vehicle.make,
        vehicle.model,
        vehicle.variant,
      ]
        .filter(Boolean)
        .join(' '),
    [vehicle],
  );

  if (!record) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            Vehicle record unavailable
          </Text>
          <Text style={styles.emptyText}>
            This vehicle record could not be loaded.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const availability = {
    key_information: hasContent(vehicleInformation),
    programming: hasContent(operations),
    obd:
      hasContent(record?.obd) ||
      hasContent(record?.wiring?.obd) ||
      hasText(operations, 'obd'),
    eeprom:
      hasContent(record?.eeprom) ||
      hasContent(record?.wiring?.eeprom) ||
      hasText(operations, 'eeprom'),
    modules: hasContent(record?.modules),
    tools: hasContent(extractTools(record)),
    photos: hasContent(record?.photos),
    notes:
      hasContent(record?.notes) ||
      hasContent(vehicleInformation?.notes) ||
      hasContent(record?.common_problems),
  };

  function toggleOperation(id) {
    setOpenOperations((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.vehicleTitle}>
            {title || 'Vehicle details'}
          </Text>

          <Text style={styles.yearRange}>
            {formatYearRange(vehicle)}
          </Text>

          <View style={styles.summaryRow}>
            <Badge text={vehicle.market || 'UK'} />
            <Badge text={vehicle.drive_side || 'RHD'} />
            {vehicleInformation.transponder_type ? (
              <Badge
                text={vehicleInformation.transponder_type}
              />
            ) : null}
          </View>
        </View>

        <QuickJobCard record={record} />

        <Text style={styles.dashboardTitle}>
          Full vehicle information
        </Text>

        <View style={styles.tileGrid}>
          {TILE_CONFIG.map((tile) => (
            <DashboardTile
              key={tile.id}
              title={tile.title}
              icon={tile.icon}
              available={availability[tile.id]}
              onPress={() =>
                setActiveSection(tile.id)
              }
            />
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal
        visible={Boolean(activeSection)}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() =>
          setActiveSection(null)
        }
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <Text
                style={styles.modalVehicleTitle}
                numberOfLines={1}
              >
                {title || 'Vehicle details'}
              </Text>

              <Text style={styles.modalSectionName}>
                {
                  TILE_CONFIG.find(
                    (tile) =>
                      tile.id === activeSection,
                  )?.title || ''
                }
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
              onPress={() =>
                setActiveSection(null)
              }
              accessibilityLabel="Close section"
            >
              <Ionicons
                name="close"
                size={29}
                color="#F8FAFC"
              />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <AutomotiveIcon
                    name={
                      TILE_CONFIG.find(
                        (tile) =>
                          tile.id === activeSection,
                      )?.icon
                    }
                    size={34}
                    color="#BFDBFE"
                  />
                </View>

                <Text style={styles.sectionTitle}>
                  {
                    TILE_CONFIG.find(
                      (tile) =>
                        tile.id === activeSection,
                    )?.title || ''
                  }
                </Text>
              </View>

              {renderActiveSection({
                activeSection,
                record,
                vehicleInformation,
                operations,
                openOperations,
                toggleOperation,
              })}
            </View>

            <View style={styles.modalBottomSpacer} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function renderActiveSection({
  activeSection,
  record,
  vehicleInformation,
  operations,
  openOperations,
  toggleOperation,
}) {
  switch (activeSection) {
    case 'key_information':
      return (
        <View>
          <InfoRow
            label="Immobiliser"
            value={vehicleInformation.immobiliser_system}
          />
          <InfoRow
            label="Generation"
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
          {!hasContent(vehicleInformation) ? (
            <EmptySection />
          ) : null}
        </View>
      );

    case 'programming':
      return (
        <View>
          <OperationSection
            title="Add Key"
            operation={operations.add_key}
            isOpen={openOperations.add_key}
            onToggle={() =>
              toggleOperation('add_key')
            }
          />
          <OperationSection
            title="All Keys Lost"
            operation={operations.all_keys_lost}
            isOpen={openOperations.all_keys_lost}
            onToggle={() =>
              toggleOperation('all_keys_lost')
            }
          />
          {!hasContent(operations) ? (
            <EmptySection />
          ) : null}
        </View>
      );

    case 'obd':
      return (
        <GenericSection
          data={
            record?.obd ||
            record?.wiring?.obd
          }
          empty="No dedicated OBD information has been added yet."
        />
      );

    case 'eeprom':
      return (
        <GenericSection
          data={
            record?.eeprom ||
            record?.wiring?.eeprom
          }
          empty="No EEPROM or MCU information has been added yet."
        />
      );

    case 'modules':
      return (
        <GenericSection
          data={record?.modules}
          empty="No module locations have been added yet."
        />
      );

    case 'tools':
      return (
        <GenericSection
          data={extractTools(record)}
          empty="No required tool information has been added yet."
        />
      );

    case 'photos':
      return (
        <GenericSection
          data={record?.photos}
          empty="No reference photos have been added yet."
        />
      );

    case 'notes':
      return (
        <GenericSection
          data={
            record?.notes ||
            vehicleInformation?.notes ||
            record?.common_problems
          }
          empty="No notes or warnings have been added yet."
        />
      );

    default:
      return <EmptySection />;
  }
}

function DashboardTile({
  title,
  icon,
  available,
  onPress,
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.tile,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.tileIcon}>
        <AutomotiveIcon
          name={icon}
          size={45}
          color="#BFDBFE"
        />
      </View>

      <Text style={styles.tileTitle}>
        {title}
      </Text>

      <View
        style={[
          styles.statusDot,
          available
            ? styles.availableDot
            : styles.noDataDot,
        ]}
      />

      <Text style={styles.statusText}>
        {available ? 'Available' : 'No data'}
      </Text>
    </Pressable>
  );
}

function GenericSection({
  data,
  empty,
}) {
  if (!hasContent(data)) {
    return <EmptySection text={empty} />;
  }

  if (Array.isArray(data)) {
    return (
      <View>
        {data.map((item, index) => (
          <BulletRow
            key={index}
            text={displayValue(item)}
          />
        ))}
      </View>
    );
  }

  if (
    typeof data === 'string' ||
    typeof data === 'number'
  ) {
    return (
      <Text style={styles.bodyText}>
        {String(data)}
      </Text>
    );
  }

  return (
    <View>
      {Object.entries(data).map(
        ([key, value]) => (
          <InfoRow
            key={key}
            label={formatLabel(key)}
            value={displayValue(value)}
          />
        ),
      )}
    </View>
  );
}

function InfoRow({
  label,
  value,
}) {
  if (!hasContent(value)) {
    return null;
  }

  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>
      <Text style={styles.infoValue}>
        {displayValue(value)}
      </Text>
    </View>
  );
}

function BulletRow({
  text,
}) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>
        {text}
      </Text>
    </View>
  );
}

function EmptySection({
  text = 'No information has been added to this section yet.',
}) {
  return (
    <View style={styles.emptySection}>
      <Ionicons
        name="information-circle-outline"
        size={25}
        color="#64748B"
      />
      <Text style={styles.emptySectionText}>
        {text}
      </Text>
    </View>
  );
}

function Badge({
  text,
}) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>
        {text}
      </Text>
    </View>
  );
}

function formatYearRange(vehicle) {
  if (vehicle.year_from && vehicle.year_to) {
    return `${vehicle.year_from}–${vehicle.year_to}`;
  }
  if (vehicle.year_from) {
    return `${vehicle.year_from} onwards`;
  }
  if (vehicle.year_to) {
    return `Up to ${vehicle.year_to}`;
  }
  return 'Year range unknown';
}

function hasContent(value) {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }
  return true;
}

function hasText(value, phrase) {
  try {
    return JSON.stringify(value)
      .toLowerCase()
      .includes(phrase);
  } catch {
    return false;
  }
}

function extractTools(record) {
  return (
    record?.tools ||
    record?.required_tools ||
    record?.tool_requirements ||
    record?.operations?.required_tools ||
    record?.procedures?.required_tools ||
    null
  );
}

function displayValue(value) {
  if (Array.isArray(value)) {
    return value.map(displayValue).join(', ');
  }
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(
        ([key, nested]) =>
          `${formatLabel(key)}: ${displayValue(nested)}`,
      )
      .join('\n');
  }
  return String(value ?? '');
}

function formatLabel(value) {
  return String(value)
    .replace(/_/g, ' ')
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
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
    borderRadius: 20,
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
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  badge: {
    borderRadius: 999,
    backgroundColor: '#1E293B',
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#BFDBFE',
    fontSize: 12,
    fontWeight: '800',
  },
  dashboardTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginBottom: 15,
  },
  tile: {
    width: '47%',
    aspectRatio: 1.05,
    margin: '1.5%',
    padding: 12,
    borderRadius: 19,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#283449',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIcon: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: 'rgba(37,99,235,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 6,
  },
  availableDot: {
    backgroundColor: '#22C55E',
  },
  noDataDot: {
    backgroundColor: '#64748B',
  },
  statusText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 3,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.975 }],
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  modalHeader: {
    minHeight: 78,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  modalVehicleTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '900',
  },
  modalSectionName: {
    color: '#93C5FD',
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: 16,
  },
  sectionCard: {
    borderRadius: 19,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#283449',
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
  },
  sectionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#172554',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '900',
    marginLeft: 11,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 11,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    borderBottomColor: '#253047',
  },
  infoLabel: {
    color: '#94A3B8',
    flex: 1,
  },
  infoValue: {
    color: '#F8FAFC',
    flex: 1.25,
    textAlign: 'right',
    fontWeight: '700',
    lineHeight: 20,
  },
  bodyText: {
    color: '#CBD5E1',
    lineHeight: 22,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 9,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#60A5FA',
    marginTop: 8,
    marginRight: 10,
  },
  bulletText: {
    color: '#CBD5E1',
    flex: 1,
    lineHeight: 21,
  },
  emptySection: {
    paddingVertical: 22,
    alignItems: 'center',
  },
  emptySectionText: {
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 8,
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
    height: 28,
  },
  modalBottomSpacer: {
    height: 30,
  },
});
