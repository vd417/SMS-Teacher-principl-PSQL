import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GoogleMap, useJsApiLoader, MarkerF, PolylineF } from '@react-google-maps/api';
import { env } from '@/config/env';
import { Colors, Radii } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { decodePolyline } from '@/lib/decodePolyline';
import type { RouteGeometryDTO } from '@/data/http/routeGeometry.repo';
import { BusRouteFallback } from './BusRouteFallback';
import type { Bus, BusPosition } from '@/data/domain';

interface Props {
  bus: Bus;
  position?: BusPosition;
  routeGeometry?: RouteGeometryDTO;
}

const containerStyle = { width: '100%', height: '280px', borderRadius: '16px' };

const RouteUnavailableBadge: React.FC = () => (
  <View style={styles.unavailableBadge}>
    <Text style={styles.unavailableBadgeText}>Route unavailable</Text>
  </View>
);

export const BusMap: React.FC<Props> = ({ bus, position, routeGeometry }) => {
  const apiKey = env.GOOGLE_MAPS_API_KEY;
  const { isLoaded } = useJsApiLoader({
    id: 'bus-map',
    googleMapsApiKey: apiKey,
  });

  // No key (or not yet loaded) -> stylized fallback so the screen never looks broken.
  if (!apiKey || !isLoaded) {
    return <BusRouteFallback bus={bus} position={position} />;
  }

  // A bus that hasn't pinged yet has a `position` row but no lat/lng — fall back to the
  // first stop's coordinates for the map center, same as when there's no position at all.
  const livePosition =
    position && position.lat != null && position.lng != null
      ? { lat: position.lat, lng: position.lng }
      : undefined;
  const center = livePosition ?? { lat: bus.stops[0].lat, lng: bus.stops[0].lng };
  const roadPath =
    routeGeometry?.status === 'available' && routeGeometry.geometry
      ? decodePolyline(routeGeometry.geometry).map((p) => ({ lat: p.latitude, lng: p.longitude }))
      : undefined;

  return (
    <View style={styles.mapContainer}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={14}
        options={env.GOOGLE_MAPS_MAP_ID ? { mapId: env.GOOGLE_MAPS_MAP_ID } : undefined}
      >
        {bus.stops.map((s) => (
          <MarkerF key={s.id} position={{ lat: s.lat, lng: s.lng }} label={String(s.order + 1)} />
        ))}
        {livePosition && <MarkerF position={livePosition} label="B" />}
        {roadPath && (
          <PolylineF
            path={roadPath}
            options={{ strokeColor: Colors.primary, strokeWeight: 4, strokeOpacity: 0.85 }}
          />
        )}
      </GoogleMap>
      {routeGeometry?.status === 'unavailable' ? <RouteUnavailableBadge /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: { position: 'relative' },
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
