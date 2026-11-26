import React, { useState, useMemo, useEffect } from 'react';
import { useTodos } from './hooks/useTodos';
import { TodoItem } from './components/TodoItem';
import { Announcer } from './components/Announcer';
import { Sun, Moon, Undo2, Redo2, Download, Upload, Trash2 } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';

type Filter = 'all' | 'active' | 'completed';

export default function App() {
  const { 
    todos, addTodo, toggleTodo, deleteTodo, editTodo, 
    clearCompleted, toggleAll, undo, redo, canUndo, canRedo, 
    announcement, importTodos 
  } = useTodos();

  const [filter, setFilter] = useState<Filter>('all');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => 
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const filteredTodos = useMemo(() => {
    if (filter === 'active') return todos.filter(t => !t.completed);
    if (filter === 'completed') return todos.filter(t => t.completed);
    return todos;
  }, [todos, filter]);

  const remaining = todos.filter(t => !t.completed).length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(todos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'todos.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') importTodos(ev.target.result);
    };
    reader.readAsText(file);
  };

  return (
    <Tooltip.Provider>
      <main 
        className="todo-container min-h-screen flex flex-col gap-8 py-12"
        onKeyDown={handleKeyDown}
      >
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-bold tracking-tight">todos<span className="text-[var(--primary)]">+</span></h1>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-md hover:bg-[var(--border)] focus-ring transition-colors"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            
            <div className="h-6 w-px bg-[var(--border)] mx-1" />

            <button 
              onClick={undo} 
              disabled={!canUndo}
              className="p-2 rounded-md hover:bg-[var(--border)] disabled:opacity-30 focus-ring"
              aria-label="Undo"
            >
              <Undo2 size={20} />
            </button>
            <button 
              onClick={redo} 
              disabled={!canRedo}
              className="p-2 rounded-md hover:bg-[var(--border)] disabled:opacity-30 focus-ring"
              aria-label="Redo"
            >
              <Redo2 size={20} />
            </button>
          </div>
        </header>

        <section className="bg-[var(--background)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden">
          <div className="flex items-center px-4 border-b border-[var(--border)]">
            <input
              type="checkbox"
              className="w-6 h-6 rounded-full border-2 border-[var(--border)] checked:bg-[var(--primary)] focus-ring cursor-pointer"
              checked={todos.length > 0 && todos.every(t => t.completed)}
              onChange={(e) => toggleAll(e.target.checked)}
              aria-label="Toggle all todos"
            />
            <form 
              className="flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem('new-todo') as HTMLInputElement;
                addTodo(input.value);
                input.value = '';
              }}
            >
              <input
                name="new-todo"
                className="w-full px-4 py-5 text-xl bg-transparent border-none focus:outline-none placeholder:italic placeholder:text-slate-400"
                placeholder="What needs to be done?"
                autoFocus
              />
            </form>
          </div>

          <ul className="divide-y divide-[var(--border)]" role="list">
            {filteredTodos.map(todo => (
              <TodoItem 
                key={todo.id} 
                todo={todo} 
                onToggle={() => toggleTodo(todo.id)} 
                onDelete={() => deleteTodo(todo.id)}
                onEdit={(text) => editTodo(todo.id, text)}
              />
            ))}
          </ul>

          {todos.length > 0 && (
            <footer className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 text-sm text-slate-500 border-t border-[var(--border)]">
              <span>{remaining} {remaining === 1 ? 'item' : 'items'} left</span>
              
              <nav className="flex gap-1">
                {(['all', 'active', 'completed'] as Filter[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-md capitalize transition-colors focus-ring ${
                      filter === f ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--border)]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </nav>

              <button 
                onClick={clearCompleted}
                className="hover:underline focus-ring"
              >
                Clear completed
              </button>
            </footer>
          )}
        </section>

        <footer className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
          <button onClick={handleExport} className="flex items-center gap-2 hover:text-[var(--foreground)] focus-ring">
            <Download size={16} /> Export JSON
          </button>
          <label className="flex items-center gap-2 cursor-pointer hover:text-[var(--foreground)] focus-ring">
            <Upload size={16} /> Import JSON
            <input type="file" accept=".json" onChange={handleImport} className="sr-only" />
          </label>
        </footer>

        <Announcer message={announcement} />
      </main>
    </Tooltip.Provider>
  );
}