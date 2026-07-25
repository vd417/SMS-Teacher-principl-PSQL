import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Avatar } from '../Avatar';

test('renders initials when no photoUri is given', () => {
  render(<Avatar initials="AR" />);
  expect(screen.getByText('AR')).toBeTruthy();
  expect(screen.queryByTestId('avatar-photo')).toBeNull();
});

test('renders the photo and hides initials when photoUri is set', () => {
  render(<Avatar initials="AR" photoUri="https://cdn.example.com/a.png" />);
  expect(screen.getByTestId('avatar-photo')).toBeTruthy();
  expect(screen.queryByText('AR')).toBeNull();
});

test('falls back to initials when photoUri is explicitly null', () => {
  render(<Avatar initials="AR" photoUri={null} />);
  expect(screen.getByText('AR')).toBeTruthy();
  expect(screen.queryByTestId('avatar-photo')).toBeNull();
});
