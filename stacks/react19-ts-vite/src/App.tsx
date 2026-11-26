import { useState, useEffect, useCallback } from 'react';

export default function App() {
  const [todos, setTodos] = useState<{id: number, text: string, completed: boolean}[]>([]);
  const [input, setInput] = useState('');

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setTodos([...todos, { id: Date.now(), text: input.trim(), completed: false }]);
    setInput('');
  };

  return (
    <main className="max-w-xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Todos</h1>
      <form onSubmit={addTodo} className="flex gap-2">
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          className="border p-2 flex-1" 
          placeholder="What needs to be done?"
          aria-label="New todo"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2">Add</button>
      </form>
      <ul role="list" className="mt-4 space-y-2">
        {todos.map(todo => (
          <li key={todo.id} className="flex items-center gap-2 p-2 border">
            <input type="checkbox" checked={todo.completed} onChange={() => setTodos(todos.map(t => t.id === todo.id ? {...t, completed: !t.completed} : t))} />
            <span className={todo.completed ? 'line-through' : ''}>{todo.text}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}