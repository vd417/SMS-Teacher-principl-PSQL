import React from 'react';
import { BusRouteFallback } from './BusRouteFallback';
import type { Bus, BusPosition } from '@/data/domain';
import type { RouteGeometryDTO } from '@/data/http/routeGeometry.repo';

interface Props {
  bus: Bus;
  position?: BusPosition;
  // Accepted for prop parity with BusMap.web.tsx (and to keep BusScreen.tsx's call site
  // platform-agnostic); unused here since this native view is a stop-list timeline, not a
  // real map — there's no polyline surface to render a road-following route onto.
  routeGeometry?: RouteGeometryDTO;
}

export const BusMap: React.FC<Props> = ({ bus, position }) => (
  <BusRouteFallback bus={bus} position={position} />
);
