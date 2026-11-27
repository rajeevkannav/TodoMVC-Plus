import { render, screen, fireEvent, within } from '@testing-library/react';
import App from './App';
import { expect, test, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());

test('adds a new todo', async () => {
  render(<App />);
  const input = screen.getByPlaceholderText('What needs to be done?');
  
  fireEvent.change(input, { target: { value: 'Buy milk' } });
  fireEvent.submit(input);

  const list = screen.getByRole('list');
  expect(within(list).getByText('Buy milk')).toBeInTheDocument();
});

test('filters todos', async () => {
  render(<App />);
  const input = screen.getByPlaceholderText('What needs to be done?');
  
  fireEvent.change(input, { target: { value: 'Active Task' } });
  fireEvent.submit(input);
  fireEvent.change(input, { target: { value: 'Completed Task' } });
  fireEvent.submit(input);

  const checkboxes = screen.getAllByRole('checkbox');
  fireEvent.click(checkboxes[1]); // Complete the second one

  const filterButtons = screen.getAllByRole('button', { name: /^active$/i });
  fireEvent.click(filterButtons[0]);
  
  // The text in the list is the todo text, not the filter name
  expect(screen.getByText('Active Task')).toBeInTheDocument();
  expect(screen.queryByText('Completed Task')).not.toBeInTheDocument();
});