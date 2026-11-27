import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

type Todo = { id: number; title: string; completed: boolean };

export default function App() {
  const [todos, setTodos] = useState<Todo[]>(() => JSON.parse(localStorage.getItem('todos') || '[]'));
  const [filter, setFilter] = useState<'All' | 'Active' | 'Completed'>('All');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => { localStorage.setItem('todos', JSON.stringify(todos)); }, [todos]);

  const filtered = useMemo(() => {
    if (filter === 'Active') return todos.filter(t => !t.completed);
    if (filter === 'Completed') return todos.filter(t => t.completed);
    return todos;
  }, [todos, filter]);

  return (
    <main className="todoapp" aria-labelledby="app-title">
      <header className="app-header">
        <h1 id="app-title" className="app-title">TodoMVC+</h1>
        <p className="app-stack">react19-ts-vite</p>
        <div className="app-toolbar" role="toolbar" aria-label="App actions">
          <button type="button" className="btn" onClick={() => alert('Undo')}>Undo</button>
          <button type="button" className="btn" onClick={() => alert('Redo')}>Redo</button>
          <button type="button" className="btn" onClick={() => {}}>Export</button>
          <button type="button" className="btn" onClick={() => {}}>Import</button>
          <button type="button" className="btn" onClick={() => document.documentElement.toggleAttribute('data-theme', document.documentElement.getAttribute('data-theme') !== 'dark')}>Dark theme</button>
        </div>
      </header>
      <form className="new-todo-form" onSubmit={(e) => { e.preventDefault(); const val = (e.target as any).elements[0].value; if(val) setTodos([...todos, { id: Date.now(), title: val, completed: false }]); (e.target as any).reset(); }}>
        <label htmlFor="new-todo" className="sr-only">New todo</label>
        <input id="new-todo" className="new-todo" placeholder="What needs to be done?" autoComplete="off" />
        <button type="submit" className="btn btn-primary">Add</button>
      </form>
      {todos.length > 0 && (
        <section className="todo-main" aria-label="Todos">
          <input id="toggle-all" className="toggle-all" type="checkbox" onChange={(e) => setTodos(todos.map(t => ({...t, completed: e.target.checked})))} />
          <label htmlFor="toggle-all">Mark all as complete</label>
          <ul className="todo-list">
            {filtered.map(todo => (
              <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''} ${editingId === todo.id ? 'editing' : ''}`}>
                <input type="checkbox" className="todo-toggle" checked={todo.completed} onChange={() => setTodos(todos.map(t => t.id === todo.id ? {...t, completed: !t.completed} : t))} />
                <span className="todo-title" onDoubleClick={() => { setEditingId(todo.id); setEditValue(todo.title); }}>{todo.title}</span>
                {editingId === todo.id && <input className="todo-edit" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => { setTodos(todos.map(t => t.id === todo.id ? {...t, title: editValue} : t)); setEditingId(null); }} />}
                <button type="button" className="todo-destroy" onClick={() => setTodos(todos.filter(t => t.id !== todo.id))}>×</button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {todos.length > 0 && (
        <footer className="app-footer">
          <span className="todo-count"><strong>{todos.filter(t => !t.completed).length}</strong> items left</span>
          <nav className="todo-filters" aria-label="Filter todos">
            {(['All', 'Active', 'Completed'] as const).map(f => <button key={f} type="button" className="filter" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>)}
          </nav>
          <button type="button" className="btn clear-completed" onClick={() => setTodos(todos.filter(t => !t.completed))}>Clear completed</button>
        </footer>
      )}
      <div className="sr-only" role="status" aria-live="polite"></div>
    </main>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) ReactDOM.createRoot(rootElement).render(<App />);