import { useState, useEffect, useCallback, useRef } from 'react';
import { Todo, loadTodosDB, saveTodosDB } from '../lib/storage';

export const useTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [history, setHistory] = useState<Todo[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [announcement, setAnnouncement] = useState('');
  const isInitialMount = useRef(true);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      channelRef.current = new BroadcastChannel('todomvc_sync');
      channelRef.current.onmessage = (event) => {
        if (event.data.type === 'SYNC_TODOS') {
          setTodos(event.data.payload);
        }
      };
    }
    loadTodosDB().then(loaded => {
      setTodos(loaded);
      isInitialMount.current = false;
    });
    return () => channelRef.current?.close();
  }, []);

  const updateTodos = useCallback((newTodos: Todo[], skipHistory = false) => {
    setTodos(newTodos);
    saveTodosDB(newTodos);
    channelRef.current?.postMessage({ type: 'SYNC_TODOS', payload: newTodos });

    if (!skipHistory) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newTodos);
      if (newHistory.length > 50) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [history, historyIndex]);

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
    const todo = todos.find(t => t.id === id);
    setAnnouncement(`Marked ${todo?.text} as ${!todo?.completed ? 'completed' : 'active'}`);
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

  const toggleAll = (completed: boolean) => {
    updateTodos(todos.map(t => ({ ...t, completed })));
    setAnnouncement(`Marked all as ${completed ? 'completed' : 'active'}`);
  };

  const clearCompleted = () => {
    updateTodos(todos.filter(t => !t.completed));
    setAnnouncement('Cleared completed todos');
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setTodos(prev);
      saveTodosDB(prev);
      setAnnouncement('Undo performed');
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setTodos(next);
      saveTodosDB(next);
      setAnnouncement('Redo performed');
    }
  };

  return {
    todos, 
    addTodo, 
    toggleTodo, 
    deleteTodo, 
    editTodo, 
    toggleAll, 
    clearCompleted, 
    undo, 
    redo, 
    canUndo: historyIndex > 0, 
    canRedo: historyIndex < history.length - 1,
    announcement,
    setTodos: updateTodos
  };
};