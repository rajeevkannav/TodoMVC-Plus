import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { flushSync } from 'react-dom';
import {
  activeCount,
  filterTodos,
  initialState,
  parseImport,
  serializeExport,
  todoReducer,
  type Filter,
  type Todo,
  type TodoAction,
} from './todos';
import {
  applyTheme,
  loadFromIndexedDb,
  loadMirror,
  loadTheme,
  openSyncChannel,
  saveTheme,
  saveTodos,
  type SyncChannel,
  type Theme,
} from './storage';

export const STACK_ID = 'react19-ts-vite';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
];

type FocusTarget =
  | { kind: 'input' }
  | { kind: 'title'; id: string }
  | { kind: 'destroy'; id: string }
  | { kind: 'edit'; id: string };

function sameTodos(a: Todo[], b: Todo[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLTextAreaElement || target.isContentEditable) return true;
  if (target instanceof HTMLInputElement) {
    return !['checkbox', 'radio', 'button', 'submit', 'reset', 'file'].includes(target.type);
  }
  return false;
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function readFileText(file: Blob): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

type ViewTransitionDocument = Document & { startViewTransition?: (cb: () => void) => unknown };

export default function App() {
  const [state, dispatch] = useReducer(todoReducer, undefined, () => initialState(loadMirror()));
  const [filter, setFilter] = useState<Filter>('all');
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [theme, setTheme] = useState<Theme>(() => loadTheme());

  const { todos, past, future } = state;
  const visible = filterTodos(todos, filter);
  const remaining = activeCount(todos);
  const completedCount = todos.length - remaining;
  const allCompleted = todos.length > 0 && remaining === 0;

  const newTodoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const pendingFocus = useRef<FocusTarget | null>(null);
  const editFinished = useRef(false);
  const skipPersist = useRef(true); // skip the initial render
  const userChanged = useRef(false);
  const channelRef = useRef<SyncChannel | null>(null);

  const announce = useCallback((message: string) => setAnnouncement(message), []);

  const act = useCallback((action: TodoAction) => {
    userChanged.current = true;
    dispatch(action);
  }, []);

  // Theme: attribute on <html> + remembered choice.
  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  // Hydrate from IndexedDB and subscribe to cross-tab sync.
  useEffect(() => {
    let cancelled = false;
    const channel = openSyncChannel((remote) => {
      skipPersist.current = true;
      dispatch({ type: 'sync', todos: remote });
    });
    channelRef.current = channel;
    void loadFromIndexedDb().then((stored) => {
      if (cancelled || userChanged.current) return;
      if (stored === null) {
        // First run with IndexedDB: seed it from the localStorage mirror.
        saveTodos(loadMirror());
        return;
      }
      skipPersist.current = true;
      dispatch({ type: 'sync', todos: stored });
    });
    return () => {
      cancelled = true;
      channel.close();
      channelRef.current = null;
    };
  }, []);

  // Persist + broadcast local changes.
  useEffect(() => {
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    saveTodos(todos);
    channelRef.current?.post(todos);
  }, [todos]);

  // Apply any requested focus move after the DOM has updated.
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    if (target.kind === 'input') {
      newTodoRef.current?.focus();
      return;
    }
    const li = itemRefs.current.get(target.id);
    const selector = { title: '.todo-title', destroy: '.todo-destroy', edit: '.todo-edit' }[target.kind];
    const el = li?.querySelector<HTMLElement>(selector);
    if (el) el.focus();
    else newTodoRef.current?.focus();
  });

  /** After removing `id`, move focus to the next visible item, else previous, else the new-todo input. */
  const focusAfterRemoval = (id: string) => {
    const index = visible.findIndex((t) => t.id === id);
    const neighbour = visible[index + 1] ?? visible[index - 1];
    pendingFocus.current = neighbour ? { kind: 'destroy', id: neighbour.id } : { kind: 'input' };
  };

  const undo = useCallback(() => {
    if (past.length === 0) return;
    act({ type: 'undo' });
    announce('Undid last change');
  }, [act, announce, past.length]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    act({ type: 'redo' });
    announce('Redid last change');
  }, [act, announce, future.length]);

  // Global Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (Ctrl+Y also redoes).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (isTextEntry(event.target)) return; // keep native text undo inside inputs
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) {
      setNewTitle('');
      return;
    }
    act({ type: 'add', title });
    setNewTitle('');
    announce(`Added "${title}"`);
  };

  const toggle = (todo: Todo) => {
    act({ type: 'toggle', id: todo.id });
    announce(`Marked "${todo.title}" as ${todo.completed ? 'active' : 'completed'}`);
  };

  const toggleAll = () => {
    act({ type: 'toggleAll', completed: !allCompleted });
    announce(allCompleted ? 'Marked all todos as active' : 'Marked all todos as completed');
  };

  const destroy = (todo: Todo) => {
    focusAfterRemoval(todo.id);
    act({ type: 'delete', id: todo.id });
    announce(`Deleted "${todo.title}"`);
  };

  const clearCompleted = () => {
    act({ type: 'clearCompleted' });
    pendingFocus.current = { kind: 'input' };
    announce(`Cleared ${completedCount} completed ${completedCount === 1 ? 'todo' : 'todos'}`);
  };

  const startEdit = (todo: Todo) => {
    editFinished.current = false;
    setEditingId(todo.id);
    setEditText(todo.title);
    pendingFocus.current = { kind: 'edit', id: todo.id };
  };

  const finishEdit = (todo: Todo, save: boolean, moveFocus: boolean) => {
    if (editFinished.current) return;
    editFinished.current = true;
    setEditingId(null);
    if (!save) {
      if (moveFocus) pendingFocus.current = { kind: 'title', id: todo.id };
      return;
    }
    const title = editText.trim();
    if (!title) {
      if (moveFocus) focusAfterRemoval(todo.id);
      act({ type: 'edit', id: todo.id, title });
      announce(`Deleted "${todo.title}"`);
      return;
    }
    if (moveFocus) pendingFocus.current = { kind: 'title', id: todo.id };
    if (title !== todo.title) {
      act({ type: 'edit', id: todo.id, title });
      announce(`Renamed "${todo.title}" to "${title}"`);
    }
  };

  const onEditKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>, todo: Todo) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finishEdit(todo, true, true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      finishEdit(todo, false, true);
    }
  };

  const onTitleKeyDown = (event: ReactKeyboardEvent<HTMLSpanElement>, todo: Todo) => {
    if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault();
      startEdit(todo);
    }
  };

  const changeFilter = (next: Filter) => {
    if (next === filter) return;
    const doc = document as ViewTransitionDocument;
    if (typeof doc.startViewTransition === 'function' && !prefersReducedMotion()) {
      doc.startViewTransition(() => flushSync(() => setFilter(next)));
    } else {
      setFilter(next);
    }
  };

  const exportTodos = () => {
    const blob = new Blob([serializeExport(todos)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `todomvc-plus-${new Date().toISOString().slice(0, 10)}.json`;
    link.rel = 'noopener';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    announce(`Exported ${todos.length} ${todos.length === 1 ? 'todo' : 'todos'}`);
  };

  const onImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 5_000_000) {
      announce('Import failed: file is too large.');
      return;
    }
    let text: string;
    try {
      text = await readFileText(file);
    } catch {
      announce('Import failed: the file could not be read.');
      return;
    }
    const result = parseImport(text);
    if (!result.ok) {
      announce(result.error);
      return;
    }
    act({ type: 'import', todos: result.todos });
    setEditingId(null);
    announce(`Imported ${result.todos.length} ${result.todos.length === 1 ? 'todo' : 'todos'}`);
  };

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <main className="todoapp" aria-labelledby="app-title">
      <header className="app-header">
        <h1 id="app-title" className="app-title">
          TodoMVC+
        </h1>
        <p className="app-stack">{STACK_ID}</p>
        <div className="app-toolbar" role="toolbar" aria-label="App actions">
          <button type="button" className="btn" onClick={undo} disabled={past.length === 0} aria-keyshortcuts="Control+Z">
            Undo
          </button>
          <button
            type="button"
            className="btn"
            onClick={redo}
            disabled={future.length === 0}
            aria-keyshortcuts="Control+Shift+Z"
          >
            Redo
          </button>
          <button type="button" className="btn" onClick={exportTodos}>
            Export
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            aria-label="Import todos from JSON file"
            onChange={(e) => void onImportFile(e)}
          />
          <button type="button" className="btn" aria-pressed={theme === 'dark'} onClick={toggleTheme}>
            Dark theme
          </button>
        </div>
      </header>

      <form className="new-todo-form" onSubmit={onSubmit}>
        <label htmlFor="new-todo" className="sr-only">
          New todo
        </label>
        <input
          ref={newTodoRef}
          id="new-todo"
          className="new-todo"
          placeholder="What needs to be done?"
          autoComplete="off"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">
          Add
        </button>
      </form>

      {todos.length > 0 && (
        <section className="todo-main" aria-label="Todos">
          <input id="toggle-all" className="toggle-all" type="checkbox" checked={allCompleted} onChange={toggleAll} />
          <label htmlFor="toggle-all">Mark all as complete</label>
          <ul className="todo-list">
            {visible.map((todo) => {
              const editing = editingId === todo.id;
              const classes = ['todo-item'];
              if (todo.completed) classes.push('completed');
              if (editing) classes.push('editing');
              return (
                <li
                  key={todo.id}
                  className={classes.join(' ')}
                  ref={(el) => {
                    if (el) itemRefs.current.set(todo.id, el);
                    else itemRefs.current.delete(todo.id);
                  }}
                >
                  <input
                    type="checkbox"
                    className="todo-toggle"
                    checked={todo.completed}
                    onChange={() => toggle(todo)}
                    aria-label={`Toggle ${todo.title}`}
                  />
                  {editing ? (
                    <input
                      className="todo-edit"
                      aria-label={`Edit ${todo.title}`}
                      value={editText}
                      autoComplete="off"
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => onEditKeyDown(e, todo)}
                      onBlur={() => finishEdit(todo, true, false)}
                    />
                  ) : (
                    <span
                      className="todo-title"
                      tabIndex={0}
                      title="Double-click or press Enter to edit"
                      onDoubleClick={() => startEdit(todo)}
                      onKeyDown={(e) => onTitleKeyDown(e, todo)}
                    >
                      {todo.title}
                    </span>
                  )}
                  <button
                    type="button"
                    className="todo-destroy"
                    aria-label={`Delete ${todo.title}`}
                    onClick={() => destroy(todo)}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {todos.length > 0 && (
        <footer className="app-footer">
          <span className="todo-count">
            <strong>{remaining}</strong> {remaining === 1 ? 'item' : 'items'} left
          </span>
          <nav className="todo-filters" aria-label="Filter todos">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className="filter"
                aria-pressed={filter === f.id}
                onClick={() => changeFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </nav>
          <button type="button" className="btn clear-completed" onClick={clearCompleted} disabled={completedCount === 0}>
            Clear completed
          </button>
        </footer>
      )}

      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </main>
  );
}
