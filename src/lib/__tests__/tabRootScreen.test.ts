import { tabRootScreen, shouldPopTabStack } from '../tabRootScreen';

test('tabRootScreen returns the role home root for Home and PHome', () => {
  expect(tabRootScreen('Home')).toBe('HomeScreen');
  expect(tabRootScreen('PHome')).toBe('PrincipalHomeScreen');
});

test('shouldPopTabStack is true only when the tab is already focused', () => {
  expect(shouldPopTabStack(true)).toBe(true);
  expect(shouldPopTabStack(false)).toBe(false);
});
