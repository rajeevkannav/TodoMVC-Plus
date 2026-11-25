import React, { useState, useEffect, useTransition, useMemo, useRef } from 'react';
import { 
  Plus, Check, Trash2, Edit3, X, RotateCcw, RotateCw, 
  Search, Moon, Sun, Monitor, Download, Upload, HelpCircle, 
  Calendar, Tag, AlertCircle, ChevronDown, ChevronRight, CheckSquare, ListFilter
} from 'lucide-react';
import { Todo, FilterType, SortType, ThemeMode } from './types';
import { loadTodos, saveTodos, subscribeToSync } from './storage';

export default function App() {
  const [todos, setTodos] = useState<Todo[]>(() => loadTodos());
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('created');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('system');
  
  // New todo input state
  const [newText, setNewText] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newSubtasksInput, setNewSubtasksInput] = useState('');
  const [newSubtasks, setNewSubtasks] = useState<string[]>([]);
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Undo / Redo history
  const [history, setHistory] = useState<Todo[][]>([loadTodos()]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Announcements & Toast
  const [announcement, setAnnouncement] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastUndoAction, setToastUndoAction] = useState<(() => void) | null>(null);

  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync across tabs
  useEffect(() => {
    const unsubscribe = subscribeToSync((syncedTodos) => {
      setTodos(syncedTodos);
      pushHistory(syncedTodos, false);
      announce('Todos synchronized from another tab.');
    });
    return unsubscribe;
  }, []);

  // Theme effect
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'high-contrast');
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'high-contrast') {
      root.classList.add('high-contrast');
    } else if (theme === 'system') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      }
    }
  }, [theme]);

  // Push state to history
  const pushHistory = (newTodos: Todo[], record = true) => {
    saveTodos(newTodos);
    if (!record) return;
    setHistory(prev => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, newTodos];
    });
    setHistoryIndex(prev => prev + 1);
  };

  const announce = (msg: string) => {
    setAnnouncement(msg);
  };

  const showToast = (message: string, undoAction?: () => void) => {
    setToastMessage(message);
    setToastUndoAction(undoAction || null);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      setToastUndoAction(null);
    }, 6000);
  };

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z, / for search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          // Redo
          if (historyIndex < history.length - 1) {
            e.preventDefault();
            const nextIdx = historyIndex + 1;
            setHistoryIndex(nextIdx);
            setTodos(history[nextIdx]);
            saveTodos(history[nextIdx]);
            announce('Redid action');
          }
        } else {
          // Undo
          if (historyIndex > 0) {
            e.preventDefault();
            const prevIdx = historyIndex - 1;
            setHistoryIndex(prevIdx);
            setTodos(history[prevIdx]);
            saveTodos(history[prevIdx]);
            announce('Undid action');
          }
        }
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  // All unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    todos.forEach(t => t.tags?.forEach(tag => set.add(tag)));
    return Array.from(set);
  }, [todos]);

  // Filtered & Sorted todos
  const filteredTodos = useMemo(() => {
    return todos.filter(todo => {
      if (filter === 'active' && todo.completed) return false;
      if (filter === 'completed' && !todo.completed) return false;
      if (selectedTag && !todo.tags?.includes(selectedTag)) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesText = todo.text.toLowerCase().includes(query);
        const matchesTags = todo.tags?.some(tag => tag.toLowerCase().includes(query));
        if (!matchesText && !matchesTags) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sort === 'priority') {
        const rank = { high: 3, medium: 2, low: 1 };
        return rank[b.priority] - rank[a.priority];
      }
      if (sort === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sort === 'alphabetical') {
        return a.text.localeCompare(b.text);
      }
      return b.createdAt - a.createdAt;
    });
  }, [todos, filter, sort, searchQuery, selectedTag]);

  const activeCount = useMemo(() => todos.filter(t => !t.completed).length, [todos]);
  const completedCount = todos.length - activeCount;

  // Add todo
  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    const newTodo: Todo = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      text: newText.trim(),
      completed: false,
      priority: newPriority,
      dueDate: newDueDate || undefined,
      tags: newTags,
      subtasks: newSubtasks.map(st => ({ id: Math.random().toString(), text: st, completed: false })),
      createdAt: Date.now()
    };

    const next = [newTodo, ...todos];
    startTransition(() => {
      setTodos(next);
      pushHistory(next);
      setNewText('');
      setNewDueDate('');
      setNewTags([]);
      setNewSubtasks([]);
      setShowAdvancedForm(false);
      announce(`Added task: ${newTodo.text}`);
      showToast(`Task added successfully`, () => {
        // Undo add
        const undone = todos;
        setTodos(undone);
        pushHistory(undone);
        announce('Undo add task');
      });
    });
  };

  const toggleTodo = (id: string) => {
    const next = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTodos(next);
    pushHistory(next);
    const toggled = next.find(t => t.id === id);
    announce(`Task ${toggled?.text} marked as ${toggled?.completed ? 'completed' : 'active'}`);
  };

  const deleteTodo = (id: string) => {
    const target = todos.find(t => t.id === id);
    const next = todos.filter(t => t.id !== id);
    setTodos(next);
    pushHistory(next);
    announce(`Deleted task: ${target?.text}`);
    showToast(`Deleted "${target?.text}"`, () => {
      setTodos(todos);
      pushHistory(todos);
      announce('Restored deleted task');
    });
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const saveEditing = (id: string) => {
    if (!editText.trim()) return;
    const next = todos.map(t => t.id === id ? { ...t, text: editText.trim() } : t);
    setTodos(next);
    pushHistory(next);
    setEditingId(null);
    announce('Updated task text');
  };

  const toggleAll = () => {
    const allCompleted = todos.every(t => t.completed);
    const next = todos.map(t => ({ ...t, completed: !allCompleted }));
    setTodos(next);
    pushHistory(next);
    announce(allCompleted ? 'Marked all tasks active' : 'Marked all tasks completed');
  };

  const clearCompleted = () => {
    const next = todos.filter(t => !t.completed);
    setTodos(next);
    pushHistory(next);
    announce('Cleared completed tasks');
    showToast('Completed tasks cleared', () => {
      setTodos(todos);
      pushHistory(todos);
      announce('Restored cleared completed tasks');
    });
  };

  const toggleSubtask = (todoId: string, subtaskId: string) => {
    const next = todos.map(t => {
      if (t.id !== todoId) return t;
      const subtasks = t.subtasks.map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st);
      return { ...t, subtasks };
    });
    setTodos(next);
    pushHistory(next);
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(todos, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `todomvc_plus_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    announce('Exported tasks to JSON');
  };

  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string, (key, value) =>
            key === '__proto__' || key === 'constructor' || key === 'prototype' ? undefined : value
          );
          if (Array.isArray(parsed)) {
            // Validate prototype pollution & structure
            const sanitized: Todo[] = parsed.map(item => ({
              id: String(item.id || Math.random()),
              text: String(item.text || ''),
              completed: Boolean(item.completed),
              priority: ['low', 'medium', 'high'].includes(item.priority) ? item.priority : 'medium',
              dueDate: item.dueDate ? String(item.dueDate) : undefined,
              tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
              subtasks: Array.isArray(item.subtasks) ? item.subtasks.map((st: any) => ({
                id: String(st.id || Math.random()),
                text: String(st.text || ''),
                completed: Boolean(st.completed)
              })) : [],
              createdAt: Number(item.createdAt || Date.now())
            }));
            setTodos(sanitized);
            pushHistory(sanitized);
            announce(`Successfully imported ${sanitized.length} tasks`);
            showToast(`Imported ${sanitized.length} tasks`);
          }
        } catch (err) {
          alert('Invalid JSON file format');
        }
      };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center py-8 px-4 font-sans transition-colors">
      
      {/* ARIA Live Region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* Header */}
      <header className="w-full max-w-2xl flex flex-col items-center mb-8 todo-shell">
        <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-blue-700 dark:text-blue-400">
            TodoMVC+
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {/* Theme switcher */}
            <button
              onClick={() => {
                if (theme === 'system') setTheme('light');
                else if (theme === 'light') setTheme('dark');
                else if (theme === 'dark') setTheme('high-contrast');
                else setTheme('system');
              }}
              aria-label={`Current theme: ${theme}. Click to change.`}
              className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title={`Theme: ${theme}`}
            >
              {theme === 'light' && <Sun className="w-5 h-5 text-amber-500" />}
              {theme === 'dark' && <Moon className="w-5 h-5 text-blue-400" />}
              {theme === 'high-contrast' && <AlertCircle className="w-5 h-5 text-yellow-400" />}
              {theme === 'system' && <Monitor className="w-5 h-5 text-slate-500" />}
            </button>

            {/* Undo / Redo */}
            <button
              onClick={() => {
                if (historyIndex > 0) {
                  const prevIdx = historyIndex - 1;
                  setHistoryIndex(prevIdx);
                  setTodos(history[prevIdx]);
                  saveTodos(history[prevIdx]);
                  announce('Undid action');
                }
              }}
              disabled={historyIndex <= 0}
              aria-label="Undo action"
              className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                if (historyIndex < history.length - 1) {
                  const nextIdx = historyIndex + 1;
                  setHistoryIndex(nextIdx);
                  setTodos(history[nextIdx]);
                  saveTodos(history[nextIdx]);
                  announce('Redid action');
                }
              }}
              disabled={historyIndex >= history.length - 1}
              aria-label="Redo action"
              className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Redo (Ctrl+Shift+Z)"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            {/* Export & Import */}
            <button
              onClick={exportJSON}
              aria-label="Export todos to JSON"
              className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Export JSON"
            >
              <Download className="w-5 h-5" />
            </button>
            <label 
              aria-label="Import todos from JSON"
              className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer focus-within:ring-2 focus-within:ring-blue-500"
              title="Import JSON"
            >
              <Upload className="w-5 h-5 inline" />
              <input type="file" accept=".json" onChange={importJSON} className="sr-only" />
            </label>
          </div>
        </div>

        {/* Add Todo Form */}
        <form onSubmit={handleAddTodo} className="w-full todo-card bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="What needs to be done? (Press Enter)"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-base sm:text-lg px-2 py-1 placeholder:text-slate-600 dark:placeholder:text-slate-400"
              aria-label="New todo text"
            />
            <button
              type="button"
              onClick={() => setShowAdvancedForm(!showAdvancedForm)}
              className="text-sm px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium transition"
            >
              {showAdvancedForm ? 'Simple' : '+ Details'}
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium shadow transition flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Plus className="w-5 h-5" /> Add
            </button>
          </div>

          {/* Advanced Form Options */}
          {showAdvancedForm && (
            <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-sm">
              <div className="flex items-center gap-1.5">
                <label htmlFor="todo-priority" className="text-slate-600 dark:text-slate-300 font-medium">Priority:</label>
                <select
                  id="todo-priority"
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <label htmlFor="todo-due-date" className="text-slate-600 dark:text-slate-300 font-medium">Due Date:</label>
                <input
                  id="todo-due-date"
                  type="date"
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <label htmlFor="todo-tag-input" className="text-slate-600 dark:text-slate-300 font-medium">Tag:</label>
                <input
                  id="todo-tag-input"
                  type="text"
                  placeholder="e.g. work, personal"
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newTagInput.trim()) {
                      e.preventDefault();
                      if (!newTags.includes(newTagInput.trim())) {
                        setNewTags([...newTags, newTagInput.trim()]);
                      }
                      setNewTagInput('');
                    }
                  }}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="w-full flex flex-wrap gap-1 mt-1">
                {newTags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    #{tag}
                    <button type="button" onClick={() => setNewTags(newTags.filter(t => t !== tag))} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </form>
      </header>

      {/* Main Todo Container */}
      <main className="w-full max-w-2xl todo-shell todo-card bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          
          {/* Search & Tag Filter */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" aria-hidden="true" />
            <input
              id="search-input"
              type="text"
              aria-label="Search todos or tags"
              placeholder="Search todos or tags (Press '/' to focus)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full min-w-0 bg-transparent border-none outline-none text-sm placeholder:text-slate-600 dark:placeholder:text-slate-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} aria-label="Clear search" className="min-w-6 min-h-6 p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="sort-select" className="text-slate-600 dark:text-slate-300">Sort:</label>
            <select
              id="sort-select"
              aria-label="Sort todos"
              value={sort}
              onChange={e => setSort(e.target.value as SortType)}
              className="bg-slate-100 dark:bg-slate-800 rounded-lg px-2.5 py-1 border border-slate-200 dark:border-slate-700 font-medium"
            >
              <option value="created">Created</option>
              <option value="priority">Priority</option>
              <option value="dueDate">Due Date</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Tag Pills */}
        {allTags.length > 0 && (
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-1.5 items-center text-xs">
            <span className="font-semibold text-slate-500 mr-1">Tags:</span>
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${selectedTag === null ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
            >
              All Tags
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${selectedTag === tag ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Todo List */}
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto" role="list">
          {filteredTodos.length === 0 ? (
            <li className="py-12 text-center text-slate-600 dark:text-slate-300">
              No tasks found. Time to relax or add a new one!
            </li>
          ) : (
            filteredTodos.map(todo => (
              <li 
                key={todo.id}
                className={`todo-row group flex flex-col p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition ${todo.completed ? 'opacity-75 bg-slate-50/50 dark:bg-slate-900/30' : ''}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => toggleTodo(todo.id)}
                      aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
                      className="w-6 h-6 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />

                    {editingId === todo.id ? (
                      <input
                        type="text"
                        aria-label={`Edit task "${todo.text}" text`}
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveEditing(todo.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="flex-1 min-w-0 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-blue-500 outline-none"
                      />
                    ) : (
                      <span className={`flex-1 text-base break-words ${todo.completed ? 'line-through text-slate-600 dark:text-slate-400' : ''}`}>
                        {todo.text}
                      </span>
                    )}
                  </div>

                  {/* Metadata badges */}
                  <div className="flex items-center gap-2 text-xs">
                    {todo.priority === 'high' && (
                      <span className="px-2 py-0.5 rounded font-semibold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">High</span>
                    )}
                    {todo.priority === 'low' && (
                      <span className="px-2 py-0.5 rounded font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Low</span>
                    )}
                    {todo.dueDate && (
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        <Calendar className="w-3 h-3" aria-hidden="true" /> {todo.dueDate}
                      </span>
                    )}

                    {/* Actions */}
                    {editingId === todo.id ? (
                      <button
                        onClick={() => saveEditing(todo.id)}
                        aria-label={`Save task "${todo.text}"`}
                        className="min-w-6 min-h-6 p-1 rounded text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => startEditing(todo)}
                        aria-label={`Edit task "${todo.text}"`}
                        className="min-w-6 min-h-6 p-1 rounded text-slate-600 dark:text-slate-300 hover:text-blue-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => deleteTodo(todo.id)}
                      aria-label={`Delete task "${todo.text}"`}
                      className="min-w-6 min-h-6 p-1 rounded text-slate-600 dark:text-slate-300 hover:text-red-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tags & Subtasks display */}
                {(todo.tags?.length > 0 || todo.subtasks?.length > 0) && (
                  <div className="mt-2 pl-8 flex flex-wrap gap-2 items-center text-xs">
                    {todo.tags?.map(tag => (
                      <span key={tag} className="text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        #{tag}
                      </span>
                    ))}
                    {todo.subtasks?.map(st => (
                      <label key={st.id} className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300 bg-slate-100/60 dark:bg-slate-800/60 px-2 py-0.5 rounded">
                        <input
                          type="checkbox"
                          checked={st.completed}
                          onChange={() => toggleSubtask(todo.id, st.id)}
                          className="w-3.5 h-3.5 rounded border-slate-300"
                        />
                        <span className={st.completed ? 'line-through opacity-50' : ''}>{st.text}</span>
                      </label>
                    ))}
                  </div>
                )}
              </li>
            ))
          )}
        </ul>

        {/* Footer / Stats & Filters */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-sm">
          <div className="text-slate-600 dark:text-slate-300 font-medium">
            <span className="font-bold text-slate-900 dark:text-slate-100">{activeCount}</span> item{activeCount === 1 ? '' : 's'} left
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(['all', 'active', 'completed'] as const).map(f => (
              <button
                key={f}
                onClick={() => {
                  const apply = () => setFilter(f);
                  if ('startViewTransition' in document && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                    (document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition(apply);
                  } else {
                    apply();
                  }
                }}
                className={`px-3 py-1 rounded-lg font-medium capitalize transition ${filter === f ? 'bg-blue-700 text-white shadow-sm' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
              >
                {f}
              </button>
            ))}
          </div>

          {completedCount > 0 && (
            <button
              onClick={clearCompleted}
              className="text-slate-600 dark:text-slate-300 hover:text-red-700 font-medium transition"
            >
              Clear completed ({completedCount})
            </button>
          )}
        </div>
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <aside aria-label="Notification" className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-slate-800 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-bounce">
          <span>{toastMessage}</span>
          {toastUndoAction && (
            <button
              onClick={() => {
                toastUndoAction();
                setToastMessage(null);
                setToastUndoAction(null);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-xs px-2.5 py-1 rounded-lg font-semibold transition"
            >
              Undo
            </button>
          )}
        </aside>
      )}

      {/* Footer Info */}
      <footer className="mt-8 text-center text-xs text-slate-600 dark:text-slate-300">
        <p>TodoMVC+ • React 19 + TypeScript + Vite + Tailwind CSS v4</p>
        <p className="mt-1">Press <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono">/</kbd> to search, <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono">Ctrl+Z</kbd> to undo.</p>
      </footer>
    </div>
  );
}
