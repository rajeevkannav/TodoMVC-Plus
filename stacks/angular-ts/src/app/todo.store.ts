import { initialState, todoReducer, type Todo, type TodoAction, type TodoState } from './todos';
import { loadMirror, saveTodos } from './storage';

export type { Todo } from './todos';

export type TodoStoreOptions = {
  initial?: Todo[];
  persist?: (todos: Todo[]) => void;
  broadcast?: (todos: Todo[]) => void;
};

/**
 * Framework-free todo store: runs the pure reducer, persists every local change
 * synchronously (localStorage mirror + IndexedDB) and broadcasts it to other tabs.
 */
export class TodoStore {
  private current: TodoState;
  private readonly persist: (todos: Todo[]) => void;
  broadcast: (todos: Todo[]) => void;
  private readonly listeners = new Set<(state: TodoState) => void>();
  /** True once the user has made a local change (so late IndexedDB loads don't clobber it). */
  changed = false;

  constructor(options: TodoStoreOptions = {}) {
    this.current = initialState(options.initial ?? loadMirror());
    this.persist = options.persist ?? saveTodos;
    this.broadcast = options.broadcast ?? (() => {});
  }

  get state(): TodoState {
    return this.current;
  }

  getTodos(): Todo[] {
    return [...this.current.todos];
  }

  get canUndo(): boolean {
    return this.current.past.length > 0;
  }

  get canRedo(): boolean {
    return this.current.future.length > 0;
  }

  subscribe(listener: (state: TodoState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Apply a local change. Returns false when the action was a no-op. */
  dispatch(action: TodoAction): boolean {
    const next = todoReducer(this.current, action);
    if (next === this.current) return false;
    this.changed = true;
    this.set(next);
    this.persist(next.todos);
    this.broadcast(next.todos);
    return true;
  }

  /** Replace todos from storage or another tab without persisting or touching history. */
  sync(todos: Todo[]): void {
    this.set(todoReducer(this.current, { type: 'sync', todos }));
  }

  add(title: string): boolean {
    return this.dispatch({ type: 'add', title });
  }

  undo(): boolean {
    return this.dispatch({ type: 'undo' });
  }

  redo(): boolean {
    return this.dispatch({ type: 'redo' });
  }

  private set(next: TodoState): void {
    this.current = next;
    for (const listener of this.listeners) listener(next);
  }
}
