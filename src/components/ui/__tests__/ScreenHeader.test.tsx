import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ScreenHeader } from '../ScreenHeader';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockGetState = jest.fn(() => ({ routeNames: ['Home', 'MoreScreen'] }));
const mockGetParent = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    canGoBack: mockCanGoBack,
    goBack: mockGoBack,
    navigate: mockNavigate,
    getState: mockGetState,
    getParent: mockGetParent,
  }),
}));

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: {
      user: {
        role: 'teacher',
        initials: 'AB',
        name: 'Alice Brown',
        photoUrl: null,
      },
    },
  }),
}));

beforeEach(() => {
  mockGoBack.mockClear();
  mockCanGoBack.mockReset();
  mockNavigate.mockClear();
  mockGetState.mockReturnValue({ routeNames: ['Home', 'MoreScreen'] });
  mockGetParent.mockReturnValue(undefined);
});

test('shows back and calls goBack when navigation can go back', () => {
  mockCanGoBack.mockReturnValue(true);
  render(<ScreenHeader title="Teachers" showMoreFeatures={false} />);
  fireEvent.press(screen.getByLabelText('Go back'));
  expect(mockGoBack).toHaveBeenCalled();
});

test('hides back on tab roots when navigation cannot go back', () => {
  mockCanGoBack.mockReturnValue(false);
  render(<ScreenHeader title="Home" showMoreFeatures={false} />);
  expect(screen.queryByLabelText('Go back')).toBeNull();
});

test('onBack overrides navigation.goBack', () => {
  mockCanGoBack.mockReturnValue(true);
  const onBack = jest.fn();
  render(<ScreenHeader title="Teachers" showBack onBack={onBack} showMoreFeatures={false} />);
  fireEvent.press(screen.getByLabelText('Go back'));
  expect(onBack).toHaveBeenCalled();
  expect(mockGoBack).not.toHaveBeenCalled();
});

test('showBack=false hides back even when navigation can go back', () => {
  mockCanGoBack.mockReturnValue(true);
  render(<ScreenHeader title="Home" showBack={false} showMoreFeatures={false} />);
  expect(screen.queryByLabelText('Go back')).toBeNull();
});

test('more features avatar opens More screen', () => {
  mockCanGoBack.mockReturnValue(false);
  render(<ScreenHeader title="Chat" />);
  fireEvent.press(screen.getByLabelText('More features'));
  expect(mockNavigate).toHaveBeenCalledWith('Home', { screen: 'MoreScreen' });
});
