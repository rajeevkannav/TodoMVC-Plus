import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';
import { validateImport } from './lib/utils';

describe('TodoMVC+ App', () => {
  it('adds a new todo', async () => {
    render(<App />);
    const input = screen.getByPlaceholderText('What needs to be done?');
    
    fireEvent.change(input, { target: { value: 'New Task' } });
    fireEvent.submit(input.closest('form')!);
    
    expect(screen.getByText('New Task')).toBeInTheDocument();
  });

  it('filters todos', async () => {
    render(<App />);
    const input = screen.getByPlaceholderText('What needs to be done?');
    
    fireEvent.change(input, { target: { value: 'Task 1' } });
    fireEvent.submit(input.closest('form')!);
    
    const checkbox = screen.getByRole('checkbox', { name: /Task 1/i });
    fireEvent.click(checkbox);
    
    fireEvent.click(screen.getByRole('button', { name: 'active' }));
    expect(screen.queryByText('Task 1')).not.toBeInTheDocument();
    
    fireEvent.click(screen.getByRole('button', { name: 'completed' }));
    expect(screen.getByText('Task 1')).toBeInTheDocument();
  });

  it('validates JSON import safely', () => {
    const unsafe = [{ id: '1', text: 'pwned', completed: false, __proto__: { admin: true } }];
    const validated = validateImport(unsafe);
    expect((validated[0] as any).admin).toBeUndefined();
  });
});