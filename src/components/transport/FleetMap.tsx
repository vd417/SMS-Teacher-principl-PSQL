import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors, Radii } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { decodePolyline } from '@/lib/decodePolyline';
import type { RouteGeometryDTO } from '@/data/http/routeGeometry.repo';
import { STATUS_COLOR } from './FleetBusCard';
import type { MappableBus } from './mappableBus';

interface Props {
  buses: MappableBus[];
  selectedBusId?: string | null;
  onSelectBus?: (busId: string) => void;
  routeGeometry?: RouteGeometryDTO;
}

const RouteUnavailableBadge: React.FC = () => (
  <View style={styles.unavailableBadge}>
    <Text style={styles.unavailableBadgeText}>Route unavailable</Text>
  </View>
);

export const FleetMap: React.FC<Props> = ({ buses, selectedBusId, onSelectBus, routeGeometry }) => {
  const mapRef = useRef<MapView>(null);

  const located = useMemo(
    () =>
      buses.filter(
        (b): b is MappableBus & { lat: number; lng: number } => b.lat != null && b.lng != null
      ),
    [buses]
  );

  if (located.length === 0) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>No live GPS pings from the fleet yet</Text>
      </View>
    );
  }

  const center = {
    latitude: located.reduce((sum, b) => sum + b.lat, 0) / located.length,
    longitude: located.reduce((sum, b) => sum + b.lng, 0) / located.length,
  };

  const selectedBus = selectedBusId ? buses.find((b) => b.busId === selectedBusId) : undefined;
  const roadPath =
    routeGeometry?.status === 'available' && routeGeometry.geometry
      ? decodePolyline(routeGeometry.geometry)
      : undefined;

  return (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          ...center,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        }}
      >
        {located.map((bus) => {
          const selected = bus.busId === selectedBusId;
          return (
            <Marker
              key={bus.busId}
              coordinate={{ latitude: bus.lat, longitude: bus.lng }}
              title={bus.busNo}
              pinColor={STATUS_COLOR[bus.status]}
              zIndex={selected ? 999 : undefined}
              onPress={() => onSelectBus?.(bus.busId)}
            />
          );
        })}
        {roadPath && selectedBus ? (
          <Polyline
            coordinates={roadPath}
            strokeColor={STATUS_COLOR[selectedBus.status]}
            strokeWidth={4}
          />
        ) : null}
      </MapView>
      {selectedBus && routeGeometry?.status === 'unavailable' ? <RouteUnavailableBadge /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: { position: 'relative' },
  map: { width: '100%', height: 260, borderRadius: Radii.lg },
  placeholder: {
    height: 140,
    borderRadius: Radii.lg,
    backgroundColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { fontFamily: FontFamily.medium, fontSize: 13, color: Colors.inkMuted },
  unavailableBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: Colors.inkMuted + '22',
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  unavailableBadgeText: { fontFamily: FontFamily.semiBold, fontSize: 11, color: Colors.inkMuted },
});
