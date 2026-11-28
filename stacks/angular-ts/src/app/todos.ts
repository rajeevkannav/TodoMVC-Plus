export type Todo = { id: string; title: string; completed: boolean };
export type Filter = 'all' | 'active' | 'completed';

export type TodoState = {
  todos: Todo[];
  past: Todo[][];
  future: Todo[][];
};

export type TodoAction =
  | { type: 'add'; title: string; id?: string }
  | { type: 'toggle'; id: string }
  | { type: 'toggleAll'; completed: boolean }
  | { type: 'edit'; id: string; title: string }
  | { type: 'delete'; id: string }
  | { type: 'clearCompleted' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'import'; todos: Todo[] }
  | { type: 'sync'; todos: Todo[] };

export const HISTORY_LIMIT = 100;
const MAX_TITLE_LENGTH = 1000;
const MAX_TODOS = 5000;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function initialState(todos: Todo[] = []): TodoState {
  return { todos, past: [], future: [] };
}

function commit(state: TodoState, next: Todo[]): TodoState {
  if (next === state.todos) return state;
  return {
    todos: next,
    past: [...state.past, state.todos].slice(-HISTORY_LIMIT),
    future: [],
  };
}

export function todoReducer(state: TodoState, action: TodoAction): TodoState {
  switch (action.type) {
    case 'add': {
      const title = action.title.trim();
      if (!title) return state;
      return commit(state, [...state.todos, { id: action.id ?? createId(), title, completed: false }]);
    }
    case 'toggle': {
      if (!state.todos.some((t) => t.id === action.id)) return state;
      return commit(
        state,
        state.todos.map((t) => (t.id === action.id ? { ...t, completed: !t.completed } : t)),
      );
    }
    case 'toggleAll': {
      if (state.todos.every((t) => t.completed === action.completed)) return state;
      return commit(
        state,
        state.todos.map((t) => (t.completed === action.completed ? t : { ...t, completed: action.completed })),
      );
    }
    case 'edit': {
      const existing = state.todos.find((t) => t.id === action.id);
      if (!existing) return state;
      const title = action.title.trim();
      if (!title) return commit(state, state.todos.filter((t) => t.id !== action.id));
      if (title === existing.title) return state;
      return commit(
        state,
        state.todos.map((t) => (t.id === action.id ? { ...t, title } : t)),
      );
    }
    case 'delete': {
      if (!state.todos.some((t) => t.id === action.id)) return state;
      return commit(state, state.todos.filter((t) => t.id !== action.id));
    }
    case 'clearCompleted': {
      if (!state.todos.some((t) => t.completed)) return state;
      return commit(state, state.todos.filter((t) => !t.completed));
    }
    case 'undo': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        todos: previous,
        past: state.past.slice(0, -1),
        future: [state.todos, ...state.future],
      };
    }
    case 'redo': {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return {
        todos: next,
        past: [...state.past, state.todos].slice(-HISTORY_LIMIT),
        future: rest,
      };
    }
    case 'import':
      return commit(state, action.todos);
    case 'sync':
      // Remote state from another tab or storage: replace without touching history.
      return { ...state, todos: action.todos };
    default:
      return state;
  }
}

export function filterTodos(todos: Todo[], filter: Filter): Todo[] {
  if (filter === 'active') return todos.filter((t) => !t.completed);
  if (filter === 'completed') return todos.filter((t) => t.completed);
  return todos;
}

export function activeCount(todos: Todo[]): number {
  return todos.reduce((n, t) => (t.completed ? n : n + 1), 0);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Validate an untrusted list of todos. Builds brand-new objects with only the
 * known fields so no foreign keys (including __proto__ / constructor /
 * prototype) can leak through. Accepts the legacy `{ id: number, text }` shape.
 * Returns null when the shape is invalid.
 */
export function sanitizeTodos(value: unknown): Todo[] | null {
  if (!Array.isArray(value) || value.length > MAX_TODOS) return null;
  const seen = new Set<string>();
  const result: Todo[] = [];
  for (const item of value) {
    if (!isPlainObject(item)) return null;
    const rawTitle = typeof item['title'] === 'string' ? item['title'] : item['text'];
    if (typeof rawTitle !== 'string') return null;
    const title = rawTitle.trim();
    if (!title || title.length > MAX_TITLE_LENGTH) return null;
    const completed = item['completed'] === undefined ? false : item['completed'];
    if (typeof completed !== 'boolean') return null;
    const rawId = typeof item['id'] === 'number' && Number.isFinite(item['id']) ? String(item['id']) : item['id'];
    let id = typeof rawId === 'string' && rawId.trim() && rawId.length <= 200 ? rawId : createId();
    if (FORBIDDEN_KEYS.has(id) || seen.has(id)) id = createId();
    seen.add(id);
    result.push({ id, title, completed });
  }
  return result;
}

/** Parse JSON while dropping prototype-polluting keys at every depth. */
export function safeJsonParse(text: string): unknown {
  return JSON.parse(text, (key, value) => (FORBIDDEN_KEYS.has(key) ? undefined : value));
}

export type ImportResult = { ok: true; todos: Todo[] } | { ok: false; error: string };

/** Accepts either a bare array of todos or an export envelope `{ todos: [...] }`. */
export function parseImport(text: string): ImportResult {
  let data: unknown;
  try {
    data = safeJsonParse(text);
  } catch {
    return { ok: false, error: 'Import failed: file is not valid JSON.' };
  }
  const list = isPlainObject(data) ? data['todos'] : data;
  const todos = sanitizeTodos(list);
  if (!todos) return { ok: false, error: 'Import failed: file does not contain a valid todo list.' };
  return { ok: true, todos };
}

export function serializeExport(todos: Todo[]): string {
  return JSON.stringify(
    {
      app: 'todomvc-plus',
      version: 1,
      exportedAt: new Date().toISOString(),
      todos: todos.map(({ id, title, completed }) => ({ id, title, completed })),
    },
    null,
    2,
  );
}
