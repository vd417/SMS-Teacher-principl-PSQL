import type { NavigationProp, ParamListBase } from '@react-navigation/native';

/** Open the More features grid (works from nested stack screens). */
export function navigateToMoreScreen(
  navigation: NavigationProp<ParamListBase>,
  isPrincipal = false
) {
  const homeTab = isPrincipal ? 'PHome' : 'Home';
  const moreScreen = isPrincipal ? 'PrincipalMoreScreen' : 'MoreScreen';

  let nav: NavigationProp<ParamListBase> | undefined = navigation;
  while (nav) {
    const state = nav.getState();
    if (state.routeNames.includes(homeTab)) {
      nav.navigate(homeTab, { screen: moreScreen });
      return;
    }
    if (state.routeNames.includes(moreScreen)) {
      nav.navigate(moreScreen);
      return;
    }
    nav = nav.getParent();
  }
}
