import { useState, useEffect, useCallback, useRef } from 'react';
import { Todo, TodoDB } from '../lib/db';
import { validateImport } from '../lib/utils';

const db = new TodoDB();
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('todo_sync') : null;

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [history, setHistory] = useState<Todo[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [announcement, setAnnouncement] = useState('');
  const isInternalUpdate = useRef(false);

  const updateTodos = useCallback((newTodos: Todo[], skipHistory = false) => {
    setTodos(newTodos);
    db.saveAll(newTodos);
    channel?.postMessage(newTodos);

    if (!skipHistory) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newTodos);
      if (newHistory.length > 50) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [history, historyIndex]);

  useEffect(() => {
    db.getAll().then(loaded => {
      setTodos(loaded);
      setHistory([loaded]);
      setHistoryIndex(0);
    });

    const handleSync = (event: MessageEvent) => {
      if (Array.isArray(event.data)) {
        setTodos(event.data);
      }
    };

    channel?.addEventListener('message', handleSync);
    return () => channel?.removeEventListener('message', handleSync);
  }, []);

  const addTodo = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const newTodo: Todo = { id: crypto.randomUUID(), text: trimmed, completed: false, createdAt: Date.now() };
    updateTodos([...todos, newTodo]);
    setAnnouncement(`Added todo: ${trimmed}`);
  };

  const toggleTodo = (id: string) => {
    const newTodos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    updateTodos(newTodos);
  };

  const deleteTodo = (id: string) => {
    const todo = todos.find(t => t.id === id);
    updateTodos(todos.filter(t => t.id !== id));
    setAnnouncement(`Deleted todo: ${todo?.text}`);
  };

  const editTodo = (id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      deleteTodo(id);
      return;
    }
    updateTodos(todos.map(t => t.id === id ? { ...t, text: trimmed } : t));
  };

  const clearCompleted = () => {
    updateTodos(todos.filter(t => !t.completed));
    setAnnouncement('Cleared completed todos');
  };

  const toggleAll = (completed: boolean) => {
    updateTodos(todos.map(t => ({ ...t, completed })));
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setTodos(prev);
      setHistoryIndex(historyIndex - 1);
      db.saveAll(prev);
      setAnnouncement('Undo performed');
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setTodos(next);
      setHistoryIndex(historyIndex + 1);
      db.saveAll(next);
      setAnnouncement('Redo performed');
    }
  };

  const importTodos = (json: string) => {
    try {
      const data = JSON.parse(json);
      const validated = validateImport(data);
      updateTodos(validated);
      setAnnouncement('Todos imported successfully');
    } catch (e) {
      setAnnouncement('Failed to import todos');
    }
  };

  return {
    todos,
    addTodo,
    toggleTodo,
    deleteTodo,
    editTodo,
    clearCompleted,
    toggleAll,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    announcement,
    importTodos
  };
}