import { For, Show, batch, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
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

export const STACK_ID = 'solid-ts-vite';

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

const FOCUS_SELECTORS = { title: '.todo-title', destroy: '.todo-destroy', edit: '.todo-edit' } as const;

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

const plural = (n: number, word: string) => `${n} ${n === 1 ? word : `${word}s`}`;

type ViewTransitionDocument = Document & { startViewTransition?: (cb: () => void) => unknown };

export default function App() {
  const [state, setState] = createSignal(initialState(loadMirror()));
  const [filter, setFilter] = createSignal<Filter>('all');
  const [newTitle, setNewTitle] = createSignal('');
  const [editingId, setEditingId] = createSignal<string | null>(null);
  const [editText, setEditText] = createSignal('');
  const [announcement, setAnnouncement] = createSignal('');
  const [theme, setTheme] = createSignal<Theme>(loadTheme());

  const todos = () => state().todos;
  const byId = createMemo(() => new Map(todos().map((t) => [t.id, t])));
  const visible = createMemo(() => filterTodos(todos(), filter()));
  const visibleIds = createMemo(() => visible().map((t) => t.id));
  const remaining = createMemo(() => activeCount(todos()));
  const completedCount = () => todos().length - remaining();
  const allCompleted = () => todos().length > 0 && remaining() === 0;

  let newTodoRef: HTMLInputElement | undefined;
  let fileRef: HTMLInputElement | undefined;
  const itemRefs = new Map<string, HTMLLIElement>();
  let editFinished = false;
  let userChanged = false;
  let channel: SyncChannel | null = null;

  applyTheme(theme());

  const announce = (message: string) => setAnnouncement(message);

  /** Apply a user action synchronously, then persist and broadcast the result. */
  const act = (action: TodoAction) => {
    const before = state();
    const next = todoReducer(before, action);
    if (next === before) return;
    userChanged = true;
    setState(next);
    if (next.todos !== before.todos) {
      saveTodos(next.todos);
      channel?.post(next.todos);
    }
  };

  /** Move focus once the DOM reflects the latest state (Solid updates synchronously). */
  const moveFocus = (target: FocusTarget) => {
    if (target.kind === 'input') {
      newTodoRef?.focus();
      return;
    }
    const el = itemRefs.get(target.id)?.querySelector<HTMLElement>(FOCUS_SELECTORS[target.kind]);
    if (el) el.focus();
    else newTodoRef?.focus();
  };

  /** After removing `id`, focus the next visible item, else previous, else the new-todo input. */
  const focusTargetAfterRemoval = (id: string): FocusTarget => {
    const list = visible();
    const index = list.findIndex((t) => t.id === id);
    const neighbour = list[index + 1] ?? list[index - 1];
    return neighbour ? { kind: 'destroy', id: neighbour.id } : { kind: 'input' };
  };

  onMount(() => {
    let cancelled = false;
    channel = openSyncChannel((remote) => {
      batch(() => {
        setState((s) => todoReducer(s, { type: 'sync', todos: remote }));
        if (editingId() !== null && !remote.some((t) => t.id === editingId())) setEditingId(null);
      });
    });
    void loadFromIndexedDb().then((stored) => {
      if (cancelled || userChanged) return;
      if (stored === null) {
        // First run with IndexedDB: seed it from the localStorage mirror.
        saveTodos(state().todos);
        return;
      }
      setState((s) => todoReducer(s, { type: 'sync', todos: stored }));
    });

    // Global Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (Ctrl+Y also redoes).
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

    onCleanup(() => {
      cancelled = true;
      window.removeEventListener('keydown', onKeyDown);
      channel?.close();
      channel = null;
    });
  });

  const undo = () => {
    if (state().past.length === 0) return;
    batch(() => {
      setEditingId(null);
      act({ type: 'undo' });
      announce('Undid last change');
    });
  };

  const redo = () => {
    if (state().future.length === 0) return;
    batch(() => {
      setEditingId(null);
      act({ type: 'redo' });
      announce('Redid last change');
    });
  };

  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    const title = newTitle().trim();
    batch(() => {
      setNewTitle('');
      if (!title) return;
      act({ type: 'add', title });
      announce(`Added "${title}"`);
    });
  };

  const toggle = (todo: Todo) => {
    batch(() => {
      act({ type: 'toggle', id: todo.id });
      announce(`Marked "${todo.title}" as ${todo.completed ? 'active' : 'completed'}`);
    });
  };

  const toggleAll = () => {
    const completeAll = !allCompleted();
    batch(() => {
      act({ type: 'toggleAll', completed: completeAll });
      announce(completeAll ? 'Marked all todos as completed' : 'Marked all todos as active');
    });
  };

  const destroy = (todo: Todo) => {
    const target = focusTargetAfterRemoval(todo.id);
    batch(() => {
      act({ type: 'delete', id: todo.id });
      announce(`Deleted "${todo.title}"`);
    });
    moveFocus(target);
  };

  const clearCompleted = () => {
    const count = completedCount();
    batch(() => {
      act({ type: 'clearCompleted' });
      announce(`Cleared ${plural(count, 'completed todo')}`);
    });
    moveFocus({ kind: 'input' });
  };

  const startEdit = (todo: Todo) => {
    editFinished = false;
    batch(() => {
      setEditText(todo.title);
      setEditingId(todo.id);
    });
    moveFocus({ kind: 'edit', id: todo.id });
  };

  const finishEdit = (todo: Todo, save: boolean, returnFocus: boolean) => {
    if (editFinished) return;
    editFinished = true;
    const title = editText().trim();
    let target: FocusTarget = { kind: 'title', id: todo.id };
    batch(() => {
      setEditingId(null);
      if (!save) return;
      if (!title) {
        target = focusTargetAfterRemoval(todo.id);
        act({ type: 'edit', id: todo.id, title });
        announce(`Deleted "${todo.title}"`);
      } else if (title !== todo.title) {
        act({ type: 'edit', id: todo.id, title });
        announce(`Renamed "${todo.title}" to "${title}"`);
      }
    });
    if (returnFocus) moveFocus(target);
  };

  const onEditKeyDown = (event: KeyboardEvent, todo: Todo) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finishEdit(todo, true, true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      finishEdit(todo, false, true);
    }
  };

  const onTitleKeyDown = (event: KeyboardEvent, todo: Todo) => {
    if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault();
      startEdit(todo);
    }
  };

  const changeFilter = (next: Filter) => {
    if (next === filter()) return;
    const doc = document as ViewTransitionDocument;
    if (typeof doc.startViewTransition === 'function' && !prefersReducedMotion()) {
      doc.startViewTransition(() => setFilter(next));
    } else {
      setFilter(next);
    }
  };

  const exportTodos = () => {
    const list = todos();
    const blob = new Blob([serializeExport(list)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `todomvc-plus-${new Date().toISOString().slice(0, 10)}.json`;
    link.rel = 'noopener';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    announce(`Exported ${plural(list.length, 'todo')}`);
  };

  const onImportFile = async (event: Event & { currentTarget: HTMLInputElement }) => {
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
    batch(() => {
      setEditingId(null);
      act({ type: 'import', todos: result.todos });
      announce(`Imported ${plural(result.todos.length, 'todo')}`);
    });
  };

  const toggleTheme = () => {
    const next: Theme = theme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    saveTheme(next);
  };

  return (
    <main class="todoapp" aria-labelledby="app-title">
      <header class="app-header">
        <h1 id="app-title" class="app-title">
          TodoMVC+
        </h1>
        <p class="app-stack">{STACK_ID}</p>
        <div class="app-toolbar" role="toolbar" aria-label="App actions">
          <button
            type="button"
            class="btn"
            onClick={undo}
            disabled={state().past.length === 0}
            aria-keyshortcuts="Control+Z"
          >
            Undo
          </button>
          <button
            type="button"
            class="btn"
            onClick={redo}
            disabled={state().future.length === 0}
            aria-keyshortcuts="Control+Shift+Z"
          >
            Redo
          </button>
          <button type="button" class="btn" onClick={exportTodos}>
            Export
          </button>
          <button type="button" class="btn" onClick={() => fileRef?.click()}>
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
          <button type="button" class="btn" aria-pressed={theme() === 'dark'} onClick={toggleTheme}>
            Dark theme
          </button>
        </div>
      </header>

      <form class="new-todo-form" onSubmit={onSubmit}>
        <label for="new-todo" class="sr-only">
          New todo
        </label>
        <input
          ref={newTodoRef}
          id="new-todo"
          class="new-todo"
          placeholder="What needs to be done?"
          autocomplete="off"
          value={newTitle()}
          onInput={(e) => setNewTitle(e.currentTarget.value)}
        />
        <button type="submit" class="btn btn-primary">
          Add
        </button>
      </form>

      <Show when={todos().length > 0}>
        <section class="todo-main" aria-label="Todos">
          <input id="toggle-all" class="toggle-all" type="checkbox" checked={allCompleted()} onChange={toggleAll} />
          <label for="toggle-all">Mark all as complete</label>
          <ul class="todo-list">
            <For each={visibleIds()}>
              {(id) => {
                // Rows are keyed by id so a todo's DOM (and focus) survives edits and toggles.
                const todo = () => byId().get(id) ?? { id, title: '', completed: false };
                const editing = () => editingId() === id;
                onCleanup(() => itemRefs.delete(id));
                return (
                  <li
                    class="todo-item"
                    classList={{ completed: todo().completed, editing: editing() }}
                    ref={(el) => itemRefs.set(id, el)}
                  >
                    <input
                      type="checkbox"
                      class="todo-toggle"
                      checked={todo().completed}
                      onChange={() => toggle(todo())}
                      aria-label={`Toggle ${todo().title}`}
                    />
                    <Show
                      when={editing()}
                      fallback={
                        <span
                          class="todo-title"
                          tabIndex={0}
                          title="Double-click or press Enter to edit"
                          onDblClick={() => startEdit(todo())}
                          onKeyDown={(e) => onTitleKeyDown(e, todo())}
                        >
                          {todo().title}
                        </span>
                      }
                    >
                      <input
                        class="todo-edit"
                        aria-label={`Edit ${todo().title}`}
                        value={editText()}
                        autocomplete="off"
                        onInput={(e) => setEditText(e.currentTarget.value)}
                        onKeyDown={(e) => onEditKeyDown(e, todo())}
                        onBlur={() => finishEdit(todo(), true, false)}
                      />
                    </Show>
                    <button
                      type="button"
                      class="todo-destroy"
                      aria-label={`Delete ${todo().title}`}
                      onClick={() => destroy(todo())}
                    >
                      ×
                    </button>
                  </li>
                );
              }}
            </For>
          </ul>
        </section>

        <footer class="app-footer">
          <span class="todo-count">
            <strong>{remaining()}</strong> {remaining() === 1 ? 'item' : 'items'} left
          </span>
          <nav class="todo-filters" aria-label="Filter todos">
            <For each={FILTERS}>
              {(f) => (
                <button
                  type="button"
                  class="filter"
                  aria-pressed={filter() === f.id}
                  onClick={() => changeFilter(f.id)}
                >
                  {f.label}
                </button>
              )}
            </For>
          </nav>
          <button type="button" class="btn clear-completed" onClick={clearCompleted} disabled={completedCount() === 0}>
            Clear completed
          </button>
        </footer>
      </Show>

      <div class="sr-only" role="status" aria-live="polite">
        {announcement()}
      </div>
    </main>
  );
}
