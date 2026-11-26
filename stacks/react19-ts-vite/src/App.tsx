import React, { useState, useMemo, useTransition } from 'react';
import { useTodos, Filter, Todo } from './hooks/useTodos';
import { Header } from './components/Header';
import { TodoItem } from './components/TodoItem';
import { Footer } from './components/Footer';
import { AriaLive } from './components/AriaLive';
import { cn } from './lib/utils';

export default function App() {
  const { 
    todos, isLoaded, addTodo, toggleTodo, editTodo, deleteTodo, 
    toggleAll, clearCompleted, undo, redo, canUndo, canRedo, 
    announcement, setTodos 
  } = useTodos();
  
  const [filter, setFilter] = useState<Filter>('all');
  const [, startTransition] = useTransition();

  const filteredTodos = useMemo(() => {
    switch (filter) {
      case 'active': return todos.filter(t => !t.completed);
      case 'completed': return todos.filter(t => t.completed);
      default: return todos;
    }
  }, [todos, filter]);

  const handleFilterChange = (f: Filter) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => setFilter(f));
    } else {
      setFilter(f);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6">
      <AriaLive message={announcement} />
      
      <main className="w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden todo-container">
        <Header 
          onAdd={addTodo} 
          onToggleAll={toggleAll} 
          allCompleted={todos.length > 0 && todos.every(t => t.completed)} 
          hasTodos={todos.length > 0}
          undo={undo}
          redo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          todos={todos}
          setTodos={setTodos}
        />

        <section className="relative">
          {todos.length > 0 && (
            <ul role="list" className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={() => toggleTodo(todo.id)}
                  onEdit={(text) => editTodo(todo.id, text)}
                  onDelete={() => deleteTodo(todo.id)}
                />
              ))}
            </ul>
          )}
        </section>

        {todos.length > 0 && (
          <Footer
            count={todos.filter(t => !t.completed).length}
            filter={filter}
            onFilterChange={handleFilterChange}
            onClearCompleted={clearCompleted}
            hasCompleted={todos.some(t => t.completed)}
          />
        )}
      </main>

      <footer className="mt-8 text-center text-slate-600 dark:text-slate-400 text-sm space-y-2">
        <p>Double-click to edit a todo</p>
        <p>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">Ctrl+Z</kbd> to undo</p>
      </footer>
    </div>
  );
}