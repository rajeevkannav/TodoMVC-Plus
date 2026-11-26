import React, { useState, useEffect, useReducer } from 'react';

interface Todo { id: string; text: string; completed: boolean; }

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setTodos([...todos, { id: crypto.randomUUID(), text: input.trim(), completed: false }]);
    setInput('');
  };

  return (
    <main className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold">TodoMVC+</h1>
      <form onSubmit={addTodo} className="flex gap-2">
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          className="border p-2 flex-1" 
          aria-label="New todo"
        />
        <button type="submit">Add</button>
      </form>
      <ul role="list" className="mt-4">
        {todos.map(t => (
          <li key={t.id} className="flex items-center gap-2">
            <input type="checkbox" checked={t.completed} onChange={() => setTodos(todos.map(x => x.id === t.id ? {...x, completed: !x.completed} : x))} />
            <span>{t.text}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}