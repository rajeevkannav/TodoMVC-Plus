import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Trash2, RotateCcw, RotateCw, Download, Upload, Sun, Moon, CheckCircle2, Circle } from 'lucide-react';
import { Todo, Filter, HistoryState } from './types';
import { loadTodos, saveTodos } from './lib/db';
import { validateImport, announce } from './lib/utils';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const App = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState<HistoryState>({ past: [], present: [], future: [] });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => 
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const bc = useRef<BroadcastChannel | null>(null);

  // Sync across tabs
  useEffect(() => {
    bc.current = new BroadcastChannel('todomvc_sync');
    bc.current.onmessage = (event) => {
      if (event.data.type === 'SYNC_TODOS') {
        setTodos(event.data.payload);
      }
    };
    return () => bc.current?.close();
  }, []);

  // Initial Load
  useEffect(() => {
    loadTodos().then(loaded => {
      setTodos(loaded);
      setHistory(h => ({ ...h, present: loaded }));
    });
  }, []);

  // Persistence & Broadcast
  const updateTodos = useCallback((newTodos: Todo[], skipHistory = false) => {
    setTodos(newTodos);
    saveTodos(newTodos);
    bc.current?.postMessage({ type: 'SYNC_TODOS', payload: newTodos });

    if (!skipHistory) {
      setHistory(prev => ({
        past: [...prev.past, prev.present],
        present: newTodos,
        future: []
      }));
    }
  }, []);

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text) return;
    const newTodo: Todo = { id: crypto.randomUUID(), text, completed: false, createdAt: Date.now() };
    updateTodos([newTodo, ...todos]);
    setInputValue('');
    announce(`Added todo: ${text}`);
  };

  const toggleTodo = (id: string) => {
    const newTodos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    updateTodos(newTodos);
  };

  const deleteTodo = (id: string) => {
    const todo = todos.find(t => t.id === id);
    const newTodos = todos.filter(t => t.id !== id);
    updateTodos(newTodos);
    announce(`Deleted todo: ${todo?.text}`);
    inputRef.current?.focus();
  };

  const clearCompleted = () => {
    const newTodos = todos.filter(t => !t.completed);
    updateTodos(newTodos);
    announce('Cleared completed todos');
  };

  const undo = useCallback(() => {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, history.past.length - 1);
    setHistory({
      past: newPast,
      present: previous,
      future: [history.present, ...history.future]
    });
    setTodos(previous);
    saveTodos(previous);
    announce('Undo performed');
  }, [history]);

  const redo = useCallback(() => {
    if (history.future.length === 0) return;
    const next = history.future[0];
    const newFuture = history.future.slice(1);
    setHistory({
      past: [...history.past, history.present],
      present: next,
      future: newFuture
    });
    setTodos(next);
    saveTodos(next);
    announce('Redo performed');
  }, [history]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) redo(); else undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const filteredTodos = useMemo(() => {
    if (filter === 'active') return todos.filter(t => !t.completed);
    if (filter === 'completed') return todos.filter(t => t.completed);
    return todos;
  }, [todos, filter]);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(todos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'todos.json';
    a.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        const validated = validateImport(data);
        updateTodos(validated);
        announce('Data imported successfully');
      } catch (err) {
        alert('Invalid file format');
      }
    };
    reader.readAsText(file);
  };

  return (
    <main className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <div id="aria-announcer" className="sr-only" aria-live="polite"></div>
      
      <div className="todo-container space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-black tracking-tighter">TODO<span className="text-primary">+</span></h1>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-full hover:bg-surface transition-colors"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button onClick={undo} disabled={history.past.length === 0} className="p-2 disabled:opacity-30" aria-label="Undo"><RotateCcw size={20} /></button>
            <button onClick={redo} disabled={history.future.length === 0} className="p-2 disabled:opacity-30" aria-label="Redo"><RotateCw size={20} /></button>
            <button onClick={exportData} className="p-2" aria-label="Export JSON"><Download size={20} /></button>
            <label className="p-2 cursor-pointer" aria-label="Import JSON">
              <Upload size={20} />
              <input type="file" className="hidden" accept=".json" onChange={importData} />
            </label>
          </div>
        </header>

        <form onSubmit={addTodo} className="relative group">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full p-4 pr-12 text-lg bg-surface border-2 border-border rounded-xl focus:border-primary outline-none transition-all"
            aria-label="New todo text"
          />
          <button 
            type="submit" 
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-lg hover:scale-105 active:scale-95 transition-transform"
            aria-label="Add todo"
          >
            <Plus size={24} />
          </button>
        </form>

        <section className="bg-surface rounded-2xl border-2 border-border overflow-hidden shadow-xl">
          <div className="flex border-b-2 border-border">
            {(['all', 'active', 'completed'] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "flex-1 p-3 text-sm font-bold uppercase tracking-wider transition-colors",
                  filter === f ? "bg-primary text-white" : "hover:bg-bg"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          <ul role="list" className="divide-y-2 divide-border">
            {filteredTodos.map(todo => (
              <li 
                key={todo.id} 
                className="group flex items-center gap-4 p-4 hover:bg-bg/50 transition-colors"
              >
                <button 
                  onClick={() => toggleTodo(todo.id)}
                  className={cn("transition-colors", todo.completed ? "text-primary" : "text-border hover:text-primary")}
                  aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
                >
                  {todo.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </button>
                
                <span className={cn(
                  "flex-1 text-lg transition-all",
                  todo.completed && "line-through opacity-50"
                )}>
                  {todo.text}
                </span>

                <button 
                  onClick={() => deleteTodo(todo.id)}
                  className="p-2 text-red-500 opacity-100 md:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  aria-label={`Delete ${todo.text}`}
                >
                  <Trash2 size={20} />
                </button>
              </li>
            ))}
            {filteredTodos.length === 0 && (
              <li className="p-8 text-center text-border italic">No items found</li>
            )}
          </ul>

          <footer className="todo-footer p-4 flex items-center justify-between bg-bg/30 text-sm font-medium">
            <span>{todos.filter(t => !t.completed).length} items left</span>
            {todos.some(t => t.completed) && (
              <button 
                onClick={clearCompleted}
                className="text-primary hover:underline"
              >
                Clear completed
              </button>
            )}
          </footer>
        </section>
      </div>
    </main>
  );
};

export default App;