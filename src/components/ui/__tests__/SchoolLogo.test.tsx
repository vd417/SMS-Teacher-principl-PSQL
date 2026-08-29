import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SchoolLogo } from '../SchoolLogo';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

test('SchoolLogo shows image when logoUrl is set', () => {
  render(<SchoolLogo name="Westbrook Academy" logoUrl="https://cdn.example.com/logo.png" />);
  expect(screen.getByTestId('school-logo-image')).toBeTruthy();
});

test('light variant falls back to initials when no logo', () => {
  render(<SchoolLogo name="Westbrook Academy" logoUrl={null} />);
  expect(screen.getByTestId('school-logo-fallback')).toBeTruthy();
  expect(screen.getByText('WA')).toBeTruthy();
});

test('glass variant uses first letter in a white circle when no logo', () => {
  render(<SchoolLogo name="Westbrook Academy" logoUrl={null} variant="glass" />);
  expect(screen.getByTestId('school-logo-fallback')).toBeTruthy();
  expect(screen.getByText('W')).toBeTruthy();
});

test('glass variant shows image inside glass card when logoUrl is set', () => {
  render(
    <SchoolLogo
      name="Westbrook Academy"
      logoUrl="https://cdn.example.com/logo.png"
      variant="glass"
    />
  );
  expect(screen.getByTestId('school-logo-glass')).toBeTruthy();
  expect(screen.getByTestId('school-logo-image')).toBeTruthy();
});
