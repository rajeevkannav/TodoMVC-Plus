import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';
import '@testing-library/jest-dom';

describe('App', () => {
  it('filters tasks correctly', () => {
    render(<App />);
    
    // Add a task
    const input = screen.getByPlaceholderText(/what needs to be done/i);
    fireEvent.change(input, { target: { value: 'Task 1' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // Click 'completed' filter
    // Using getAllByText to handle multiple buttons if necessary, or specific selector
    const completedButtons = screen.getAllByRole('button', { name: /completed/i });
    fireEvent.click(completedButtons[0]);

    expect(screen.queryByText('Task 1')).not.toBeInTheDocument();
  });
});