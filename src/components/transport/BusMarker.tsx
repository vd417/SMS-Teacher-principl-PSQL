import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { FontFamily } from '@/theme/typography';
import { BUS_BODY_COLOR, busStatusColor } from '@/lib/busIcons';

type Props = {
  busNo: string;
  heading?: number;
  speedKmh?: number;
  selected?: boolean;
};

/** Yellow school-bus glyph from the admin live map. The route line stays a separate color. */
export const SchoolBusIcon: React.FC<{ heading?: number; size?: number }> = ({
  heading = 0,
  size = 26,
}) => (
  <View style={{ width: size, height: size, transform: [{ rotate: `${heading}deg` }] }}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect
        x={5}
        y={2}
        width={14}
        height={20}
        rx={4}
        fill={BUS_BODY_COLOR}
        stroke="#1f2937"
        strokeWidth={1}
      />
      <Rect x={7} y={4.5} width={10} height={2.5} rx={0.5} fill="#1f2937" />
      <Rect
        x={7}
        y={8.5}
        width={10}
        height={9}
        rx={1}
        fill="#fff9db"
        stroke="#1f2937"
        strokeWidth={0.6}
      />
      <Line x1={12} y1={8.5} x2={12} y2={17.5} stroke="#1f2937" strokeWidth={0.6} />
      <Rect x={3.5} y={6} width={1.6} height={3} rx={0.6} fill="#1f2937" />
      <Rect x={18.9} y={6} width={1.6} height={3} rx={0.6} fill="#1f2937" />
      <Rect x={3.5} y={15} width={1.6} height={3} rx={0.6} fill="#1f2937" />
      <Rect x={18.9} y={15} width={1.6} height={3} rx={0.6} fill="#1f2937" />
    </Svg>
  </View>
);

/** Same live-bus marker as the admin panel: yellow bus, status dot, colored bus number. */
export const BusMarker: React.FC<Props> = ({ busNo, heading = 0, speedKmh, selected = false }) => {
  const color = busStatusColor(speedKmh);
  const label = speedKmh != null ? `${busNo} · ${Math.round(speedKmh)} km/h` : busNo;
  return (
    <View style={styles.row} collapsable={false}>
      <View style={styles.iconWrap}>
        <SchoolBusIcon heading={heading} />
        <View style={[styles.dot, { backgroundColor: color }, selected && styles.dotSelected]} />
      </View>
      <View style={[styles.label, { backgroundColor: color }]}>
        <Text style={styles.labelText} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconWrap: { width: 26, height: 26 },
  dot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  dotSelected: { borderColor: '#0f172a' },
  label: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 120,
  },
  labelText: { fontFamily: FontFamily.bold, fontSize: 11, color: '#fff' },
});
