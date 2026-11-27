import React, { useState, useEffect, useReducer } from 'react';

type Todo = { id: string; text: string; completed: boolean };
type Action = { type: 'ADD'; text: string } | { type: 'TOGGLE'; id: string } | { type: 'DELETE'; id: string } | { type: 'UNDO' };

function todoReducer(state: { current: Todo[], history: Todo[][] }, action: Action): { current: Todo[], history: Todo[][] } {
  switch (action.type) {
    case 'ADD': {
      const next = [...state.current, { id: crypto.randomUUID(), text: action.text, completed: false }];
      return { current: next, history: [...state.history, state.current] };
    }
    case 'TOGGLE': {
      const next = state.current.map(t => t.id === action.id ? { ...t, completed: !t.completed } : t);
      return { current: next, history: [...state.history, state.current] };
    }
    case 'DELETE': {
      const next = state.current.filter(t => t.id !== action.id);
      return { current: next, history: [...state.history, state.current] };
    }
    case 'UNDO': {
      if (state.history.length === 0) return state;
      const prev = state.history[state.history.length - 1];
      return { current: prev, history: state.history.slice(0, -1) };
    }
    default: return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(todoReducer, { current: [], history: [] }, () => ({
    current: JSON.parse(localStorage.getItem('todos') || '[]'),
    history: []
  }));
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState<'All' | 'Active' | 'Completed'>('All');

  useEffect(() => { localStorage.setItem('todos', JSON.stringify(state.current)); }, [state.current]);

  const filtered = state.current.filter(t => filter === 'All' ? true : filter === 'Active' ? !t.completed : t.completed);

  return (
    <main className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold">Todos</h1>
      <form onSubmit={(e) => { e.preventDefault(); if(input) { dispatch({type: 'ADD', text: input}); setInput(''); } }} className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} className="border p-2 flex-1" placeholder="What needs to be done?" />
        <button type="submit">Add</button>
      </form>
      <div className="flex gap-2 my-4">
        {(['All', 'Active', 'Completed'] as const).map(f => <button key={f} onClick={() => setFilter(f)} className={filter === f ? 'font-bold' : ''}>{f}</button>)}
        <button onClick={() => dispatch({type: 'UNDO'})}>Undo</button>
      </div>
      <ul>
        {filtered.map(todo => (
          <li key={todo.id} className="flex items-center gap-2">
            <input type="checkbox" checked={todo.completed} onChange={() => dispatch({type: 'TOGGLE', id: todo.id})} />
            <span className={todo.completed ? 'line-through' : ''}>{todo.text}</span>
            <button onClick={() => dispatch({type: 'DELETE', id: todo.id})}>×</button>
          </li>
        ))}
      </ul>
    </main>
  );
}