import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GoogleMap, PolylineF } from '@react-google-maps/api';
import { Colors, Radii } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { decodePolyline } from '@/lib/decodePolyline';
import { fitGoogleMap, useGoogleMapsScript } from '@/lib/useGoogleMaps';
import { busMapCenter } from '@/lib/busMapCenter';
import { GooglePin } from '@/components/transport/GooglePin.web';
import { BusRouteFallback } from './BusRouteFallback';
import type { RouteGeometryDTO } from '@/data/http/routeGeometry.repo';
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
  const { apiKey, mapId, isLoaded } = useGoogleMapsScript();
  const mapRef = useRef<google.maps.Map | null>(null);
  const livePosition = useMemo(() => {
    if (typeof position?.lat !== 'number' || typeof position?.lng !== 'number') return undefined;
    if (!Number.isFinite(position.lat) || !Number.isFinite(position.lng)) return undefined;
    return { lat: position.lat, lng: position.lng };
  }, [position?.lat, position?.lng]);
  const liveRef = useRef(livePosition);
  liveRef.current = livePosition;

  const center = busMapCenter(position, bus.stops);
  const centerRef = useRef(center);
  if (center && !centerRef.current) centerRef.current = center;

  const roadPath = useMemo(
    () =>
      routeGeometry?.status === 'available' && routeGeometry.geometry
        ? decodePolyline(routeGeometry.geometry).map((p) => ({ lat: p.latitude, lng: p.longitude }))
        : undefined,
    [routeGeometry?.status, routeGeometry?.geometry]
  );
  const routePoints = useMemo(() => {
    if (roadPath && roadPath.length > 1) return roadPath;
    return bus.stops
      .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
      .map((s) => ({ lat: s.lat, lng: s.lng }));
  }, [roadPath, bus.stops]);

  const fit = useCallback(() => {
    if (!mapRef.current) return;
    const current = liveRef.current;
    fitGoogleMap(mapRef.current, current ? [...routePoints, current] : routePoints);
  }, [routePoints]);

  const hasLive = livePosition != null;
  useEffect(() => {
    fit();
  }, [fit, hasLive]);

  if (!apiKey || !isLoaded || !center || !centerRef.current) {
    return <BusRouteFallback bus={bus} position={position} />;
  }

  return (
    <View style={styles.mapContainer}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={centerRef.current}
        zoom={14}
        options={mapId ? { mapId } : undefined}
        onLoad={(map) => {
          mapRef.current = map;
          fit();
        }}
      >
        {roadPath && roadPath.length > 1 ? (
          <>
            <PolylineF
              path={roadPath}
              options={{
                strokeColor: Colors.white,
                strokeWeight: 8,
                strokeOpacity: 0.95,
                zIndex: 1,
              }}
            />
            <PolylineF
              path={roadPath}
              options={{ strokeColor: Colors.indigo, strokeWeight: 5, zIndex: 2 }}
            />
          </>
        ) : null}
        {bus.stops.map((stop) =>
          Number.isFinite(stop.lat) && Number.isFinite(stop.lng) ? (
            <GooglePin
              key={stop.id}
              position={{ lat: stop.lat, lng: stop.lng }}
              label={String(stop.order + 1)}
              background={Colors.white}
              color={Colors.ink}
              borderColor={Colors.indigo}
              zIndex={3}
            />
          ) : null
        )}
        {livePosition ? (
          <GooglePin
            position={livePosition}
            label={bus.number}
            icon="bus"
            heading={position?.heading}
            speedKmh={position?.speedKmh}
            zIndex={10}
          />
        ) : null}
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
    backgroundColor: Colors.white,
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  unavailableBadgeText: { fontFamily: FontFamily.semiBold, fontSize: 11, color: Colors.inkMuted },
});
