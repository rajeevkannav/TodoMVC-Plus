import React, { useState, useMemo, useEffect } from 'react';
import { useTodos } from './hooks/useTodos';
import { TodoItem } from './components/TodoItem';
import { FilterBar } from './components/FilterBar';
import { ThemeToggle } from './components/ThemeToggle';
import { ImportExport } from './components/ImportExport';
import { Plus, Check, Undo2, Redo2 } from 'lucide-react';

export default function App() {
  const { 
    todos, addTodo, toggleTodo, deleteTodo, editTodo, 
    toggleAll, clearCompleted, undo, redo, canUndo, canRedo, 
    announcement, setTodos 
  } = useTodos();
  
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [inputValue, setInputValue] = useState('');

  const filteredTodos = useMemo(() => {
    if (filter === 'active') return todos.filter(t => !t.completed);
    if (filter === 'completed') return todos.filter(t => t.completed);
    return todos;
  }, [todos, filter]);

  const activeCount = todos.filter(t => !t.completed).length;
  const allCompleted = todos.length > 0 && activeCount === 0;

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

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addTodo(inputValue);
    setInputValue('');
  };

  return (
    <main className="todo-container min-h-screen py-8 md:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-4xl font-bold tracking-tight">todos<span className="text-primary">+</span></h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={undo} 
            disabled={!canUndo} 
            className="p-2 rounded-md hover:bg-surface disabled:opacity-30"
            aria-label="Undo"
          >
            <Undo2 size={20} />
          </button>
          <button 
            onClick={redo} 
            disabled={!canRedo} 
            className="p-2 rounded-md hover:bg-surface disabled:opacity-30"
            aria-label="Redo"
          >
            <Redo2 size={20} />
          </button>
          <ThemeToggle />
          <ImportExport todos={todos} onImport={setTodos} />
        </div>
      </header>

      <section className="todo-card overflow-hidden">
        <form onSubmit={handleAdd} className="flex items-center border-b border-border px-4">
          <button
            type="button"
            onClick={() => toggleAll(!allCompleted)}
            className={`p-2 transition-colors ${allCompleted ? 'text-primary' : 'text-text-muted'}`}
            aria-label="Toggle all todos"
          >
            <Check size={24} />
          </button>
          <input
            type="text"
            className="flex-1 py-4 px-2 bg-transparent border-none focus:ring-0 text-xl"
            placeholder="What needs to be done?"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            aria-label="New todo text"
          />
          <button 
            type="submit" 
            className="p-2 text-primary hover:scale-110 transition-transform"
            aria-label="Add todo"
          >
            <Plus size={24} />
          </button>
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
          <FilterBar 
            activeCount={activeCount} 
            filter={filter} 
            setFilter={setFilter} 
            onClearCompleted={clearCompleted}
            hasCompleted={todos.length > activeCount}
          />
        )}
      </section>

      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <footer className="mt-12 text-center text-text-muted text-sm space-y-2">
        <p>Double-click to edit a todo</p>
        <p>Press <kbd className="px-1 py-0.5 rounded bg-surface border border-border">Ctrl+Z</kbd> to undo</p>
        <p>Built with React 19 & Tailwind v4</p>
      </footer>
    </main>
  );
}