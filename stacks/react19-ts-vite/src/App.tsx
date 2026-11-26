import React, { useState } from 'react';

export default function App() {
  const [todos, setTodos] = useState<{id: number, text: string, completed: boolean}[]>([]);
  const [input, setInput] = useState('');

  return (
    <main>
      <h1>Todos</h1>
      <form onSubmit={(e) => { e.preventDefault(); setTodos([...todos, {id: Date.now(), text: input, completed: false}]); setInput(''); }}>
        <input aria-label="New todo" value={input} onChange={e => setInput(e.target.value)} />
        <button type="submit">Add</button>
      </form>
      <ul role="list">
        {todos.map(t => <li key={t.id}>{t.text}</li>)}
      </ul>
    </main>
  );
}