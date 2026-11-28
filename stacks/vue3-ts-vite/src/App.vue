<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
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

const STACK_ID = 'vue3-ts-vite';

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

type ViewTransitionDocument = Document & { startViewTransition?: (cb: () => Promise<void> | void) => unknown };

const state = shallowRef<TodoState>(initialState(loadMirror()));
const filter = ref<Filter>('all');
const newTitle = ref('');
const editingId = ref<string | null>(null);
const editText = ref('');
const announcement = ref('');
const theme = ref<Theme>(loadTheme());

const newTodoInput = ref<HTMLInputElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const listEl = ref<HTMLUListElement | null>(null);

let editFinished = false;
let userChanged = false;
let channel: SyncChannel | null = null;

const todos = computed(() => state.value.todos);
const visible = computed(() => filterTodos(todos.value, filter.value));
const remaining = computed(() => activeCount(todos.value));
const completedCount = computed(() => todos.value.length - remaining.value);
const allCompleted = computed(() => todos.value.length > 0 && remaining.value === 0);
const canUndo = computed(() => state.value.past.length > 0);
const canRedo = computed(() => state.value.future.length > 0);

function announce(message: string) {
  announcement.value = message;
}

/** Apply a local change: updates state, then persists and broadcasts synchronously. */
function act(action: TodoAction) {
  const next = todoReducer(state.value, action);
  if (next === state.value) return;
  userChanged = true;
  state.value = next;
  saveTodos(next.todos);
  channel?.post(next.todos);
}

/** Replace todos from storage or another tab without persisting or touching history. */
function syncFromRemote(remote: Todo[]) {
  state.value = todoReducer(state.value, { type: 'sync', todos: remote });
  if (editingId.value && !remote.some((t) => t.id === editingId.value)) editingId.value = null;
}

async function moveFocus(target: FocusTarget) {
  await nextTick();
  if (target.kind === 'input') {
    newTodoInput.value?.focus();
    return;
  }
  const selector = { title: '.todo-title', destroy: '.todo-destroy', edit: '.todo-edit' }[target.kind];
  const items = Array.from(listEl.value?.querySelectorAll<HTMLElement>('li.todo-item') ?? []);
  const li = items.find((item) => item.dataset.id === target.id);
  const el = li?.querySelector<HTMLElement>(selector);
  if (el) el.focus();
  else newTodoInput.value?.focus();
}

/** After removing `id`, focus the next visible item, else the previous one, else the new-todo input. */
function focusAfterRemoval(id: string): FocusTarget {
  const list = visible.value;
  const index = list.findIndex((t) => t.id === id);
  const neighbour = list[index + 1] ?? list[index - 1];
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
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function undo() {
  if (!canUndo.value) return;
  editingId.value = null;
  act({ type: 'undo' });
  announce('Undid last change');
}

function redo() {
  if (!canRedo.value) return;
  editingId.value = null;
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

function onSubmit() {
  const title = newTitle.value.trim();
  newTitle.value = '';
  if (!title) return;
  act({ type: 'add', title });
  announce(`Added "${title}"`);
}

function toggle(todo: Todo) {
  act({ type: 'toggle', id: todo.id });
  announce(`Marked "${todo.title}" as ${todo.completed ? 'active' : 'completed'}`);
}

function toggleAll() {
  const wasAllCompleted = allCompleted.value;
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
  const count = completedCount.value;
  act({ type: 'clearCompleted' });
  announce(`Cleared ${count} completed ${count === 1 ? 'todo' : 'todos'}`);
  void moveFocus({ kind: 'input' });
}

function startEdit(todo: Todo) {
  editFinished = false;
  editingId.value = todo.id;
  editText.value = todo.title;
  void moveFocus({ kind: 'edit', id: todo.id });
}

function finishEdit(todo: Todo, save: boolean, restoreFocus: boolean) {
  if (editFinished || editingId.value !== todo.id) return;
  editFinished = true;
  editingId.value = null;
  if (!save) {
    if (restoreFocus) void moveFocus({ kind: 'title', id: todo.id });
    return;
  }
  const title = editText.value.trim();
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
  if (next === filter.value) return;
  const doc = document as ViewTransitionDocument;
  if (typeof doc.startViewTransition === 'function' && !prefersReducedMotion()) {
    doc.startViewTransition(async () => {
      filter.value = next;
      await nextTick();
    });
  } else {
    filter.value = next;
  }
}

function exportTodos() {
  const list = todos.value;
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
  editingId.value = null;
  act({ type: 'import', todos: result.todos });
  announce(`Imported ${result.todos.length} ${result.todos.length === 1 ? 'todo' : 'todos'}`);
}

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
}

watch(
  theme,
  (value) => {
    applyTheme(value);
    saveTheme(value);
  },
  { immediate: true },
);

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeyDown);
  channel = openSyncChannel(syncFromRemote);
  void loadFromIndexedDb().then((stored) => {
    if (userChanged) return;
    if (stored === null) {
      // First run with IndexedDB: seed it from the localStorage mirror.
      saveTodos(todos.value);
      return;
    }
    syncFromRemote(stored);
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeyDown);
  channel?.close();
  channel = null;
});
</script>

<template>
  <main class="todoapp" aria-labelledby="app-title">
    <header class="app-header">
      <h1 id="app-title" class="app-title">TodoMVC+</h1>
      <p class="app-stack">{{ STACK_ID }}</p>
      <div class="app-toolbar" role="toolbar" aria-label="App actions">
        <button type="button" class="btn" :disabled="!canUndo" aria-keyshortcuts="Control+Z" @click="undo">
          Undo
        </button>
        <button type="button" class="btn" :disabled="!canRedo" aria-keyshortcuts="Control+Shift+Z" @click="redo">
          Redo
        </button>
        <button type="button" class="btn" @click="exportTodos">Export</button>
        <button type="button" class="btn" @click="fileInput?.click()">Import</button>
        <input
          ref="fileInput"
          type="file"
          accept="application/json"
          hidden
          aria-label="Import todos from JSON file"
          @change="onImportFile"
        />
        <button type="button" class="btn" :aria-pressed="theme === 'dark' ? 'true' : 'false'" @click="toggleTheme">
          Dark theme
        </button>
      </div>
    </header>

    <form class="new-todo-form" @submit.prevent="onSubmit">
      <label for="new-todo" class="sr-only">New todo</label>
      <input
        id="new-todo"
        ref="newTodoInput"
        v-model="newTitle"
        class="new-todo"
        placeholder="What needs to be done?"
        autocomplete="off"
      />
      <button type="submit" class="btn btn-primary">Add</button>
    </form>

    <section v-if="todos.length > 0" class="todo-main" aria-label="Todos">
      <input id="toggle-all" class="toggle-all" type="checkbox" :checked="allCompleted" @change="toggleAll" />
      <label for="toggle-all">Mark all as complete</label>
      <ul ref="listEl" class="todo-list">
        <li
          v-for="todo in visible"
          :key="todo.id"
          :data-id="todo.id"
          :class="['todo-item', { completed: todo.completed, editing: editingId === todo.id }]"
        >
          <input
            type="checkbox"
            class="todo-toggle"
            :checked="todo.completed"
            :aria-label="`Toggle ${todo.title}`"
            @change="toggle(todo)"
          />
          <input
            v-if="editingId === todo.id"
            v-model="editText"
            class="todo-edit"
            autocomplete="off"
            :aria-label="`Edit ${todo.title}`"
            @keydown="onEditKeyDown($event, todo)"
            @blur="finishEdit(todo, true, false)"
          />
          <span
            v-else
            class="todo-title"
            tabindex="0"
            title="Double-click or press Enter to edit"
            @dblclick="startEdit(todo)"
            @keydown="onTitleKeyDown($event, todo)"
            >{{ todo.title }}</span
          >
          <button type="button" class="todo-destroy" :aria-label="`Delete ${todo.title}`" @click="destroy(todo)">
            ×
          </button>
        </li>
      </ul>
    </section>

    <footer v-if="todos.length > 0" class="app-footer">
      <span class="todo-count"
        ><strong>{{ remaining }}</strong> {{ remaining === 1 ? 'item' : 'items' }} left</span
      >
      <nav class="todo-filters" aria-label="Filter todos">
        <button
          v-for="f in FILTERS"
          :key="f.id"
          type="button"
          class="filter"
          :aria-pressed="filter === f.id ? 'true' : 'false'"
          @click="changeFilter(f.id)"
        >
          {{ f.label }}
        </button>
      </nav>
      <button type="button" class="btn clear-completed" :disabled="completedCount === 0" @click="clearCompleted">
        Clear completed
      </button>
    </footer>

    <div class="sr-only" role="status" aria-live="polite">{{ announcement }}</div>
  </main>
</template>
