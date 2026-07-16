import React, { useCallback, useMemo, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import AutomotiveIcon from '../components/AutomotiveIcon';
import OperationSection from '../components/OperationSection';
import QuickJobCard from '../components/QuickJobCard';
import {
  buildVehicleOperations,
  buildVehicleToolDisplay,
} from '../services/vehicleDisplayAdapter';

const OWNED_TOOLS_STORAGE_KEY = '@locksmith_companion_owned_tools';
const SHOW_ONLY_OWNED_STORAGE_KEY = '@locksmith_companion_show_only_owned';


const TILE_CONFIG = [
  { id: 'key_information', title: 'Key Info', icon: 'key' },
  { id: 'programming', title: 'Programming', icon: 'programming' },
  { id: 'security', title: 'Security', icon: 'shield' },
  { id: 'tools', title: 'Tools', icon: 'tools' },
  { id: 'modules', title: 'Modules', icon: 'modules' },
  { id: 'notes', title: 'Job Notes', icon: 'notes' },
];

export default function VehicleScreen({ route }) {
  const { record } = route.params || {};
  const [activeSection, setActiveSection] = useState(null);
  const [openOperations, setOpenOperations] = useState({
    add_key: true,
    all_keys_lost: false,
  });
  const [ownedTools, setOwnedTools] = useState([]);
  const [showOnlyOwnedTools, setShowOnlyOwnedTools] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        AsyncStorage.getItem(OWNED_TOOLS_STORAGE_KEY),
        AsyncStorage.getItem(SHOW_ONLY_OWNED_STORAGE_KEY),
      ]).then(([storedTools, storedFilter]) => {
        if (!active) return;
        try {
          const parsed = storedTools ? JSON.parse(storedTools) : [];
          setOwnedTools(Array.isArray(parsed) ? parsed : []);
        } catch {
          setOwnedTools([]);
        }
        setShowOnlyOwnedTools(storedFilter === 'true');
      });
      return () => { active = false; };
    }, []),
  );

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

  const vehicle = record.vehicle || {};
  const vehicleInformation = record.vehicle_information || {};
  const keyInformation = record.key_information || vehicleInformation || {};
  const operations = buildVehicleOperations(record, ownedTools, showOnlyOwnedTools);
  const security = record.security || {
    family: vehicleInformation.immobiliser_system,
    programming_route: vehicleInformation.programming?.route,
    online_requirement: vehicleInformation.programming?.online_requirement,
  };
  const tools = buildVehicleToolDisplay(record, ownedTools, showOnlyOwnedTools);
  const modules = record.modules || {};
  const notes = record.notes || {};

  const title = useMemo(
    () =>
      [vehicle.make, vehicle.model, vehicle.variant]
        .filter(Boolean)
        .join(' '),
    [vehicle],
  );

  const availability = {
    key_information: hasContent(keyInformation),
    programming: hasContent(operations),
    security: hasContent(security),
    tools: hasContent(tools),
    modules: hasContent(modules),
    notes: hasContent(notes),
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
            {vehicle.ignition_type ? (
              <Badge text={vehicle.ignition_type} />
            ) : null}
            {keyInformation.transponder_type ? (
              <Badge text={keyInformation.transponder_type} />
            ) : null}
          </View>
        </View>

        <QuickJobCard record={record} />

        <Text style={styles.dashboardTitle}>
          Key programming information
        </Text>

        <View style={styles.tileGrid}>
          {TILE_CONFIG.map((tile) => (
            <DashboardTile
              key={tile.id}
              title={tile.title}
              icon={tile.icon}
              available={availability[tile.id]}
              onPress={() => setActiveSection(tile.id)}
            />
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal
        visible={Boolean(activeSection)}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setActiveSection(null)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <Text style={styles.modalVehicleTitle} numberOfLines={1}>
                {title || 'Vehicle details'}
              </Text>
              <Text style={styles.modalSectionName}>
                {tileTitle(activeSection)}
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
              onPress={() => setActiveSection(null)}
              accessibilityLabel="Close section"
            >
              <Ionicons name="close" size={29} color="#F8FAFC" />
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
                    name={tileIcon(activeSection)}
                    size={34}
                    color="#BFDBFE"
                  />
                </View>
                <Text style={styles.sectionTitle}>
                  {tileTitle(activeSection)}
                </Text>
              </View>

              {renderActiveSection({
                activeSection,
                keyInformation,
                operations,
                security,
                tools,
                modules,
                notes,
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
  keyInformation,
  operations,
  security,
  tools,
  modules,
  notes,
  openOperations,
  toggleOperation,
}) {
  switch (activeSection) {
    case 'key_information':
      return (
        <View>
          <InfoRow label="Key type" value={keyInformation.key_type} />
          <InfoRow label="Blade" value={keyInformation.blade_profile} />
          <InfoRow
            label="Transponder"
            value={keyInformation.transponder_type}
          />
          <InfoRow
            label="Frequency"
            value={formatFrequency(keyInformation.frequency_mhz)}
          />
          <InfoRow label="Battery" value={keyInformation.battery} />
          <InfoRow label="Buttons" value={keyInformation.buttons} />
          <InfoRow
            label="Emergency blade"
            value={keyInformation.emergency_blade}
          />
          {!hasContent(keyInformation) ? <EmptySection /> : null}
        </View>
      );

    case 'programming':
      return (
        <View>
          <OperationSection
            title="Add Key"
            operation={operations.add_key}
            isOpen={openOperations.add_key}
            onToggle={() => toggleOperation('add_key')}
          />
          <OperationSection
            title="All Keys Lost"
            operation={operations.all_keys_lost}
            isOpen={openOperations.all_keys_lost}
            onToggle={() => toggleOperation('all_keys_lost')}
          />
          <InfoRow
            label="Remote programming"
            value={operations.remote_programming}
          />
          <InfoRow
            label="Parameter reset"
            value={operations.parameter_reset}
          />
          {!hasContent(operations) ? <EmptySection /> : null}
        </View>
      );

    case 'security':
      return (
        <View>
          <InfoRow label="Security family" value={security.family} />
          <InfoRow label="Platform" value={security.platform} />
          <InfoRow
            label="Programming module"
            value={security.programming_module}
          />
          <InfoRow
            label="Programming route"
            value={security.programming_route}
          />
          <InfoRow
            label="Security access"
            value={security.security_access}
          />
          <InfoRow
            label="Online requirement"
            value={security.online_requirement}
          />
          <InfoRow
            label="FDRS requirement"
            value={security.fdrs_requirement}
          />
          <InfoRow
            label="Gateway / SFD"
            value={security.gateway_requirement}
          />
          {!hasContent(security) ? <EmptySection /> : null}
        </View>
      );

    case 'tools':
      return (
        <GenericSection
          data={tools}
          empty="No verified tool support has been added yet."
        />
      );

    case 'modules':
      return (
        <GenericSection
          data={modules}
          empty="No programming-related module locations have been added yet."
        />
      );

    case 'notes':
      return (
        <GenericSection
          data={notes}
          empty="No job notes or warnings have been added yet."
        />
      );

    default:
      return <EmptySection />;
  }
}

function DashboardTile({ title, icon, available, onPress }) {
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
          size={43}
          color="#BFDBFE"
        />
      </View>
      <Text style={styles.tileTitle}>{title}</Text>
      <View
        style={[
          styles.statusDot,
          available ? styles.availableDot : styles.noDataDot,
        ]}
      />
      <Text style={styles.statusText}>
        {available ? 'Available' : 'No data'}
      </Text>
    </Pressable>
  );
}

function GenericSection({ data, empty }) {
  if (!hasContent(data)) {
    return <EmptySection text={empty} />;
  }

  if (Array.isArray(data)) {
    return (
      <View>
        {data.map((item, index) => (
          <BulletRow key={index} text={displayValue(item)} />
        ))}
      </View>
    );
  }

  if (typeof data === 'string' || typeof data === 'number') {
    return <Text style={styles.bodyText}>{String(data)}</Text>;
  }

  return (
    <View>
      {Object.entries(data).map(([key, value]) => (
        <InfoRow
          key={key}
          label={formatLabel(key)}
          value={displayValue(value)}
        />
      ))}
    </View>
  );
}

function InfoRow({ label, value }) {
  if (!hasContent(value)) {
    return null;
  }

  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{displayValue(value)}</Text>
    </View>
  );
}

function BulletRow({ text }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
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
      <Text style={styles.emptySectionText}>{text}</Text>
    </View>
  );
}

function Badge({ text }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

function tileTitle(id) {
  return TILE_CONFIG.find((tile) => tile.id === id)?.title || '';
}

function tileIcon(id) {
  return TILE_CONFIG.find((tile) => tile.id === id)?.icon || 'notes';
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

function formatFrequency(value) {
  if (!hasContent(value)) {
    return '';
  }

  const text = String(value);
  return text.toLowerCase().includes('mhz')
    ? text
    : `${text} MHz`;
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
  if (typeof value === 'boolean') {
    return value ? 'Required / Yes' : 'Not required / No';
  }
  return String(value ?? '');
}

function formatLabel(value) {
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
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
    marginBottom: 16,
  },
  vehicleTitle: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '900',
  },
  yearRange: {
    color: '#93C5FD',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 5,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '800',
  },
  dashboardTitle: {
    color: '#E2E8F0',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '48%',
    minHeight: 150,
    borderRadius: 18,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#283449',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  tileIcon: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: '#172554',
    borderWidth: 1,
    borderColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 9,
  },
  availableDot: {
    backgroundColor: '#22C55E',
  },
  noDataDot: {
    backgroundColor: '#64748B',
  },
  statusText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
  },
  pressed: {
    opacity: 0.78,
  },
  bottomSpacer: {
    height: 28,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  modalHeader: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#253047',
  },
  modalHeaderText: {
    flex: 1,
  },
  modalVehicleTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '900',
  },
  modalSectionName: {
    color: '#93C5FD',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 3,
  },
  closeButton: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: '#1E293B',
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
    borderRadius: 20,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#253047',
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionIcon: {
    width: 55,
    height: 55,
    borderRadius: 17,
    backgroundColor: '#172554',
    borderWidth: 1,
    borderColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 21,
    fontWeight: '900',
    marginLeft: 12,
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#334155',
  },
  infoLabel: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  infoValue: {
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 5,
  },
  bodyText: {
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 23,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#60A5FA',
    marginTop: 7,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 22,
  },
  emptySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#0F172A',
  },
  emptySectionText: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
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
  modalBottomSpacer: {
    height: 30,
  },
});
