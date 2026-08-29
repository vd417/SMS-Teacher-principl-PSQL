import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme';
import { FontFamily } from '../../theme/typography';

interface GradeListViewMoreProps {
  hiddenCount: number;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}

export const GradeListViewMore: React.FC<GradeListViewMoreProps> = ({
  hiddenCount,
  expanded,
  onExpand,
  onCollapse,
}) => {
  if (hiddenCount > 0) {
    return (
      <TouchableOpacity style={styles.btn} onPress={onExpand} activeOpacity={0.85}>
        <Text style={styles.text}>
          View more ({hiddenCount} class{hiddenCount === 1 ? '' : 'es'})
        </Text>
      </TouchableOpacity>
    );
  }

  if (expanded) {
    return (
      <TouchableOpacity style={styles.btn} onPress={onCollapse} activeOpacity={0.85}>
        <Text style={styles.text}>View less</Text>
      </TouchableOpacity>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  text: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.primary,
  },
});
