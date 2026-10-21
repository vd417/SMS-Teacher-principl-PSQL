import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GoogleMap, PolylineF } from '@react-google-maps/api';
import { Colors, Radii } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { decodePolyline } from '@/lib/decodePolyline';
import { fleetMapFocus } from '@/lib/busMapCenter';
import { placeBusIcons, assignRouteColors } from '@/lib/busIcons';
import { fitGoogleMap, useGoogleMapsScript } from '@/lib/useGoogleMaps';
import type { RouteGeometryDTO } from '@/data/http/routeGeometry.repo';
import { GooglePin } from './GooglePin.web';
import type { MappableBus } from './mappableBus';

interface Props {
  buses: MappableBus[];
  selectedBusId?: string | null;
  onSelectBus?: (busId: string) => void;
  routeGeometry?: RouteGeometryDTO;
  /** Every CRM route on the fleet, so each route and each bus can be drawn together. */
  routes?: RouteGeometryDTO[];
}

const containerStyle = { width: '100%', height: '260px', borderRadius: '16px' };

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
  const { apiKey, mapId, isLoaded } = useGoogleMapsScript();
  const mapRef = useRef<google.maps.Map | null>(null);

  const drawnRoutes = useMemo(() => {
    const source = routes && routes.length > 0 ? routes : routeGeometry ? [routeGeometry] : [];
    const colors = assignRouteColors(source.map((route) => route.routeId));
    return source.flatMap((route) => {
      if (route.status !== 'available' || !route.geometry) return [];
      const path = decodePolyline(route.geometry).map((point) => ({
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
        drawnRoutes.map((route) => ({ routeId: route.routeId, path: route.path }))
      ),
    [buses, drawnRoutes]
  );

  const selectedBus = selectedBusId ? buses.find((b) => b.busId === selectedBusId) : undefined;
  const stopPoints = useMemo(
    () =>
      (selectedBus?.stops ?? [])
        .filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng))
        .map((stop) => ({
          lat: stop.lat,
          lng: stop.lng,
          id: stop.id,
          order: stop.order,
          name: stop.name,
        })),
    [selectedBus?.stops]
  );

  const routePoints = useMemo(() => drawnRoutes.flatMap((route) => route.path), [drawnRoutes]);
  const focus = fleetMapFocus(busIcons, routePoints, stopPoints);
  const centerRef = useRef(focus);
  if (focus && !centerRef.current) centerRef.current = focus;

  const fitPoints = useMemo(
    () => [...routePoints, ...stopPoints, ...busIcons],
    [routePoints, stopPoints, busIcons]
  );

  const fitRoute = useCallback(() => {
    if (!mapRef.current || fitPoints.length === 0) return;
    fitGoogleMap(mapRef.current, fitPoints);
  }, [fitPoints]);

  useEffect(() => {
    fitRoute();
  }, [fitRoute]);

  if (!apiKey || !isLoaded) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Map unavailable</Text>
      </View>
    );
  }

  if (!centerRef.current) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>No live GPS pings from the fleet yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.mapContainer}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={centerRef.current}
        zoom={12}
        options={mapId ? { mapId } : undefined}
        onLoad={(map) => {
          mapRef.current = map;
          fitRoute();
        }}
      >
        {drawnRoutes.map((route) => {
          const selected = selectedBus?.routeId === route.routeId;
          return (
            <React.Fragment key={route.routeId}>
              {selected ? (
                <PolylineF
                  path={route.path}
                  options={{
                    strokeColor: Colors.white,
                    strokeWeight: 8,
                    strokeOpacity: 0.95,
                    zIndex: 1,
                  }}
                />
              ) : null}
              <PolylineF
                path={route.path}
                options={{
                  strokeColor: route.color,
                  strokeWeight: selected ? 5 : 4,
                  zIndex: selected ? 2 : 1,
                }}
              />
            </React.Fragment>
          );
        })}
        {stopPoints.map((stop) => (
          <GooglePin
            key={stop.id}
            position={{ lat: stop.lat, lng: stop.lng }}
            label={String(stop.order + 1)}
            background={Colors.white}
            color={Colors.ink}
            borderColor={Colors.indigo}
            zIndex={3}
          />
        ))}
        {busIcons.map((bus) => {
          const selected = bus.busId === selectedBusId;
          return (
            <GooglePin
              key={bus.busId}
              position={{ lat: bus.lat, lng: bus.lng }}
              label={bus.busNo}
              icon="bus"
              heading={bus.heading}
              speedKmh={bus.speedKmh}
              selected={selected}
              zIndex={selected ? 10 : 4}
              onPress={() => onSelectBus?.(bus.busId)}
            />
          );
        })}
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
    backgroundColor: Colors.white,
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  unavailableBadgeText: { fontFamily: FontFamily.semiBold, fontSize: 11, color: Colors.inkMuted },
});
