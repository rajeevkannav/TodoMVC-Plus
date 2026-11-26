import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, beforeEach, test, expect } from 'vitest';
import { App } from './App';
import { sanitizeAndValidateImport } from './utils/sanitizer';

describe('TodoMVC+ App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('renders header and input', () => {
    render(<App />);
    expect(screen.getByText('TodoMVC+', { exact: true })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /what needs to be done/i })).toBeInTheDocument();
  });

  test('adds a new todo item', async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = screen.getByRole('textbox', { name: /what needs to be done/i });
    await user.type(input, 'Write unit tests{enter}');
    
    const list = screen.getByRole('list');
    expect(within(list).getByText('Write unit tests', { exact: true })).toBeInTheDocument();
  });

  test('toggles and filters todos', async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = screen.getByRole('textbox', { name: /what needs to be done/i });
    await user.type(input, 'Task One{enter}');
    
    const list = screen.getByRole('list');
    const checkbox = within(list).getByRole('checkbox', { name: /mark "task one" as completed/i });
    await user.click(checkbox);
    
    expect(checkbox).toBeChecked();

    const activeFilter = screen.getByRole('button', { name: 'active' });
    await user.click(activeFilter);
    expect(within(list).queryByText('Task One', { exact: true })).not.toBeInTheDocument();

    const completedFilter = screen.getByRole('button', { name: 'completed' });
    await user.click(completedFilter);
    expect(within(list).getByText('Task One', { exact: true })).toBeInTheDocument();
  });

  test('sanitizes json import correctly against prototype pollution', () => {
    const maliciousJson = JSON.stringify([
      { id: '1', text: 'Safe Todo', completed: false, __proto__: { admin: true } },
      { id: '2', text: 'Another Safe', completed: true },
      { constructor: { prototype: { hacked: true } }, text: 'Malicious', completed: true }
    ]);

    const result = sanitizeAndValidateImport(maliciousJson);
    expect(result).not.toBeNull();
    expect(result?.length).toBe(2);
    expect(result?.[0].text).toBe('Safe Todo');
    expect((Object.prototype as any).admin).toBeUndefined();
  });
});