import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../../theme';
import { FontFamily } from '../../theme/typography';

interface DonutProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  label?: string;
  sublabel?: string;
  textColor?: string;
}

export const Donut: React.FC<DonutProps> = ({
  percentage,
  size = 100,
  strokeWidth = 10,
  color = Colors.primary,
  backgroundColor = Colors.ruleSoft,
  label,
  sublabel,
  textColor = Colors.ink,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const center = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={styles.inner}>
        {label ? (
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        ) : (
          <Text style={[styles.percentage, { color: textColor }]}>{percentage}%</Text>
        )}
        {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentage: {
    fontFamily: FontFamily.extraBold,
    fontSize: 20,
    color: Colors.ink,
  },
  label: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.ink,
  },
  sublabel: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.inkMuted,
    marginTop: 2,
  },
});
