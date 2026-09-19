import type { NavigationProp, ParamListBase } from '@react-navigation/native';

// useNavigation()'s actual return type has a `getState()` that can return `undefined`
// (there may be no state yet for the top-most navigator), which isn't assignable to
// NavigationProp<ParamListBase>'s stricter `getState()` — accept that wider shape here
// instead of narrowing at every call site, and guard the `undefined` case below.
type AnyNavigation = Omit<NavigationProp<ParamListBase>, 'getState' | 'getParent'> & {
  getState: () => ReturnType<NavigationProp<ParamListBase>['getState']> | undefined;
  getParent: () => AnyNavigation | undefined;
};

/** Open the More features grid (works from nested stack screens). */
export function navigateToMoreScreen(navigation: AnyNavigation, isPrincipal = false) {
  const homeTab = isPrincipal ? 'PHome' : 'Home';
  const moreScreen = isPrincipal ? 'PrincipalMoreScreen' : 'MoreScreen';

  let nav: AnyNavigation | undefined = navigation;
  while (nav) {
    const state = nav.getState();
    if (state?.routeNames.includes(homeTab)) {
      nav.navigate(homeTab, { screen: moreScreen });
      return;
    }
    if (state?.routeNames.includes(moreScreen)) {
      nav.navigate(moreScreen);
      return;
    }
    nav = nav.getParent();
  }
}
