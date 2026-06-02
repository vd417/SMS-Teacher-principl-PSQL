import React from 'react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { env } from '@/config/env';
import { BusRouteFallback } from './BusRouteFallback';
import type { Bus, BusPosition } from '@/data/domain';

interface Props {
  bus: Bus;
  position?: BusPosition;
}

const containerStyle = { width: '100%', height: '280px', borderRadius: '16px' };

export const BusMap: React.FC<Props> = ({ bus, position }) => {
  const apiKey = env.GOOGLE_MAPS_API_KEY;
  const { isLoaded } = useJsApiLoader({
    id: 'bus-map',
    googleMapsApiKey: apiKey,
  });

  // No key (or not yet loaded) -> stylized fallback so the screen never looks broken.
  if (!apiKey || !isLoaded) {
    return <BusRouteFallback bus={bus} position={position} />;
  }

  const center = position
    ? { lat: position.lat, lng: position.lng }
    : { lat: bus.stops[0].lat, lng: bus.stops[0].lng };

  return (
    <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={14}>
      {bus.stops.map((s) => (
        <MarkerF key={s.id} position={{ lat: s.lat, lng: s.lng }} label={String(s.order + 1)} />
      ))}
      {position && <MarkerF position={{ lat: position.lat, lng: position.lng }} label="B" />}
    </GoogleMap>
  );
};
