import { useState, useEffect, useCallback, useTransition } from 'react';
import { Todo, Filter, TodoListSchema } from '../types';
import { saveTodos, loadTodos } from '../lib/db';

const SYNC_CHANNEL = 'todomvc_sync';

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [history, setHistory] = useState<Todo[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [filter, setFilter] = useState<Filter>('all');
  const [isPending, startTransition] = useTransition();
  const [announcement, setAnnouncement] = useState('');

  // Initialize
  useEffect(() => {
    loadTodos().then(loaded => {
      setTodos(loaded);
      setHistory([loaded]);
      setHistoryIndex(0);
    });

    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(SYNC_CHANNEL) : null;
    if (channel) {
      channel.onmessage = (event) => {
        if (event.data === 'update') {
          loadTodos().then(setTodos);
        }
      };
    }
    return () => channel?.close();
  }, []);

  const updateState = useCallback((newTodos: Todo[], announce?: string) => {
    const update = () => {
      setTodos(newTodos);
      saveTodos(newTodos);
      
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newTodos);
      if (newHistory.length > 50) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      if (announce) setAnnouncement(announce);
      
      if (typeof BroadcastChannel !== 'undefined') {
        new BroadcastChannel(SYNC_CHANNEL).postMessage('update');
      }
    };

    if (document.startViewTransition) {
      document.startViewTransition(update);
    } else {
      update();
    }
  }, [history, historyIndex]);

  const addTodo = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text: trimmed,
      completed: false,
      createdAt: Date.now(),
    };
    updateState([newTodo, ...todos], `Added todo: ${trimmed}`);
  };

  const toggleTodo = (id: string) => {
    const newTodos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    updateState(newTodos, 'Toggled todo status');
  };

  const deleteTodo = (id: string) => {
    const newTodos = todos.filter(t => t.id !== id);
    updateState(newTodos, 'Deleted todo');
  };

  const editTodo = (id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      deleteTodo(id);
      return;
    }
    const newTodos = todos.map(t => t.id === id ? { ...t, text: trimmed } : t);
    updateState(newTodos, 'Updated todo text');
  };

  const clearCompleted = () => {
    const newTodos = todos.filter(t => !t.completed);
    updateState(newTodos, 'Cleared completed todos');
  };

  const toggleAll = () => {
    const allCompleted = todos.every(t => t.completed);
    const newTodos = todos.map(t => ({ ...t, completed: !allCompleted }));
    updateState(newTodos, allCompleted ? 'Marked all as active' : 'Marked all as completed');
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setTodos(prev);
      setHistoryIndex(historyIndex - 1);
      saveTodos(prev);
      setAnnouncement('Undo performed');
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setTodos(next);
      setHistoryIndex(historyIndex + 1);
      saveTodos(next);
      setAnnouncement('Redo performed');
    }
  };

  const importTodos = (json: string) => {
    try {
      const parsed = JSON.parse(json);
      const validated = TodoListSchema.parse(parsed);
      updateState(validated, 'Imported todos successfully');
    } catch (e) {
      setAnnouncement('Failed to import: Invalid format');
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
    clearCompleted,
    toggleAll,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    announcement,
    importTodos,
  };
}