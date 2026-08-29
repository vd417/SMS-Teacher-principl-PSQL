import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';

const TAB_ICONS: Record<
  string,
  { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }
> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Timetable: { active: 'calendar', inactive: 'calendar-outline' },
  Classes: { active: 'school', inactive: 'school-outline' },
  Inbox: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
  PHome: { active: 'home', inactive: 'home-outline' },
  PClasses: { active: 'school', inactive: 'school-outline' },
  Approvals: { active: 'clipboard', inactive: 'clipboard-outline' },
  PInbox: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  PProfile: { active: 'person', inactive: 'person-outline' },
};

const TAB_LABELS: Record<string, string> = {
  Home: 'Home',
  Timetable: 'Timetable',
  Classes: 'Classes',
  Inbox: 'Inbox',
  Profile: 'Me',
  PHome: 'Home',
  PClasses: 'Classes',
  Approvals: 'Approvals',
  PInbox: 'Inbox',
  PProfile: 'Me',
};

export const TabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const icons = TAB_ICONS[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };
          const label = TAB_LABELS[route.name] ?? route.name;
          const compact = state.routes.length >= 6;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabItem
              key={route.key}
              isFocused={isFocused}
              icon={isFocused ? icons.active : icons.inactive}
              label={label}
              compact={compact}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
};

interface TabItemProps {
  isFocused: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  compact?: boolean;
  onPress: () => void;
}

const TabItem: React.FC<TabItemProps> = ({ isFocused, icon, label, compact, onPress }) => {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.88, { damping: 10, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 10, stiffness: 300 });
    });
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.tab} activeOpacity={0.8}>
      <Animated.View
        style={[
          styles.iconWrap,
          compact && styles.iconWrapCompact,
          isFocused && styles.iconWrapActive,
          isFocused && compact && styles.iconWrapActiveCompact,
          animStyle,
        ]}
      >
        <Ionicons
          name={icon}
          size={compact ? 20 : 22}
          color={isFocused ? Colors.white : Colors.inkMuted}
        />
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          compact && styles.tabLabelCompact,
          isFocused && styles.tabLabelActive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 8,
    backgroundColor: Colors.paper,
    borderTopWidth: 1,
    borderTopColor: Colors.rule,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radii.xxl,
    paddingVertical: 8,
    paddingHorizontal: 8,
    ...Shadows.pop,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    gap: 4,
  },
  iconWrap: {
    width: 40,
    height: 32,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: Colors.primary,
    width: 56,
    borderRadius: Radii.xl,
  },
  iconWrapCompact: { width: 36, height: 28 },
  iconWrapActiveCompact: { width: 48 },
  tabLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: Colors.inkMuted,
  },
  tabLabelCompact: { fontSize: 9 },
  tabLabelActive: {
    color: Colors.primary,
    fontFamily: FontFamily.bold,
  },
});
