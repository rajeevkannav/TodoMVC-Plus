import { render, screen, fireEvent, within, act, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import App from './App';

afterEach(() => {
  cleanup();
});

describe('TodoMVC+ App', () => {
  it('adds a new todo', async () => {
    await act(async () => {
      render(<App />);
    });
    const input = screen.getByLabelText('New todo text');
    
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Buy milk' } });
      fireEvent.submit(input.closest('form')!);
    });

    const list = screen.getByRole('list');
    expect(within(list).getByText('Buy milk')).toBeInTheDocument();
  });

  it('filters todos', async () => {
    await act(async () => {
      render(<App />);
    });
    const input = screen.getByLabelText('New todo text');
    
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Active Item' } });
      fireEvent.submit(input.closest('form')!);
    });
    
    const list = screen.getByRole('list');
    const checkboxes = within(list).getAllByLabelText('Mark as completed');
    await act(async () => {
      fireEvent.click(checkboxes[0]);
    });

    const activeFilter = screen.getByRole('button', { name: 'active' });
    await act(async () => {
      fireEvent.click(activeFilter);
    });
    
    expect(within(list).queryByText('Active Item')).not.toBeInTheDocument();
  });

  it('handles undo/redo', async () => {
    await act(async () => {
      render(<App />);
    });
    const input = screen.getByLabelText('New todo text');
    
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Undo Me' } });
      fireEvent.submit(input.closest('form')!);
    });

    const undoBtn = screen.getByLabelText('Undo (Ctrl+Z)');
    await act(async () => {
      fireEvent.click(undoBtn);
    });

    const list = screen.getByRole('list');
    expect(within(list).queryByText('Undo Me')).not.toBeInTheDocument();
  });
});