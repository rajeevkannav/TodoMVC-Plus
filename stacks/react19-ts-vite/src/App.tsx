import React, { useState, useEffect, useCallback } from 'react';
import { Todo, FilterType } from './types';
import { loadTodos, saveTodos } from './utils/storage';
import { sanitizeAndValidateImport } from './utils/sanitizer';
import { Header } from './components/Header';
import { TodoInput } from './components/TodoInput';
import { TodoList } from './components/TodoList';
import { TodoFooter } from './components/TodoFooter';
import { HelpModal } from './components/HelpModal';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>(() => loadTodos());
  const [history, setHistory] = useState<Todo[][]>([loadTodos()]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [filter, setFilter] = useState<FilterType>('all');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [announcement, setAnnouncement] = useState<string>('');
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const updateTodosState = useCallback((newTodos: Todo[], announceText?: string) => {
    setTodos(newTodos);
    saveTodos(newTodos);
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newTodos);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    if (announceText) {
      setAnnouncement(announceText);
    }

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('todomvc_plus_channel');
        channel.postMessage({ type: 'SYNC_TODOS', todos: newTodos });
        channel.close();
      } catch (e) {}
    }
  }, [history, historyIndex]);

  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('todomvc_plus_channel');
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'SYNC_TODOS') {
          const remoteTodos = event.data.todos;
          if (Array.isArray(remoteTodos)) {
            setTodos(remoteTodos);
            saveTodos(remoteTodos);
          }
        }
      };
      return () => {
        channel.close();
      };
    }
  }, []);

  const handleAdd = (text: string) => {
    const newTodo: Todo = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      completed: false,
      createdAt: Date.now(),
    };
    updateTodosState([newTodo, ...todos], `Added todo ${text}`);
  };

  const handleToggle = (id: string) => {
    const target = todos.find(t => t.id === id);
    const newTodos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    updateTodosState(newTodos, target ? `Toggled todo ${target.text}` : 'Toggled todo');
  };

  const handleDelete = (id: string) => {
    const target = todos.find(t => t.id === id);
    const newTodos = todos.filter(t => t.id !== id);
    updateTodosState(newTodos, target ? `Deleted todo ${target.text}` : 'Deleted todo');
  };

  const handleEdit = (id: string, newText: string) => {
    const newTodos = todos.map(t => t.id === id ? { ...t, text: newText } : t);
    updateTodosState(newTodos, `Edited todo to ${newText}`);
  };

  const handleToggleAll = () => {
    const allCompleted = todos.every(t => t.completed);
    const newTodos = todos.map(t => ({ ...t, completed: !allCompleted }));
    updateTodosState(newTodos, allCompleted ? 'Marked all active' : 'Marked all completed');
  };

  const handleClearCompleted = () => {
    const newTodos = todos.filter(t => !t.completed);
    updateTodosState(newTodos, 'Cleared completed todos');
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const prevTodos = history[newIndex];
      setHistoryIndex(newIndex);
      setTodos(prevTodos);
      saveTodos(prevTodos);
      setAnnouncement('Undo action performed');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextTodos = history[newIndex];
      setHistoryIndex(newIndex);
      setTodos(nextTodos);
      saveTodos(nextTodos);
      setAnnouncement('Redo action performed');
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(todos, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "todomvc_export.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setAnnouncement('Exported todos to JSON');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          const imported = sanitizeAndValidateImport(content);
          if (imported) {
            updateTodosState(imported, 'Imported todos successfully');
          } else {
            alert('Invalid JSON file format.');
          }
        }
      };
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  const remainingCount = todos.filter(t => !t.completed).length;
  const hasCompleted = todos.some(t => t.completed);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-12">
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <div className="max-w-2xl mx-auto px-4">
        <Header
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onExport={handleExport}
          onImport={handleImport}
          onOpenHelp={() => setIsHelpOpen(true)}
        />
        
        <main className="space-y-6">
          <TodoInput onAdd={handleAdd} />
          
          <TodoList
            todos={todos}
            filter={filter}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onToggleAll={handleToggleAll}
          />

          {todos.length > 0 && (
            <TodoFooter
              remainingCount={remainingCount}
              filter={filter}
              onFilterChange={setFilter}
              onClearCompleted={handleClearCompleted}
              hasCompleted={hasCompleted}
            />
          )}
        </main>
      </div>
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
};
