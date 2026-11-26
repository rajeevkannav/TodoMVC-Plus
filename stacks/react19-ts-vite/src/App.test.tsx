import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import App from './App';

test('renders todo header', () => {
  render(<App />);
  expect(screen.getByText('Todos')).toBeDefined();
});