import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii } from '../../theme';
import { FontFamily } from '../../theme/typography';
import type { Bus, BusPosition } from '@/data/domain';

interface Props {
  bus: Bus;
  position?: BusPosition;
}

const ROW_HEIGHT = 64;

export const BusRouteFallback: React.FC<Props> = ({ bus, position }) => {
  const idx = position?.currentStopIndex ?? 0;
  const progress = position?.progress ?? 0;
  // Bus marker vertical offset: between current stop row and the next.
  const markerTop = (idx + Math.min(progress, 1)) * ROW_HEIGHT;

  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        <View style={[styles.busMarker, { top: markerTop }]}>
          <Ionicons name="bus" size={16} color={Colors.white} />
        </View>
      </View>
      <View style={styles.stops}>
        {bus.stops.map((stop, i) => {
          const passed = i < idx || (i === idx && progress >= 1);
          return (
            <View key={stop.id} style={[styles.stopRow, { height: ROW_HEIGHT }]}>
              <View style={[styles.dot, passed && styles.dotPassed]} />
              <View style={styles.stopText}>
                <Text style={styles.stopName}>{stop.name}</Text>
                <Text style={styles.stopTime}>{stop.time}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: Colors.paper,
    borderRadius: Radii.lg,
    padding: 16,
  },
  track: { width: 28, alignItems: 'center', position: 'relative' },
  busMarker: {
    position: 'absolute',
    left: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    zIndex: 2,
  },
  stops: { flex: 1 },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.rule, marginLeft: -22 },
  dotPassed: { backgroundColor: Colors.primary },
  stopText: { flex: 1 },
  stopName: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.ink },
  stopTime: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted, marginTop: 2 },
});
