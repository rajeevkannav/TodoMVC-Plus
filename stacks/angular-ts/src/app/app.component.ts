import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TodoStore } from './todo.store';
import { activeCount, filterTodos, parseImport, serializeExport, type Filter, type Todo } from './todos';
import {
  applyTheme,
  loadFromIndexedDb,
  loadTheme,
  openSyncChannel,
  saveTheme,
  saveTodos,
  type Theme,
} from './storage';

export const STACK_ID = 'angular-ts';

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

type ViewTransitionDocument = Document & { startViewTransition?: (cb: () => void) => unknown };

@Component({
  selector: 'app-root',
  standalone: true,
  host: { '(window:keydown)': 'onGlobalKeyDown($event)' },
  template: `
    <main class="todoapp" aria-labelledby="app-title">
      <header class="app-header">
        <h1 id="app-title" class="app-title">TodoMVC+</h1>
        <p class="app-stack">{{ stackId }}</p>
        <div class="app-toolbar" role="toolbar" aria-label="App actions">
          <button type="button" class="btn" [disabled]="!canUndo()" aria-keyshortcuts="Control+Z" (click)="undo()">Undo</button>
          <button type="button" class="btn" [disabled]="!canRedo()" aria-keyshortcuts="Control+Shift+Z" (click)="redo()">Redo</button>
          <button type="button" class="btn" (click)="exportTodos()">Export</button>
          <button type="button" class="btn" (click)="fileInput.click()">Import</button>
          <input
            #fileInput
            type="file"
            accept="application/json"
            hidden
            aria-label="Import todos from JSON file"
            (change)="onImportFile($event)"
          />
          <button type="button" class="btn" [attr.aria-pressed]="theme() === 'dark' ? 'true' : 'false'" (click)="toggleTheme()">
            Dark theme
          </button>
        </div>
      </header>

      <form class="new-todo-form" (submit)="onSubmit($event)">
        <label for="new-todo" class="sr-only">New todo</label>
        <input
          #newTodoInput
          id="new-todo"
          class="new-todo"
          placeholder="What needs to be done?"
          autocomplete="off"
          [value]="newTitle()"
          (input)="newTitle.set(inputValue($event))"
        />
        <button type="submit" class="btn btn-primary">Add</button>
      </form>

      @if (todos().length > 0) {
        <section class="todo-main" aria-label="Todos">
          <input id="toggle-all" class="toggle-all" type="checkbox" [checked]="allCompleted()" (change)="toggleAll()" />
          <label for="toggle-all">Mark all as complete</label>
          <ul #listEl class="todo-list">
            @for (todo of visible(); track todo.id) {
              <li
                class="todo-item"
                [attr.data-id]="todo.id"
                [class.completed]="todo.completed"
                [class.editing]="editingId() === todo.id"
              >
                <input
                  type="checkbox"
                  class="todo-toggle"
                  [checked]="todo.completed"
                  [attr.aria-label]="'Toggle ' + todo.title"
                  (change)="toggle(todo)"
                />
                @if (editingId() === todo.id) {
                  <input
                    class="todo-edit"
                    autocomplete="off"
                    [attr.aria-label]="'Edit ' + todo.title"
                    [value]="editText()"
                    (input)="editText.set(inputValue($event))"
                    (keydown)="onEditKeyDown($event, todo)"
                    (blur)="finishEdit(todo, true, false)"
                  />
                } @else {
                  <span
                    class="todo-title"
                    tabindex="0"
                    title="Double-click or press Enter to edit"
                    (dblclick)="startEdit(todo)"
                    (keydown)="onTitleKeyDown($event, todo)"
                    >{{ todo.title }}</span
                  >
                }
                <button type="button" class="todo-destroy" [attr.aria-label]="'Delete ' + todo.title" (click)="destroy(todo)">
                  ×
                </button>
              </li>
            }
          </ul>
        </section>

        <footer class="app-footer">
          <span class="todo-count"><strong>{{ remaining() }}</strong> {{ remaining() === 1 ? 'item' : 'items' }} left</span>
          <nav class="todo-filters" aria-label="Filter todos">
            @for (f of filters; track f.id) {
              <button
                type="button"
                class="filter"
                [attr.aria-pressed]="filter() === f.id ? 'true' : 'false'"
                (click)="changeFilter(f.id)"
              >
                {{ f.label }}
              </button>
            }
          </nav>
          <button type="button" class="btn clear-completed" [disabled]="completedCount() === 0" (click)="clearCompleted()">
            Clear completed
          </button>
        </footer>
      }

      <div class="sr-only" role="status" aria-live="polite">{{ announcement() }}</div>
    </main>
  `,
})
export class AppComponent {
  readonly stackId = STACK_ID;
  readonly filters = FILTERS;

  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly store = new TodoStore();

  private readonly newTodoInput = viewChild.required<ElementRef<HTMLInputElement>>('newTodoInput');

  readonly state = signal(this.store.state);
  readonly filter = signal<Filter>('all');
  readonly newTitle = signal('');
  readonly editingId = signal<string | null>(null);
  readonly editText = signal('');
  readonly announcement = signal('');
  readonly theme = signal<Theme>(loadTheme());

  readonly todos = computed(() => this.state().todos);
  readonly visible = computed(() => filterTodos(this.todos(), this.filter()));
  readonly remaining = computed(() => activeCount(this.todos()));
  readonly completedCount = computed(() => this.todos().length - this.remaining());
  readonly allCompleted = computed(() => this.todos().length > 0 && this.remaining() === 0);
  readonly canUndo = computed(() => this.state().past.length > 0);
  readonly canRedo = computed(() => this.state().future.length > 0);

  private editFinished = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    const unsubscribe = this.store.subscribe((next) => this.state.set(next));

    const channel = openSyncChannel((remote) => this.syncFromRemote(remote));
    this.store.broadcast = (todos) => channel.post(todos);

    effect(() => {
      const theme = this.theme();
      applyTheme(theme);
      saveTheme(theme);
    });

    void loadFromIndexedDb().then((stored) => {
      if (this.store.changed) return;
      if (stored === null) {
        // First run with IndexedDB: seed it from the localStorage mirror.
        saveTodos(this.store.state.todos);
        return;
      }
      this.syncFromRemote(stored);
    });

    destroyRef.onDestroy(() => {
      unsubscribe();
      channel.close();
    });
  }

  inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  private announce(message: string): void {
    this.announcement.set(message);
  }

  private syncFromRemote(remote: Todo[]): void {
    this.store.sync(remote);
    const editing = this.editingId();
    if (editing && !remote.some((t) => t.id === editing)) this.editingId.set(null);
  }

  private moveFocus(target: FocusTarget): void {
    afterNextRender(
      () => {
        const fallback = () => this.newTodoInput().nativeElement.focus();
        if (target.kind === 'input') return fallback();
        const selector = { title: '.todo-title', destroy: '.todo-destroy', edit: '.todo-edit' }[target.kind];
        const items = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('li.todo-item'));
        const li = items.find((item) => item.dataset['id'] === target.id);
        const el = li?.querySelector<HTMLElement>(selector);
        if (el) el.focus();
        else fallback();
      },
      { injector: this.injector },
    );
  }

  /** After removing `id`, focus the next visible item, else the previous one, else the new-todo input. */
  private focusAfterRemoval(id: string): FocusTarget {
    const list = this.visible();
    const index = list.findIndex((t) => t.id === id);
    const neighbour = list[index + 1] ?? list[index - 1];
    return neighbour ? { kind: 'destroy', id: neighbour.id } : { kind: 'input' };
  }

  private static isTextEntry(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (target instanceof HTMLTextAreaElement || target.isContentEditable) return true;
    if (target instanceof HTMLInputElement) {
      return !['checkbox', 'radio', 'button', 'submit', 'reset', 'file'].includes(target.type);
    }
    return false;
  }

  private static prefersReducedMotion(): boolean {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  undo(): void {
    if (!this.canUndo()) return;
    this.editingId.set(null);
    this.store.undo();
    this.announce('Undid last change');
  }

  redo(): void {
    if (!this.canRedo()) return;
    this.editingId.set(null);
    this.store.redo();
    this.announce('Redid last change');
  }

  onGlobalKeyDown(event: KeyboardEvent): void {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    if (AppComponent.isTextEntry(event.target)) return; // keep native text undo inside inputs
    const key = event.key.toLowerCase();
    if (key === 'z' && !event.shiftKey) {
      event.preventDefault();
      this.undo();
    } else if ((key === 'z' && event.shiftKey) || key === 'y') {
      event.preventDefault();
      this.redo();
    }
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    const title = this.newTitle().trim();
    this.newTitle.set('');
    // Keep the DOM value in sync even when the signal value is unchanged.
    this.newTodoInput().nativeElement.value = '';
    if (!title) return;
    this.store.add(title);
    this.announce(`Added "${title}"`);
  }

  toggle(todo: Todo): void {
    this.store.dispatch({ type: 'toggle', id: todo.id });
    this.announce(`Marked "${todo.title}" as ${todo.completed ? 'active' : 'completed'}`);
  }

  toggleAll(): void {
    const wasAllCompleted = this.allCompleted();
    this.store.dispatch({ type: 'toggleAll', completed: !wasAllCompleted });
    this.announce(wasAllCompleted ? 'Marked all todos as active' : 'Marked all todos as completed');
  }

  destroy(todo: Todo): void {
    const target = this.focusAfterRemoval(todo.id);
    this.store.dispatch({ type: 'delete', id: todo.id });
    this.announce(`Deleted "${todo.title}"`);
    this.moveFocus(target);
  }

  clearCompleted(): void {
    const count = this.completedCount();
    this.store.dispatch({ type: 'clearCompleted' });
    this.announce(`Cleared ${count} completed ${count === 1 ? 'todo' : 'todos'}`);
    this.moveFocus({ kind: 'input' });
  }

  startEdit(todo: Todo): void {
    this.editFinished = false;
    this.editText.set(todo.title);
    this.editingId.set(todo.id);
    this.moveFocus({ kind: 'edit', id: todo.id });
  }

  finishEdit(todo: Todo, save: boolean, restoreFocus: boolean): void {
    if (this.editFinished || this.editingId() !== todo.id) return;
    this.editFinished = true;
    this.editingId.set(null);
    if (!save) {
      if (restoreFocus) this.moveFocus({ kind: 'title', id: todo.id });
      return;
    }
    const title = this.editText().trim();
    if (!title) {
      const target = this.focusAfterRemoval(todo.id);
      this.store.dispatch({ type: 'edit', id: todo.id, title });
      this.announce(`Deleted "${todo.title}"`);
      if (restoreFocus) this.moveFocus(target);
      return;
    }
    if (title !== todo.title) {
      this.store.dispatch({ type: 'edit', id: todo.id, title });
      this.announce(`Renamed "${todo.title}" to "${title}"`);
    }
    if (restoreFocus) this.moveFocus({ kind: 'title', id: todo.id });
  }

  onEditKeyDown(event: KeyboardEvent, todo: Todo): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.finishEdit(todo, true, true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.finishEdit(todo, false, true);
    }
  }

  onTitleKeyDown(event: KeyboardEvent, todo: Todo): void {
    if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault();
      this.startEdit(todo);
    }
  }

  changeFilter(next: Filter): void {
    if (next === this.filter()) return;
    const doc = document as ViewTransitionDocument;
    if (typeof doc.startViewTransition === 'function' && !AppComponent.prefersReducedMotion()) {
      doc.startViewTransition(() => this.filter.set(next));
    } else {
      this.filter.set(next);
    }
  }

  exportTodos(): void {
    const list = this.todos();
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
    this.announce(`Exported ${list.length} ${list.length === 1 ? 'todo' : 'todos'}`);
  }

  async onImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 5_000_000) {
      this.announce('Import failed: file is too large.');
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      this.announce('Import failed: the file could not be read.');
      return;
    }
    const result = parseImport(text);
    if (!result.ok) {
      this.announce(result.error);
      return;
    }
    this.editingId.set(null);
    this.store.dispatch({ type: 'import', todos: result.todos });
    this.announce(`Imported ${result.todos.length} ${result.todos.length === 1 ? 'todo' : 'todos'}`);
  }

  toggleTheme(): void {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }
}
