import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

describe('TodoMVC+ Logic', () => {
  it('adds a new todo', async () => {
    render(<App />);
    const input = screen.getByLabelText('New todo text');
    
    fireEvent.change(input, { target: { value: 'Buy milk' } });
    fireEvent.submit(input.closest('form')!);
    
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
  });

  it('filters todos', async () => {
    render(<App />);
    const input = screen.getByLabelText('New todo text');
    
    fireEvent.change(input, { target: { value: 'Task 1' } });
    fireEvent.submit(input.closest('form')!);
    
    const checkbox = screen.getByLabelText(/Mark "Task 1" as complete/i);
    fireEvent.click(checkbox);
    
    const activeFilter = screen.getByRole('button', { name: /active/i });
    fireEvent.click(activeFilter);
    
    expect(screen.queryByText('Task 1')).not.toBeInTheDocument();
  });
});