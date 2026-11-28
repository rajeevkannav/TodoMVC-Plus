<script lang="ts">
  import { onMount, tick } from 'svelte';
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
    type TodoState,
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

  const STACK_ID = 'svelte5-ts-vite';

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

  type ViewTransitionDocument = Document & {
    startViewTransition?: (cb: () => Promise<void> | void) => unknown;
  };

  let appState = $state.raw<TodoState>(initialState(loadMirror()));
  let filter = $state<Filter>('all');
  let newTitle = $state('');
  let editingId = $state<string | null>(null);
  let editText = $state('');
  let announcement = $state('');
  let theme = $state<Theme>(loadTheme());

  let newTodoInput: HTMLInputElement | undefined = $state();
  let fileInput: HTMLInputElement | undefined = $state();
  let listEl: HTMLUListElement | undefined = $state();

  let editFinished = false;
  let userChanged = false;
  let channel: SyncChannel | null = null;

  const todos = $derived(appState.todos);
  const visible = $derived(filterTodos(todos, filter));
  const remaining = $derived(activeCount(todos));
  const completedCount = $derived(todos.length - remaining);
  const allCompleted = $derived(todos.length > 0 && remaining === 0);
  const canUndo = $derived(appState.past.length > 0);
  const canRedo = $derived(appState.future.length > 0);

  function announce(message: string) {
    announcement = message;
  }

  /** Apply a local change: updates state, then persists and broadcasts synchronously. */
  function act(action: TodoAction) {
    const next = todoReducer(appState, action);
    if (next === appState) return;
    userChanged = true;
    appState = next;
    saveTodos(next.todos);
    channel?.post(next.todos);
  }

  /** Replace todos from storage or another tab without persisting or touching history. */
  function syncFromRemote(remote: Todo[]) {
    appState = todoReducer(appState, { type: 'sync', todos: remote });
    if (editingId && !remote.some((t) => t.id === editingId)) editingId = null;
  }

  async function moveFocus(target: FocusTarget) {
    await tick();
    if (target.kind === 'input') {
      newTodoInput?.focus();
      return;
    }
    const selector = { title: '.todo-title', destroy: '.todo-destroy', edit: '.todo-edit' }[target.kind];
    const items = Array.from(listEl?.querySelectorAll<HTMLElement>('li.todo-item') ?? []);
    const li = items.find((item) => item.dataset.id === target.id);
    const el = li?.querySelector<HTMLElement>(selector);
    if (el) el.focus();
    else newTodoInput?.focus();
  }

  /** After removing `id`, focus the next visible item, else the previous one, else the new-todo input. */
  function focusAfterRemoval(id: string): FocusTarget {
    const index = visible.findIndex((t) => t.id === id);
    const neighbour = visible[index + 1] ?? visible[index - 1];
    return neighbour ? { kind: 'destroy', id: neighbour.id } : { kind: 'input' };
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
    return (
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function undo() {
    if (!canUndo) return;
    editingId = null;
    act({ type: 'undo' });
    announce('Undid last change');
  }

  function redo() {
    if (!canRedo) return;
    editingId = null;
    act({ type: 'redo' });
    announce('Redid last change');
  }

  function onGlobalKeyDown(event: KeyboardEvent) {
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
  }

  function onSubmit(event: SubmitEvent) {
    event.preventDefault();
    const title = newTitle.trim();
    newTitle = '';
    if (!title) return;
    act({ type: 'add', title });
    announce(`Added "${title}"`);
  }

  function toggle(todo: Todo) {
    act({ type: 'toggle', id: todo.id });
    announce(`Marked "${todo.title}" as ${todo.completed ? 'active' : 'completed'}`);
  }

  function toggleAll() {
    const wasAllCompleted = allCompleted;
    act({ type: 'toggleAll', completed: !wasAllCompleted });
    announce(wasAllCompleted ? 'Marked all todos as active' : 'Marked all todos as completed');
  }

  function destroy(todo: Todo) {
    const target = focusAfterRemoval(todo.id);
    act({ type: 'delete', id: todo.id });
    announce(`Deleted "${todo.title}"`);
    void moveFocus(target);
  }

  function clearCompleted() {
    const count = completedCount;
    act({ type: 'clearCompleted' });
    announce(`Cleared ${count} completed ${count === 1 ? 'todo' : 'todos'}`);
    void moveFocus({ kind: 'input' });
  }

  function startEdit(todo: Todo) {
    editFinished = false;
    editingId = todo.id;
    editText = todo.title;
    void moveFocus({ kind: 'edit', id: todo.id });
  }

  function finishEdit(todo: Todo, save: boolean, restoreFocus: boolean) {
    if (editFinished || editingId !== todo.id) return;
    editFinished = true;
    editingId = null;
    if (!save) {
      if (restoreFocus) void moveFocus({ kind: 'title', id: todo.id });
      return;
    }
    const title = editText.trim();
    if (!title) {
      const target = focusAfterRemoval(todo.id);
      act({ type: 'edit', id: todo.id, title });
      announce(`Deleted "${todo.title}"`);
      if (restoreFocus) void moveFocus(target);
      return;
    }
    if (title !== todo.title) {
      act({ type: 'edit', id: todo.id, title });
      announce(`Renamed "${todo.title}" to "${title}"`);
    }
    if (restoreFocus) void moveFocus({ kind: 'title', id: todo.id });
  }

  function onEditKeyDown(event: KeyboardEvent, todo: Todo) {
    if (event.key === 'Enter') {
      event.preventDefault();
      finishEdit(todo, true, true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      finishEdit(todo, false, true);
    }
  }

  function onTitleKeyDown(event: KeyboardEvent, todo: Todo) {
    if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault();
      startEdit(todo);
    }
  }

  function changeFilter(next: Filter) {
    if (next === filter) return;
    const doc = document as ViewTransitionDocument;
    if (typeof doc.startViewTransition === 'function' && !prefersReducedMotion()) {
      doc.startViewTransition(async () => {
        filter = next;
        await tick();
      });
    } else {
      filter = next;
    }
  }

  function exportTodos() {
    const list = todos;
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
    announce(`Exported ${list.length} ${list.length === 1 ? 'todo' : 'todos'}`);
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

  async function onImportFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
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
    editingId = null;
    act({ type: 'import', todos: result.todos });
    announce(`Imported ${result.todos.length} ${result.todos.length === 1 ? 'todo' : 'todos'}`);
  }

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
  }

  $effect(() => {
    applyTheme(theme);
    saveTheme(theme);
  });

  onMount(() => {
    channel = openSyncChannel(syncFromRemote);
    void loadFromIndexedDb().then((stored) => {
      if (userChanged) return;
      if (stored === null) {
        // First run with IndexedDB: seed it from the localStorage mirror.
        saveTodos(todos);
        return;
      }
      syncFromRemote(stored);
    });
    return () => {
      channel?.close();
      channel = null;
    };
  });
</script>

<svelte:window onkeydown={onGlobalKeyDown} />

<main class="todoapp" aria-labelledby="app-title">
  <header class="app-header">
    <h1 id="app-title" class="app-title">TodoMVC+</h1>
    <p class="app-stack">{STACK_ID}</p>
    <div class="app-toolbar" role="toolbar" aria-label="App actions">
      <button type="button" class="btn" disabled={!canUndo} aria-keyshortcuts="Control+Z" onclick={undo}>
        Undo
      </button>
      <button type="button" class="btn" disabled={!canRedo} aria-keyshortcuts="Control+Shift+Z" onclick={redo}>
        Redo
      </button>
      <button type="button" class="btn" onclick={exportTodos}>Export</button>
      <button type="button" class="btn" onclick={() => fileInput?.click()}>Import</button>
      <input
        bind:this={fileInput}
        type="file"
        accept="application/json"
        hidden
        aria-label="Import todos from JSON file"
        onchange={onImportFile}
      />
      <button
        type="button"
        class="btn"
        aria-pressed={theme === 'dark' ? 'true' : 'false'}
        onclick={toggleTheme}
      >
        Dark theme
      </button>
    </div>
  </header>

  <form class="new-todo-form" onsubmit={onSubmit}>
    <label for="new-todo" class="sr-only">New todo</label>
    <input
      id="new-todo"
      bind:this={newTodoInput}
      bind:value={newTitle}
      class="new-todo"
      placeholder="What needs to be done?"
      autocomplete="off"
    />
    <button type="submit" class="btn btn-primary">Add</button>
  </form>

  {#if todos.length > 0}
    <section class="todo-main" aria-label="Todos">
      <input id="toggle-all" class="toggle-all" type="checkbox" checked={allCompleted} onchange={toggleAll} />
      <label for="toggle-all">Mark all as complete</label>
      <ul bind:this={listEl} class="todo-list">
        {#each visible as todo (todo.id)}
          <li
            data-id={todo.id}
            class="todo-item"
            class:completed={todo.completed}
            class:editing={editingId === todo.id}
          >
            <input
              type="checkbox"
              class="todo-toggle"
              checked={todo.completed}
              aria-label={`Toggle ${todo.title}`}
              onchange={() => toggle(todo)}
            />
            {#if editingId === todo.id}
              <input
                bind:value={editText}
                class="todo-edit"
                autocomplete="off"
                aria-label={`Edit ${todo.title}`}
                onkeydown={(event) => onEditKeyDown(event, todo)}
                onblur={() => finishEdit(todo, true, false)}
              />
            {:else}
              <!-- Contract markup: a focusable title span; Enter/F2 or double-click starts editing. -->
              <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_static_element_interactions -->
              <span
                class="todo-title"
                tabindex="0"
                title="Double-click or press Enter to edit"
                ondblclick={() => startEdit(todo)}
                onkeydown={(event) => onTitleKeyDown(event, todo)}>{todo.title}</span
              >
            {/if}
            <button
              type="button"
              class="todo-destroy"
              aria-label={`Delete ${todo.title}`}
              onclick={() => destroy(todo)}>×</button
            >
          </li>
        {/each}
      </ul>
    </section>

    <footer class="app-footer">
      <span class="todo-count"><strong>{remaining}</strong> {remaining === 1 ? 'item' : 'items'} left</span>
      <nav class="todo-filters" aria-label="Filter todos">
        {#each FILTERS as f (f.id)}
          <button
            type="button"
            class="filter"
            aria-pressed={filter === f.id ? 'true' : 'false'}
            onclick={() => changeFilter(f.id)}
          >
            {f.label}
          </button>
        {/each}
      </nav>
      <button type="button" class="btn clear-completed" disabled={completedCount === 0} onclick={clearCompleted}>
        Clear completed
      </button>
    </footer>
  {/if}

  <div class="sr-only" role="status" aria-live="polite">{announcement}</div>
</main>
