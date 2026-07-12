import React, {
  useMemo,
  useState,
} from 'react';
import {
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

const TILE_CONFIG = [
  {
    id: 'key_information',
    title: 'Key Info',
    icon: 'key',
  },
  {
    id: 'programming',
    title: 'Programming',
    icon: 'programming',
  },
  {
    id: 'obd',
    title: 'OBD',
    icon: 'obd',
  },
  {
    id: 'eeprom',
    title: 'EEPROM',
    icon: 'chip',
  },
  {
    id: 'modules',
    title: 'Modules',
    icon: 'modules',
  },
  {
    id: 'tools',
    title: 'Tools',
    icon: 'tools',
  },
  {
    id: 'photos',
    title: 'Photos',
    icon: 'photos',
  },
  {
    id: 'notes',
    title: 'Notes',
    icon: 'notes',
  },
];

export default function VehicleScreen({
  route,
}) {
  const { record } = route.params || {};

  const [activeSection, setActiveSection] =
    useState('key_information');

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

  const title = useMemo(() => {
    return [
      vehicle.make,
      vehicle.model,
      vehicle.variant,
    ]
      .filter(Boolean)
      .join(' ');
  }, [vehicle]);

  const sectionAvailability = useMemo(
    () => ({
      key_information:
        hasObjectContent(vehicleInformation),
      programming:
        hasObjectContent(operations),
      obd:
        hasObjectContent(record?.obd) ||
        hasObjectContent(
          record?.wiring?.obd,
        ) ||
        hasTextMatch(operations, 'obd'),
      eeprom:
        hasObjectContent(record?.eeprom) ||
        hasObjectContent(
          record?.wiring?.eeprom,
        ) ||
        hasTextMatch(operations, 'eeprom'),
      modules:
        hasObjectContent(record?.modules),
      tools:
        hasToolsContent(record),
      photos:
        hasObjectContent(record?.photos),
      notes:
        Boolean(
          record?.notes ||
          vehicleInformation?.notes ||
          record?.common_problems?.length,
        ),
    }),
    [
      record,
      vehicleInformation,
      operations,
    ],
  );

  if (!record) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            Vehicle record unavailable
          </Text>

          <Text style={styles.emptyText}>
            This vehicle record could not be
            loaded.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  function toggleOperation(operationId) {
    setOpenOperations((current) => ({
      ...current,
      [operationId]:
        !current[operationId],
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
            <SummaryBadge
              text={vehicle.market || 'UK'}
            />

            <SummaryBadge
              text={
                vehicle.drive_side || 'RHD'
              }
            />

            {vehicleInformation
              .transponder_type ? (
              <SummaryBadge
                text={
                  vehicleInformation
                    .transponder_type
                }
              />
            ) : null}
          </View>
        </View>

        <Text style={styles.dashboardTitle}>
          Vehicle information
        </Text>

        <View style={styles.tileGrid}>
          {TILE_CONFIG.map((tile) => (
            <DashboardTile
              key={tile.id}
              title={tile.title}
              icon={tile.icon}
              available={
                sectionAvailability[tile.id]
              }
              active={
                activeSection === tile.id
              }
              onPress={() =>
                setActiveSection(tile.id)
              }
            />
          ))}
        </View>

        <View style={styles.activeSectionCard}>
          <View style={styles.activeSectionHeader}>
            <View style={styles.activeSectionIcon}>
              <AutomotiveIcon
                name={
                  TILE_CONFIG.find(
                    (tile) =>
                      tile.id === activeSection,
                  )?.icon
                }
                size={30}
                color="#BFDBFE"
              />
            </View>

            <Text style={styles.activeSectionTitle}>
              {
                TILE_CONFIG.find(
                  (tile) =>
                    tile.id === activeSection,
                )?.title
              }
            </Text>
          </View>

          {renderSection({
            activeSection,
            record,
            vehicleInformation,
            operations,
            openOperations,
            toggleOperation,
          })}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

function renderSection({
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
            value={
              vehicleInformation
                .immobiliser_system
            }
          />

          <InfoRow
            label="Immobiliser generation"
            value={
              vehicleInformation
                .immobiliser_generation
            }
          />

          <InfoRow
            label="Transponder"
            value={
              vehicleInformation
                .transponder_type
            }
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
            value={
              vehicleInformation.blade_profile
            }
          />

          <InfoRow
            label="Key type"
            value={
              vehicleInformation.key_type
            }
          />

          {!hasObjectContent(
            vehicleInformation,
          ) ? (
            <EmptySectionText />
          ) : null}
        </View>
      );

    case 'programming':
      return (
        <View>
          <OperationSection
            operationId="add_key"
            title="Add Key"
            operation={operations.add_key}
            isOpen={
              openOperations.add_key
            }
            onToggle={() =>
              toggleOperation('add_key')
            }
          />

          <OperationSection
            operationId="all_keys_lost"
            title="All Keys Lost"
            operation={
              operations.all_keys_lost
            }
            isOpen={
              openOperations.all_keys_lost
            }
            onToggle={() =>
              toggleOperation(
                'all_keys_lost',
              )
            }
          />

          {!hasObjectContent(operations) ? (
            <EmptySectionText />
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
          emptyText="No dedicated OBD information has been added for this vehicle yet."
        />
      );

    case 'eeprom':
      return (
        <GenericSection
          data={
            record?.eeprom ||
            record?.wiring?.eeprom
          }
          emptyText="No EEPROM or MCU information has been added for this vehicle yet."
        />
      );

    case 'modules':
      return (
        <GenericSection
          data={record?.modules}
          emptyText="No module locations have been added for this vehicle yet."
        />
      );

    case 'tools':
      return (
        <GenericSection
          data={extractTools(record)}
          emptyText="No required tool information has been added for this vehicle yet."
        />
      );

    case 'photos':
      return (
        <GenericSection
          data={record?.photos}
          emptyText="No reference photos have been added for this vehicle yet."
        />
      );

    case 'notes':
      return (
        <View>
          {vehicleInformation.notes ? (
            <Text style={styles.bodyText}>
              {vehicleInformation.notes}
            </Text>
          ) : null}

          {record?.notes ? (
            <Text style={styles.bodyText}>
              {normaliseDisplayValue(
                record.notes,
              )}
            </Text>
          ) : null}

          {Array.isArray(
            record?.common_problems,
          ) ? (
            <View style={styles.warningBox}>
              <View style={styles.warningHeader}>
                <Ionicons
                  name="warning-outline"
                  size={21}
                  color="#FBBF24"
                />

                <Text style={styles.warningTitle}>
                  Common problems
                </Text>
              </View>

              {record.common_problems.map(
                (problem, index) => (
                  <BulletRow
                    key={`problem-${index}`}
                    text={problem}
                  />
                ),
              )}
            </View>
          ) : null}

          {!record?.notes &&
          !vehicleInformation.notes &&
          !record?.common_problems?.length ? (
            <EmptySectionText text="No notes or warnings have been added for this vehicle yet." />
          ) : null}
        </View>
      );

    default:
      return <EmptySectionText />;
  }
}

function DashboardTile({
  title,
  icon,
  available,
  active,
  onPress,
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.dashboardTile,
        active && styles.dashboardTileActive,
        pressed && styles.tilePressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.tileIconBox}>
        <AutomotiveIcon
          name={icon}
          size={47}
          color={
            active
              ? '#FFFFFF'
              : '#BFDBFE'
          }
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
            : styles.emptyDot,
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
  emptyText,
}) {
  if (!hasObjectContent(data)) {
    return (
      <EmptySectionText text={emptyText} />
    );
  }

  if (Array.isArray(data)) {
    return (
      <View>
        {data.map((item, index) => (
          <BulletRow
            key={`item-${index}`}
            text={normaliseDisplayValue(
              item,
            )}
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
            value={normaliseDisplayValue(
              value,
            )}
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
  if (
    value === undefined ||
    value === null ||
    value === '' ||
    (
      Array.isArray(value) &&
      value.length === 0
    )
  ) {
    return null;
  }

  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text style={styles.infoValue}>
        {normaliseDisplayValue(value)}
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
        {String(text)}
      </Text>
    </View>
  );
}

function EmptySectionText({
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

function SummaryBadge({
  text,
}) {
  return (
    <View style={styles.summaryBadge}>
      <Text style={styles.summaryBadgeText}>
        {text}
      </Text>
    </View>
  );
}

function formatYearRange(vehicle) {
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

function hasObjectContent(value) {
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

function hasTextMatch(
  value,
  phrase,
) {
  try {
    return JSON.stringify(value)
      .toLowerCase()
      .includes(phrase.toLowerCase());
  } catch {
    return false;
  }
}

function hasToolsContent(record) {
  return hasObjectContent(
    extractTools(record),
  );
}

function extractTools(record) {
  return (
    record?.tools ||
    record?.required_tools ||
    record?.tool_requirements ||
    record?.procedures?.required_tools ||
    record?.operations?.required_tools ||
    null
  );
}

function normaliseDisplayValue(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return '';
  }

  if (Array.isArray(value)) {
    return value
      .map(normaliseDisplayValue)
      .filter(Boolean)
      .join(', ');
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .map(
        ([key, nestedValue]) =>
          `${formatLabel(key)}: ${normaliseDisplayValue(
            nestedValue,
          )}`,
      )
      .join('\n');
  }

  return String(value);
}

function formatLabel(value) {
  return String(value || '')
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
    marginBottom: 18,
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
  summaryBadge: {
    borderRadius: 999,
    backgroundColor: '#1E293B',
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  summaryBadgeText: {
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
  dashboardTile: {
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
  dashboardTileActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#60A5FA',
  },
  tilePressed: {
    opacity: 0.82,
    transform: [
      {
        scale: 0.975,
      },
    ],
  },
  tileIconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor:
      'rgba(37,99,235,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 9,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 7,
  },
  availableDot: {
    backgroundColor: '#22C55E',
  },
  emptyDot: {
    backgroundColor: '#64748B',
  },
  statusText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 3,
  },
  activeSectionCard: {
    borderRadius: 19,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#283449',
    padding: 16,
  },
  activeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
  },
  activeSectionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#172554',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSectionTitle: {
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
    marginBottom: 11,
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
  warningBox: {
    marginTop: 12,
    padding: 13,
    borderRadius: 14,
    backgroundColor: '#422006',
    borderWidth: 1,
    borderColor: '#92400E',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  warningTitle: {
    color: '#FDE68A',
    fontWeight: '900',
    marginLeft: 8,
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
});
