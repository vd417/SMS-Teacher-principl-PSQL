import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { env } from '@/config/env';
import { Colors, Radii } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { decodePolyline } from '@/lib/decodePolyline';
import { fleetMapFocus } from '@/lib/busMapCenter';
import { placeBusIcons, assignRouteColors } from '@/lib/busIcons';
import type { RouteGeometryDTO } from '@/data/http/routeGeometry.repo';
import type { MappableBus } from './mappableBus';
import { BusMarker } from './BusMarker';

interface Props {
  buses: MappableBus[];
  selectedBusId?: string | null;
  onSelectBus?: (busId: string) => void;
  routeGeometry?: RouteGeometryDTO;
  /** Every CRM route on the fleet, so each route and each bus can be drawn together. */
  routes?: RouteGeometryDTO[];
}

const RouteUnavailableBadge: React.FC = () => (
  <View style={styles.unavailableBadge}>
    <Text style={styles.unavailableBadgeText}>Route unavailable</Text>
  </View>
);

export const FleetMap: React.FC<Props> = ({
  buses,
  selectedBusId,
  onSelectBus,
  routeGeometry,
  routes,
}) => {
  const mapRef = useRef<MapView>(null);

  const drawnRoutes = useMemo(() => {
    const source = routes && routes.length > 0 ? routes : routeGeometry ? [routeGeometry] : [];
    const colors = assignRouteColors(source.map((route) => route.routeId));
    return source.flatMap((route) => {
      if (route.status !== 'available' || !route.geometry) return [];
      const path = decodePolyline(route.geometry).map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        lat: point.latitude,
        lng: point.longitude,
      }));
      if (path.length < 2) return [];
      return [{ routeId: route.routeId, color: colors.get(route.routeId) ?? '#1D4ED8', path }];
    });
  }, [routes, routeGeometry]);

  const busIcons = useMemo(
    () =>
      placeBusIcons(
        buses,
        drawnRoutes.map((route) => ({
          routeId: route.routeId,
          path: route.path.map((point) => ({ lat: point.lat, lng: point.lng })),
        }))
      ),
    [buses, drawnRoutes]
  );

  const selectedBus = selectedBusId ? buses.find((b) => b.busId === selectedBusId) : undefined;
  const stopPoints = useMemo(
    () =>
      (selectedBus?.stops ?? []).filter(
        (stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng)
      ),
    [selectedBus?.stops]
  );
  const routePoints = useMemo(
    () =>
      drawnRoutes.flatMap((route) =>
        route.path.map((point) => ({ lat: point.lat, lng: point.lng }))
      ),
    [drawnRoutes]
  );
  const focus = fleetMapFocus(
    busIcons,
    routePoints,
    stopPoints.map((stop) => ({ lat: stop.lat, lng: stop.lng }))
  );

  const fitRoute = useCallback(() => {
    if (!mapRef.current) return;
    const coordinates = [
      ...drawnRoutes.flatMap((route) =>
        route.path.map((point) => ({ latitude: point.latitude, longitude: point.longitude }))
      ),
      ...stopPoints.map((stop) => ({ latitude: stop.lat, longitude: stop.lng })),
      ...busIcons.map((bus) => ({ latitude: bus.lat, longitude: bus.lng })),
    ];
    if (coordinates.length === 0) return;
    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
      animated: false,
    });
  }, [drawnRoutes, stopPoints, busIcons]);

  useEffect(() => {
    fitRoute();
  }, [fitRoute]);

  if (!focus) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>No live GPS pings from the fleet yet</Text>
      </View>
    );
  }

  const center = { latitude: focus.lat, longitude: focus.lng };

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
          ...center,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        }}
        onMapReady={fitRoute}
      >
        {drawnRoutes.map((route) => {
          const selected = selectedBus?.routeId === route.routeId;
          return (
            <React.Fragment key={route.routeId}>
              {selected ? (
                <Polyline
                  coordinates={route.path}
                  strokeColor={Colors.white}
                  strokeWidth={8}
                  zIndex={1}
                />
              ) : null}
              <Polyline
                coordinates={route.path}
                strokeColor={route.color}
                strokeWidth={selected ? 5 : 4}
                zIndex={selected ? 2 : 1}
              />
            </React.Fragment>
          );
        })}
        {stopPoints.map((stop) => (
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
        ))}
        {busIcons.map((bus) => {
          const selected = bus.busId === selectedBusId;
          return (
            <Marker
              key={bus.busId}
              coordinate={{ latitude: bus.lat, longitude: bus.lng }}
              title={bus.busNo}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={selected ? 10 : 4}
              onPress={() => onSelectBus?.(bus.busId)}
            >
              <BusMarker
                busNo={bus.busNo}
                heading={bus.heading}
                speedKmh={bus.speedKmh}
                selected={selected}
              />
            </Marker>
          );
        })}
      </MapView>
      {selectedBus && routeGeometry?.status === 'unavailable' ? <RouteUnavailableBadge /> : null}
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
  map: { width: '100%', height: 260 },
  busPill: {
    minHeight: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  busPillSelected: { borderColor: '#0F172A' },
  busPillText: { fontFamily: FontFamily.bold, fontSize: 11, color: Colors.white },
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
    backgroundColor: Colors.white,
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  unavailableBadgeText: { fontFamily: FontFamily.semiBold, fontSize: 11, color: Colors.inkMuted },
});
