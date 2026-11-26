import { useState, useEffect, useCallback, useRef } from 'react';
import { Todo, Filter, HistoryState } from '../types';
import { saveTodos, loadTodos } from '../lib/storage';

const SYNC_CHANNEL = 'todomvc_sync';

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: [],
    future: []
  });
  const [announcement, setAnnouncement] = useState('');
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Initialize
  useEffect(() => {
    loadTodos().then(loaded => {
      setTodos(loaded);
      setHistory(h => ({ ...h, present: loaded }));
    });

    if (typeof BroadcastChannel !== 'undefined') {
      channelRef.current = new BroadcastChannel(SYNC_CHANNEL);
      channelRef.current.onmessage = (event) => {
        if (event.data.type === 'SYNC_TODOS') {
          setTodos(event.data.todos);
        }
      };
    }

    return () => channelRef.current?.close();
  }, []);

  const updateTodos = useCallback((newTodos: Todo[], skipHistory = false, msg = '') => {
    setTodos(newTodos);
    saveTodos(newTodos);
    if (msg) setAnnouncement(msg);
    
    if (!skipHistory) {
      setHistory(prev => ({
        past: [...prev.past, prev.present],
        present: newTodos,
        future: []
      }));
    }

    channelRef.current?.postMessage({ type: 'SYNC_TODOS', todos: newTodos });
  }, []);

  const addTodo = (text: string) => {
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text: text.trim(),
      completed: false,
      createdAt: Date.now()
    };
    updateTodos([...todos, newTodo], false, `Added task: ${text}`);
  };

  const toggleTodo = (id: string) => {
    const newTodos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    updateTodos(newTodos, false, 'Task status updated');
  };

  const deleteTodo = (id: string) => {
    const newTodos = todos.filter(t => t.id !== id);
    updateTodos(newTodos, false, 'Task deleted');
  };

  const editTodo = (id: string, text: string) => {
    if (!text.trim()) {
      deleteTodo(id);
      return;
    }
    const newTodos = todos.map(t => t.id === id ? { ...t, text: text.trim() } : t);
    updateTodos(newTodos, false, 'Task edited');
  };

  const toggleAll = () => {
    const allCompleted = todos.every(t => t.completed);
    const newTodos = todos.map(t => ({ ...t, completed: !allCompleted }));
    updateTodos(newTodos, false, allCompleted ? 'All tasks marked active' : 'All tasks marked completed');
  };

  const clearCompleted = () => {
    const newTodos = todos.filter(t => !t.completed);
    updateTodos(newTodos, false, 'Cleared completed tasks');
  };

  const undo = () => {
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
    setAnnouncement('Undo performed');
  };

  const redo = () => {
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
    setAnnouncement('Redo performed');
  };

  const importTodos = (json: string) => {
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) throw new Error('Invalid format');
      // Prototype pollution check & validation
      const validated: Todo[] = parsed
        .filter(item => item && typeof item === 'object' && !Array.isArray(item))
        .map(item => {
          const { id, text, completed, createdAt } = item;
          if (typeof id !== 'string' || typeof text !== 'string' || typeof completed !== 'boolean') return null;
          return { id, text, completed, createdAt: typeof createdAt === 'number' ? createdAt : Date.now() };
        })
        .filter((t): t is Todo => t !== null);
      
      updateTodos(validated, false, 'Todos imported successfully');
    } catch (e) {
      setAnnouncement('Failed to import todos: Invalid file');
    }
  };

  return {
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
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    announcement,
    importTodos
  };
}