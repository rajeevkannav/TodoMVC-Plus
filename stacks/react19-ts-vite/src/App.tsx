import React, { useState, useRef, useEffect } from 'react';
import { useTodos } from './hooks/useTodos';
import { TodoItem } from './components/TodoItem';
import { TodoFilters } from './components/TodoFilters';
import { ImportExport } from './components/ImportExport';
import { AriaAnnouncer } from './components/AriaAnnouncer';
import { Sun, Moon, Keyboard, Undo2, Redo2 } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const { 
    todos, filteredTodos, filter, dispatch, 
    undo, redo, canUndo, canRedo, announcement 
  } = useTodos();
  const [newTodo, setNewTodo] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodo.trim()) {
      dispatch({ type: 'ADD_TODO', text: newTodo });
      setNewTodo('');
    }
  };

  const activeCount = todos.filter(t => !t.completed).length;
  const allCompleted = todos.length > 0 && todos.every(t => t.completed);

  return (
    <div className={cn("min-h-screen p-4 md:p-8 transition-colors", theme)}>
      <AriaAnnouncer message={announcement} />
      
      <header className="todo-container mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-black tracking-tighter text-primary">TodoMVC+</h1>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            className="p-2 rounded-full hover:bg-border transition-colors"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button 
            popoverTarget="help-menu"
            className="p-2 rounded-full hover:bg-border transition-colors"
            aria-label="Keyboard shortcuts"
          >
            <Keyboard size={20} />
          </button>
          <ImportExport todos={todos} onImport={(t) => dispatch({ type: 'SET_TODOS', todos: t })} />
        </div>
      </header>

      <main className="todo-container bg-card rounded-xl shadow-2xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-4">
          <input
            type="checkbox"
            id="toggle-all"
            className="w-6 h-6 rounded border-2 border-primary cursor-pointer"
            checked={allCompleted}
            onChange={(e) => dispatch({ type: 'TOGGLE_ALL', completed: e.target.checked })}
            aria-label="Mark all as complete"
          />
          <form onSubmit={handleSubmit} className="flex-1">
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent text-xl focus:outline-none placeholder:text-muted-foreground"
              placeholder="What needs to be done?"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              aria-label="New todo text"
            />
          </form>
        </div>

        <ul role="list" className="divide-y divide-border">
          {filteredTodos.map(todo => (
            <TodoItem 
              key={todo.id} 
              todo={todo} 
              onToggle={() => dispatch({ type: 'TOGGLE_TODO', id: todo.id })}
              onDelete={() => dispatch({ type: 'DELETE_TODO', id: todo.id })}
              onEdit={(text) => dispatch({ type: 'EDIT_TODO', id: todo.id, text })}
            />
          ))}
        </ul>

        {todos.length > 0 && (
          <footer className="todo-footer p-4 flex items-center justify-between border-t border-border text-sm text-muted-foreground">
            <span aria-live="polite">{activeCount} {activeCount === 1 ? 'item' : 'items'} left</span>
            <TodoFilters current={filter} onFilter={(f) => dispatch({ type: 'SET_FILTER', filter: f })} />
            <button 
              onClick={() => dispatch({ type: 'CLEAR_COMPLETED' })}
              className="hover:text-primary transition-colors"
            >
              Clear completed
            </button>
          </footer>
        )}
      </main>

      <div className="todo-container mt-6 flex justify-center gap-4">
        <button 
          onClick={undo} 
          disabled={!canUndo}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border disabled:opacity-50 hover:bg-border transition-colors"
        >
          <Undo2 size={18} /> Undo
        </button>
        <button 
          onClick={redo} 
          disabled={!canRedo}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border disabled:opacity-50 hover:bg-border transition-colors"
        >
          <Redo2 size={18} /> Redo
        </button>
      </div>

      <div id="help-menu" popover="auto" className="max-w-xs">
        <h2 className="font-bold mb-2">Keyboard Shortcuts</h2>
        <ul className="text-sm space-y-1">
          <li><kbd className="bg-border px-1 rounded">Enter</kbd> Add / Save</li>
          <li><kbd className="bg-border px-1 rounded">Esc</kbd> Cancel Edit</li>
          <li><kbd className="bg-border px-1 rounded">Ctrl+Z</kbd> Undo</li>
          <li><kbd className="bg-border px-1 rounded">Ctrl+Shift+Z</kbd> Redo</li>
        </ul>
      </div>
    </div>
  );
}