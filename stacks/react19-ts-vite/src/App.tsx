import React, { useState, useMemo, useEffect } from 'react';
import { useTodos } from './hooks/useTodos';
import { TodoItem } from './components/TodoItem';
import { Footer } from './components/Footer';
import { Announcer } from './components/Announcer';
import { clsx } from 'clsx';
import { 
  Plus, 
  Undo2, 
  Redo2, 
  Download, 
  Upload, 
  Settings2, 
  ChevronDown,
  Keyboard
} from 'lucide-react';

export default function App() {
  const {
    todos,
    filter,
    setFilter,
    addTodo,
    toggleTodo,
    deleteTodo,
    editTodo,
    toggleAll,
    clearCompleted,
    undo,
    redo,
    canUndo,
    canRedo,
    announcement,
    importTodos
  } = useTodos();

  const [inputValue, setInputValue] = useState('');

  const filteredTodos = useMemo(() => {
    return todos.filter(t => {
      if (filter === 'active') return !t.completed;
      if (filter === 'completed') return t.completed;
      return true;
    });
  }, [todos, filter]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      addTodo(inputValue);
      setInputValue('');
    }
  };

  const exportData = () => {
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
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result === 'string') {
          importTodos(ev.target.result);
        }
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [undo, redo]);

  return (
    <main className="todo-container min-h-screen flex flex-col py-8 sm:py-12">
      <Announcer message={announcement} />
      
      <header className="mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-black tracking-tight text-[var(--primary)]">
            TODOS<span className="text-[var(--accent)]">+</span>
          </h1>
          
          <div className="flex gap-2">
            <button 
              onClick={undo} 
              disabled={!canUndo}
              className="p-2 rounded-lg border border-[var(--border)] disabled:opacity-30 hover:bg-black/5 dark:hover:bg-white/5"
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo2 size={20} />
            </button>
            <button 
              onClick={redo} 
              disabled={!canRedo}
              className="p-2 rounded-lg border border-[var(--border)] disabled:opacity-30 hover:bg-black/5 dark:hover:bg-white/5"
              title="Redo (Ctrl+Shift+Z)"
              aria-label="Redo"
            >
              <Redo2 size={20} />
            </button>
            <div className="relative">
              <button 
                popoverTarget="settings-menu"
                className="p-2 rounded-lg border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5"
                aria-label="Settings and Data"
              >
                <Settings2 size={20} />
              </button>
              <div 
                id="settings-menu" 
                popover="auto" 
                className="p-4 glass-panel mt-2 shadow-xl border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
              >
                <div className="flex flex-col gap-3">
                  <button onClick={exportData} className="flex items-center gap-2 hover:text-[var(--primary)]">
                    <Download size={18} /> Export JSON
                  </button>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-[var(--primary)]">
                    <Upload size={18} /> Import JSON
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                  </label>
                  <hr className="border-[var(--border)]" />
                  <div className="flex items-center gap-2 text-xs opacity-70">
                    <Keyboard size={14} /> Ctrl+Z / Ctrl+Shift+Z
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleAdd} className="relative group">
          <button
            type="button"
            onClick={toggleAll}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--border)] hover:text-[var(--primary)] transition-colors"
            aria-label="Toggle all tasks"
          >
            <ChevronDown size={24} className={clsx(todos.every(t => t.completed) && "text-[var(--primary)]")} />
          </button>
          <input
            type="text"
            className="w-full pl-14 pr-14 py-4 text-xl glass-panel outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
            placeholder="What needs to be done?"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            aria-label="New todo text"
          />
          <button
            type="submit"
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-[var(--primary)] text-white rounded-lg hover:scale-105 transition-transform"
            aria-label="Add todo"
          >
            <Plus size={20} />
          </button>
        </form>
      </header>

      <section className="glass-panel overflow-hidden flex-grow flex flex-col">
        <ul className="flex-grow overflow-y-auto" role="list">
          {filteredTodos.map(todo => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
              onEdit={editTodo}
            />
          ))}
          {filteredTodos.length === 0 && (
            <li className="p-12 text-center opacity-50 italic">
              No tasks found in this view.
            </li>
          )}
        </ul>

        {todos.length > 0 && (
          <Footer
            count={todos.filter(t => !t.completed).length}
            activeFilter={filter}
            onFilterChange={setFilter}
            onClearCompleted={clearCompleted}
            hasCompleted={todos.some(t => t.completed)}
          />
        )}
      </section>
    </main>
  );
}