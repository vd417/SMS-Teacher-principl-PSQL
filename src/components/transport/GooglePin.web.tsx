import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { OverlayViewF, OVERLAY_MOUSE_TARGET } from '@react-google-maps/api';
import { FontFamily } from '@/theme/typography';
import { BusMarker } from './BusMarker';

type Props = {
  position: { lat: number; lng: number };
  label: string;
  background?: string;
  color?: string;
  borderColor?: string;
  zIndex?: number;
  onPress?: () => void;
  /** Bus number pill with a bus icon. Stop numbers stay text-only. */
  icon?: 'bus';
  /** Clockwise degrees from north. Used by the top-down bus. */
  heading?: number;
  selected?: boolean;
  speedKmh?: number;
};

// Cloud Map IDs use a vector map that does not draw the legacy Marker.
// An overlay pin still shows the bus / driver on that map.
const pinOffset = (width: number, height: number) => ({ x: -(width / 2), y: -(height / 2) });

export const GooglePin: React.FC<Props> = ({
  position,
  label,
  background = '#fff',
  color = '#fff',
  borderColor = '#fff',
  zIndex,
  onPress,
  icon,
  heading = 0,
  selected = false,
  speedKmh,
}) => {
  const body =
    icon === 'bus' ? (
      <BusMarker busNo={label} heading={heading} speedKmh={speedKmh} selected={selected} />
    ) : (
      <View style={[styles.pin, { backgroundColor: background, borderColor }]}>
        <Text style={[styles.label, { color }]}>{label}</Text>
      </View>
    );

  return (
    <OverlayViewF
      position={position}
      mapPaneName={OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={pinOffset}
      zIndex={zIndex}
    >
      {onPress ? <Pressable onPress={onPress}>{body}</Pressable> : body}
    </OverlayViewF>
  );
};

const styles = StyleSheet.create({
  pin: {
    alignSelf: 'flex-start',
    minHeight: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  label: { fontFamily: FontFamily.bold, fontSize: 11 },
});
