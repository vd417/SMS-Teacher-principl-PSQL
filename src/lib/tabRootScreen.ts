const TAB_ROOT: Record<string, string> = {
  Home: 'HomeScreen',
  PHome: 'PrincipalHomeScreen',
  Classes: 'ClassHubScreen',
  PClasses: 'ClassHubScreen',
  Inbox: 'ChatScreen',
  PInbox: 'ChatScreen',
  Profile: 'ProfileScreen',
  PProfile: 'ProfileScreen',
};

export function tabRootScreen(tabName: string): string | undefined {
  return TAB_ROOT[tabName];
}

export function shouldPopTabStack(isFocused: boolean): boolean {
  return isFocused;
}
