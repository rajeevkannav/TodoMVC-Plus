import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './main';

describe('App', () => {
  it('renders the title', () => {
    render(<App />);
    expect(screen.getByText('TodoMVC+')).toBeDefined();
  });
});