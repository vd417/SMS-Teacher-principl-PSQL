import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { env } from '@/config/env';
import { BusMarker } from '@/components/transport/BusMarker';
import { Colors, Radii } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { decodePolyline } from '@/lib/decodePolyline';
import { busMapCenter } from '@/lib/busMapCenter';
import { BusRouteFallback } from './BusRouteFallback';
import type { Bus, BusPosition } from '@/data/domain';
import type { RouteGeometryDTO } from '@/data/http/routeGeometry.repo';

interface Props {
  bus: Bus;
  position?: BusPosition;
  routeGeometry?: RouteGeometryDTO;
}

type Coord = { latitude: number; longitude: number };

const RouteUnavailableBadge: React.FC = () => (
  <View style={styles.unavailableBadge}>
    <Text style={styles.unavailableBadgeText}>Route unavailable</Text>
  </View>
);

export const BusMap: React.FC<Props> = ({ bus, position, routeGeometry }) => {
  const mapRef = useRef<MapView>(null);
  const apiKey = env.GOOGLE_MAPS_API_KEY;
  const live = useMemo<Coord | undefined>(() => {
    if (typeof position?.lat !== 'number' || typeof position?.lng !== 'number') return undefined;
    if (!Number.isFinite(position.lat) || !Number.isFinite(position.lng)) return undefined;
    return { latitude: position.lat, longitude: position.lng };
  }, [position?.lat, position?.lng]);
  const liveRef = useRef(live);
  liveRef.current = live;

  const center = busMapCenter(position, bus.stops);
  const roadPath = useMemo(
    () =>
      routeGeometry?.status === 'available' && routeGeometry.geometry
        ? decodePolyline(routeGeometry.geometry)
        : undefined,
    [routeGeometry?.status, routeGeometry?.geometry]
  );
  const routeFrame = useMemo<Coord[]>(() => {
    if (roadPath && roadPath.length > 1) return roadPath;
    return bus.stops
      .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
      .map((s) => ({ latitude: s.lat, longitude: s.lng }));
  }, [roadPath, bus.stops]);

  const fit = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const current = liveRef.current;
    const coords = current ? [...routeFrame, current] : routeFrame;
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.animateToRegion(
        {
          latitude: coords[0].latitude,
          longitude: coords[0].longitude,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        },
        1
      );
      return;
    }
    map.fitToCoordinates(coords, {
      edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
      animated: false,
    });
  }, [routeFrame]);

  const hasLive = live != null;
  useEffect(() => {
    fit();
  }, [fit, hasLive]);

  if (!apiKey || !center) {
    return <BusRouteFallback bus={bus} position={position} />;
  }

  const driverTitle = bus.driver?.trim() ? `Driver: ${bus.driver}` : bus.number;

  return (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        googleMapId={env.GOOGLE_MAPS_MAP_ID || undefined}
        loadingEnabled
        loadingIndicatorColor={Colors.primary}
        loadingBackgroundColor={Colors.paper}
        initialRegion={{
          latitude: center.lat,
          longitude: center.lng,
          latitudeDelta: 0.12,
          longitudeDelta: 0.12,
        }}
        onMapReady={fit}
      >
        {roadPath && roadPath.length > 1 ? (
          <>
            <Polyline
              coordinates={roadPath}
              strokeColor={Colors.white}
              strokeWidth={8}
              zIndex={1}
            />
            <Polyline
              coordinates={roadPath}
              strokeColor={Colors.indigo}
              strokeWidth={5}
              zIndex={2}
            />
          </>
        ) : null}
        {bus.stops.map((stop) =>
          Number.isFinite(stop.lat) && Number.isFinite(stop.lng) ? (
            <Marker
              key={stop.id}
              coordinate={{ latitude: stop.lat, longitude: stop.lng }}
              title={stop.name}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={3}
            >
              <View collapsable={false} style={styles.stopPin}>
                <Text style={styles.stopPinText}>{stop.order + 1}</Text>
              </View>
            </Marker>
          ) : null
        )}
        {live ? (
          <Marker
            key="driver"
            coordinate={live}
            title={driverTitle}
            description={bus.number}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={10}
          >
            <BusMarker
              busNo={bus.number}
              heading={position?.heading}
              speedKmh={position?.speedKmh}
            />
          </Marker>
        ) : null}
      </MapView>
      {routeGeometry?.status === 'unavailable' ? <RouteUnavailableBadge /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    position: 'relative',
    borderRadius: Radii.lg,
    overflow: 'hidden',
    backgroundColor: Colors.paper,
  },
  map: { width: '100%', height: 280 },
  stopPin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopPinText: { fontFamily: FontFamily.bold, fontSize: 10, color: Colors.ink },
  unavailableBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: Colors.white,
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  unavailableBadgeText: { fontFamily: FontFamily.semiBold, fontSize: 11, color: Colors.inkMuted },
});
