import { render, screen, fireEvent, within, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import App from './App';

afterEach(() => {
  cleanup();
});

describe('TodoMVC+ App', () => {
  it('adds a new todo', async () => {
    render(<App />);
    const input = await screen.findByPlaceholderText(/what needs to be done/i);
    
    fireEvent.change(input, { target: { value: 'New Task' } });
    fireEvent.submit(input);

    const list = await screen.findByRole('list');
    expect(within(list).getByText('New Task')).toBeInTheDocument();
  });

  it('toggles a todo', async () => {
    render(<App />);
    const input = await screen.findByPlaceholderText(/what needs to be done/i);
    fireEvent.change(input, { target: { value: 'Toggle Task' } });
    fireEvent.submit(input);

    const checkbox = await screen.findByLabelText(/mark Toggle Task as completed/i);
    fireEvent.click(checkbox);
    
    expect(checkbox).toBeChecked();
  });

  it('filters todos', async () => {
    render(<App />);
    const input = await screen.findByPlaceholderText(/what needs to be done/i);
    
    fireEvent.change(input, { target: { value: 'Active' } });
    fireEvent.submit(input);
    fireEvent.change(input, { target: { value: 'Completed' } });
    fireEvent.submit(input);

    const checkboxes = await screen.findAllByRole('checkbox');
    fireEvent.click(checkboxes[checkboxes.length - 1]); // Complete the second one

    fireEvent.click(screen.getByRole('button', { name: /^active$/i }));
    const list = screen.getByRole('list');
    expect(within(list).getByText('Active')).toBeInTheDocument();
    expect(within(list).queryByText('Completed')).not.toBeInTheDocument();
  });

  it('undoes an action', async () => {
    render(<App />);
    const input = await screen.findByPlaceholderText(/what needs to be done/i);
    fireEvent.change(input, { target: { value: 'Undo Task' } });
    fireEvent.submit(input);

    const list = await screen.findByRole('list');
    expect(await within(list).findByText('Undo Task')).toBeInTheDocument();
    
    const undoBtn = screen.getByRole('button', { name: /^undo$/i });
    fireEvent.click(undoBtn);

    await waitFor(() => {
      expect(within(list).queryByText('Undo Task')).not.toBeInTheDocument();
    });
  });
});
