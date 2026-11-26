import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { saveToDb, loadFromDb } from '../lib/db';
import { generateId } from '../lib/utils';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export type Filter = 'all' | 'active' | 'completed';

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [history, setHistory] = useState<Todo[][]>([]);
  const [future, setFuture] = useState<Todo[][]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Initialize
  useEffect(() => {
    const init = async () => {
      const saved = await loadFromDb<Todo[]>();
      if (saved) setTodos(saved);
      setIsLoaded(true);
    };
    init();

    if (typeof BroadcastChannel !== 'undefined') {
      channelRef.current = new BroadcastChannel('todo_sync');
      channelRef.current.onmessage = (event) => {
        if (event.data?.type === 'SYNC_TODOS') {
          setTodos(event.data.payload);
        }
      };
    }

    return () => channelRef.current?.close();
  }, []);

  const updateTodos = useCallback((newTodos: Todo[], skipHistory = false) => {
    if (!skipHistory) {
      setHistory(prev => [...prev.slice(-19), todos]);
      setFuture([]);
    }
    setTodos(newTodos);
    saveToDb(newTodos);
    channelRef.current?.postMessage({ type: 'SYNC_TODOS', payload: newTodos });
  }, [todos]);

  const addTodo = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const newTodo = { id: generateId(), text: trimmed, completed: false, createdAt: Date.now() };
    updateTodos([...todos, newTodo]);
    setAnnouncement(`Added todo: ${trimmed}`);
  };

  const toggleTodo = (id: string) => {
    const newTodos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    updateTodos(newTodos);
    const todo = todos.find(t => t.id === id);
    setAnnouncement(`Marked ${todo?.text} as ${!todo?.completed ? 'completed' : 'active'}`);
  };

  const editTodo = (id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      deleteTodo(id);
      return;
    }
    updateTodos(todos.map(t => t.id === id ? { ...t, text: trimmed } : t));
  };

  const deleteTodo = (id: string) => {
    const todo = todos.find(t => t.id === id);
    updateTodos(todos.filter(t => t.id !== id));
    setAnnouncement(`Deleted todo: ${todo?.text}`);
  };

  const toggleAll = () => {
    const allCompleted = todos.every(t => t.completed);
    updateTodos(todos.map(t => ({ ...t, completed: !allCompleted })));
    setAnnouncement(allCompleted ? 'Marked all as active' : 'Marked all as completed');
  };

  const clearCompleted = () => {
    updateTodos(todos.filter(t => !t.completed));
    setAnnouncement('Cleared completed todos');
  };

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setFuture(f => [todos, ...f]);
    setHistory(h => h.slice(0, -1));
    setTodos(prev);
    saveToDb(prev);
    setAnnouncement('Undo performed');
  }, [history, todos]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory(h => [...h, todos]);
    setFuture(f => f.slice(1));
    setTodos(next);
    saveToDb(next);
    setAnnouncement('Redo performed');
  }, [future, todos]);

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

  return {
    todos,
    isLoaded,
    addTodo,
    toggleTodo,
    editTodo,
    deleteTodo,
    toggleAll,
    clearCompleted,
    undo,
    redo,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    announcement,
    setTodos: updateTodos
  };
}