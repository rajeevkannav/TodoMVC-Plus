import { useState, useEffect, useCallback, useMemo } from 'react';
import { Todo, FilterType, Action } from '../types';
import { generateId } from '../lib/utils';
import { saveTodos, loadTodos } from '../lib/db';

const SYNC_CHANNEL = 'todomvc_sync';

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [history, setHistory] = useState<Todo[][]>([]);
  const [future, setFuture] = useState<Todo[][]>([]);
  const [announcement, setAnnouncement] = useState('');

  // Multi-tab sync
  const channel = useMemo(() => new BroadcastChannel(SYNC_CHANNEL), []);

  useEffect(() => {
    loadTodos().then(setTodos);
    
    channel.onmessage = (event) => {
      if (event.data.type === 'SYNC_TODOS') {
        setTodos(event.data.todos);
      }
    };
    return () => channel.close();
  }, [channel]);

  const updateTodos = useCallback((newTodos: Todo[], skipHistory = false) => {
    if (!skipHistory) {
      setHistory(prev => [...prev, todos].slice(-50));
      setFuture([]);
    }
    setTodos(newTodos);
    saveTodos(newTodos);
    channel.postMessage({ type: 'SYNC_TODOS', todos: newTodos });
  }, [todos, channel]);

  const dispatch = useCallback((action: Action) => {
    switch (action.type) {
      case 'ADD_TODO': {
        const newTodo: Todo = {
          id: generateId(),
          text: action.text.trim(),
          completed: false,
          createdAt: Date.now(),
        };
        updateTodos([...todos, newTodo]);
        setAnnouncement(`Added task: ${newTodo.text}`);
        break;
      }
      case 'TOGGLE_TODO':
        updateTodos(todos.map(t => t.id === action.id ? { ...t, completed: !t.completed } : t));
        break;
      case 'DELETE_TODO':
        updateTodos(todos.filter(t => t.id !== action.id));
        setAnnouncement('Task deleted');
        break;
      case 'EDIT_TODO':
        updateTodos(todos.map(t => t.id === action.id ? { ...t, text: action.text.trim() } : t));
        break;
      case 'TOGGLE_ALL':
        updateTodos(todos.map(t => ({ ...t, completed: action.completed })));
        break;
      case 'CLEAR_COMPLETED':
        updateTodos(todos.filter(t => !t.completed));
        setAnnouncement('Cleared completed tasks');
        break;
      case 'SET_FILTER':
        setFilter(action.filter);
        break;
      case 'SET_TODOS':
        updateTodos(action.todos);
        break;
    }
  }, [todos, updateTodos]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setFuture(prev => [todos, ...prev]);
    setHistory(prev => prev.slice(0, -1));
    setTodos(previous);
    saveTodos(previous);
    channel.postMessage({ type: 'SYNC_TODOS', todos: previous });
    setAnnouncement('Undo performed');
  }, [history, todos, channel]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory(prev => [...prev, todos]);
    setFuture(prev => prev.slice(1));
    setTodos(next);
    saveTodos(next);
    channel.postMessage({ type: 'SYNC_TODOS', todos: next });
    setAnnouncement('Redo performed');
  }, [future, todos, channel]);

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

  const filteredTodos = useMemo(() => {
    return todos.filter(t => {
      if (filter === 'active') return !t.completed;
      if (filter === 'completed') return t.completed;
      return true;
    });
  }, [todos, filter]);

  return {
    todos,
    filteredTodos,
    filter,
    dispatch,
    undo,
    redo,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    announcement
  };
}