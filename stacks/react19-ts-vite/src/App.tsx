import React, { useState, useRef, useEffect } from 'react';
import { useTodos } from './hooks/useTodos';
import { TodoItem } from './components/TodoItem';
import { FilterBar } from './components/FilterBar';
import { ThemeToggle } from './components/ThemeToggle';
import { Plus, Undo2, Redo2, Download, Upload, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

export default function App() {
  const {
    todos,
    filter,
    setFilter,
    addTodo,
    toggleTodo,
    deleteTodo,
    editTodo,
    clearCompleted,
    toggleAll,
    undo,
    redo,
    canUndo,
    canRedo,
    announcement,
    importTodos,
  } = useTodos();

  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTodos = todos.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      addTodo(inputValue);
      setInputValue('');
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(todos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todos-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      importTodos(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <main className="todo-container p-4 md:p-8 min-h-screen flex flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-black tracking-tighter text-primary">
          TODO<span className="text-muted-foreground">MVC+</span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-2 rounded-md hover:bg-muted disabled:opacity-30 transition-colors"
            aria-label="Undo (Ctrl+Z)"
          >
            <Undo2 size={20} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-2 rounded-md hover:bg-muted disabled:opacity-30 transition-colors"
            aria-label="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={20} />
          </button>
          <ThemeToggle />
        </div>
      </header>

      <section className="bg-card border border-border rounded-xl shadow-xl overflow-hidden">
        <form onSubmit={handleSubmit} className="flex items-center border-b border-border p-2 gap-2">
          <button
            type="button"
            onClick={toggleAll}
            className={clsx(
              "p-3 rounded-lg transition-colors",
              todos.length > 0 && todos.every(t => t.completed) ? "text-primary" : "text-muted-foreground"
            )}
            aria-label="Toggle all todos"
          >
            <Plus className={clsx("transition-transform", todos.every(t => t.completed) && "rotate-45")} />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="What needs to be done?"
            className="flex-1 bg-transparent py-4 px-2 outline-none text-lg"
            aria-label="New todo text"
          />
        </form>

        <ul role="list" className="divide-y divide-border">
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
          <footer className="todo-footer p-4 flex items-center justify-between bg-muted/30 text-sm font-medium">
            <span className="text-muted-foreground">
              {todos.filter(t => !t.completed).length} items left
            </span>
            
            <FilterBar current={filter} onChange={setFilter} />

            <div className="flex items-center gap-1">
              <button
                onClick={clearCompleted}
                className="px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear completed
              </button>
            </div>
          </footer>
        )}
      </section>

      <section className="flex flex-wrap justify-center gap-4 text-sm">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-border hover:bg-muted transition-colors"
        >
          <Download size={16} /> Export JSON
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-border hover:bg-muted transition-colors"
        >
          <Upload size={16} /> Import JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
          aria-hidden="true"
        />
      </section>

      <div
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {announcement}
      </div>
    </main>
  );
}