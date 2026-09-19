import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GoogleMap, useJsApiLoader, MarkerF, PolylineF } from '@react-google-maps/api';
import { env } from '@/config/env';
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

const containerStyle = { width: '100%', height: '260px', borderRadius: '16px' };

const RouteUnavailableBadge: React.FC = () => (
  <View style={styles.unavailableBadge}>
    <Text style={styles.unavailableBadgeText}>Route unavailable</Text>
  </View>
);

export const FleetMap: React.FC<Props> = ({ buses, selectedBusId, onSelectBus, routeGeometry }) => {
  const apiKey = env.GOOGLE_MAPS_API_KEY;
  const { isLoaded } = useJsApiLoader({
    id: 'fleet-map',
    googleMapsApiKey: apiKey,
  });

  const located = useMemo(
    () =>
      buses.filter(
        (b): b is MappableBus & { lat: number; lng: number } => b.lat != null && b.lng != null
      ),
    [buses]
  );

  if (!apiKey || !isLoaded) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Map unavailable</Text>
      </View>
    );
  }

  if (located.length === 0) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>No live GPS pings from the fleet yet</Text>
      </View>
    );
  }

  const center = {
    lat: located.reduce((sum, b) => sum + b.lat, 0) / located.length,
    lng: located.reduce((sum, b) => sum + b.lng, 0) / located.length,
  };

  const selectedBus = selectedBusId ? buses.find((b) => b.busId === selectedBusId) : undefined;
  const roadPath =
    routeGeometry?.status === 'available' && routeGeometry.geometry
      ? decodePolyline(routeGeometry.geometry).map((p) => ({ lat: p.latitude, lng: p.longitude }))
      : undefined;

  return (
    <View style={styles.mapContainer}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        options={env.GOOGLE_MAPS_MAP_ID ? { mapId: env.GOOGLE_MAPS_MAP_ID } : undefined}
      >
        {located.map((bus) => {
          const selected = bus.busId === selectedBusId;
          const scale = selected ? 1.6 : 1;
          return (
            <MarkerF
              key={bus.busId}
              position={{ lat: bus.lat, lng: bus.lng }}
              label={{ text: bus.busNo, color: '#fff', fontSize: '10px' }}
              zIndex={selected ? 999 : undefined}
              icon={{
                path: 'M -8,-8 8,-8 8,8 -8,8 Z',
                fillColor: STATUS_COLOR[bus.status],
                fillOpacity: 1,
                strokeColor: selected ? Colors.ink : undefined,
                strokeWeight: selected ? 3 : 0,
                scale,
              }}
              onClick={() => onSelectBus?.(bus.busId)}
            />
          );
        })}
        {roadPath && selectedBus ? (
          <PolylineF
            path={roadPath}
            options={{
              strokeColor: STATUS_COLOR[selectedBus.status],
              strokeWeight: 4,
              strokeOpacity: 0.85,
            }}
          />
        ) : null}
      </GoogleMap>
      {selectedBus && routeGeometry?.status === 'unavailable' ? <RouteUnavailableBadge /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: { position: 'relative' },
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
