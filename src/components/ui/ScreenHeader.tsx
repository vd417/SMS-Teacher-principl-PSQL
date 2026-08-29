import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { MoreFeaturesAvatar } from './MoreFeaturesAvatar';
import { useAuth } from '@/features/auth/AuthProvider';
import { navigateToMoreScreen } from '@/lib/navigateToMore';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** When omitted, shows back when navigation.canGoBack(). Pass false to hide on pushed screens. */
  showBack?: boolean;
  /** Overrides navigation.goBack() when the back button is shown. */
  onBack?: () => void;
  rightComponent?: React.ReactNode;
  /** Avatar with grid badge → More features screen. Defaults to true. */
  showMoreFeatures?: boolean;
  dark?: boolean;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  showBack,
  onBack,
  rightComponent,
  showMoreFeatures = true,
  dark = false,
}) => {
  const navigation = useNavigation();
  const { session } = useAuth();
  const user = session?.user;
  const isPrincipal = user?.role === 'principal';
  const showBackButton = showBack ?? navigation.canGoBack();
  const textColor = dark ? Colors.white : Colors.ink;
  const subColor = dark ? 'rgba(255,255,255,0.7)' : Colors.inkMuted;

  const openMore = () => navigateToMoreScreen(navigation, isPrincipal);

  const right =
    rightComponent || (showMoreFeatures && user) ? (
      <View style={styles.right}>
        {rightComponent}
        {showMoreFeatures && user ? <MoreFeaturesAvatar onPress={openMore} /> : null}
      </View>
    ) : null;

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {showBackButton && (
          <TouchableOpacity
            onPress={() => (onBack ? onBack() : navigation.goBack())}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={textColor} />
          </TouchableOpacity>
        )}
        <View>
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: subColor }]}>{subtitle}</Text> : null}
        </View>
      </View>
      {right}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: Colors.ink,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
