import React from 'react';
import { BusRouteFallback } from './BusRouteFallback';
import type { Bus, BusPosition } from '@/data/domain';

interface Props {
  bus: Bus;
  position?: BusPosition;
}

export const BusMap: React.FC<Props> = ({ bus, position }) => (
  <BusRouteFallback bus={bus} position={position} />
);
