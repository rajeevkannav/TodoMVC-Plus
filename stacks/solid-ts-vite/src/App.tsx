import { createSignal, For, createEffect } from 'solid-js';

interface Todo { id: number; text: string; completed: boolean; }

export default function App() {
  const [todos, setTodos] = createSignal<Todo[]>(JSON.parse(localStorage.getItem('todos') || '[]'));
  const [input, setInput] = createSignal('');
  const [filter, setFilter] = createSignal<'All' | 'Active' | 'Completed'>('All');
  const [history, setHistory] = createSignal<Todo[][]>([[]]);

  createEffect(() => localStorage.setItem('todos', JSON.stringify(todos())));

  const addTodo = (e: Event) => {
    e.preventDefault();
    if (!input().trim()) return;
    const newTodos = [...todos(), { id: Date.now(), text: input().trim(), completed: false }];
    setHistory([...history(), todos()]);
    setTodos(newTodos);
    setInput('');
  };

  const undo = () => {
    if (history().length > 1) {
      const prev = history().slice(0, -1);
      setTodos(prev[prev.length - 1]);
      setHistory(prev);
    }
  };

  const filtered = () => {
    if (filter() === 'Active') return todos().filter(t => !t.completed);
    if (filter() === 'Completed') return todos().filter(t => t.completed);
    return todos();
  };

  return (
    <main>
      <h1>Todos</h1>
      <button onClick={undo}>Undo</button>
      <form onSubmit={addTodo}>
        <label for="todo-input" class="sr-only">New Todo</label>
        <input id="todo-input" value={input()} onInput={(e) => setInput(e.currentTarget.value)} />
        <button type="submit">Add</button>
      </form>
      <div>
        <button onClick={() => setFilter('All')}>All</button>
        <button onClick={() => setFilter('Active')}>Active</button>
        <button onClick={() => setFilter('Completed')}>Completed</button>
      </div>
      <ul>
        <For each={filtered()}>
          {(todo) => <li>{todo.text}</li>}
        </For>
      </ul>
    </main>
  );
}