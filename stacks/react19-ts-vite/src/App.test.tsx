import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('TodoMVC+ App', () => {
  it('adds a new todo', () => {
    render(<App />);
    const input = screen.getByLabelText(/new todo text/i);
    fireEvent.change(input, { target: { value: 'Test Task' } });
    fireEvent.submit(input);
    
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('filters todos', () => {
    render(<App />);
    const input = screen.getByLabelText(/new todo text/i);
    
    fireEvent.change(input, { target: { value: 'Active Task' } });
    fireEvent.submit(input);
    
    const checkbox = screen.getByLabelText(/mark "Active Task" as completed/i);
    fireEvent.click(checkbox);
    
    fireEvent.click(screen.getByRole('button', { name: 'active' }));
    expect(screen.queryByText('Active Task')).not.toBeInTheDocument();
  });

  it('handles undo/redo', () => {
    render(<App />);
    const input = screen.getByLabelText(/new todo text/i);
    fireEvent.change(input, { target: { value: 'Undo Task' } });
    fireEvent.submit(input);
    
    const undoBtn = screen.getByLabelText('Undo');
    fireEvent.click(undoBtn);
    
    expect(screen.queryByText('Undo Task')).not.toBeInTheDocument();
  });
});