<script lang="ts">
  let todos = $state<{id: string, text: string, completed: boolean}[]>(JSON.parse(localStorage.getItem('todos') || '[]'));
  let filter = $state<'all' | 'active' | 'completed'>('all');
  let history = $state<typeof todos[]>([]);

  $effect(() => { localStorage.setItem('todos', JSON.stringify(todos)); });

  function saveState() { history = [...history, [...todos]]; }
  function undo() { if (history.length > 0) { todos = history.pop()!; } }

  function addTodo(e: SubmitEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.elements.namedItem('todo') as HTMLInputElement;
    if (!input.value.trim()) return;
    saveState();
    todos = [...todos, { id: crypto.randomUUID(), text: input.value.trim(), completed: false }];
    input.value = '';
  }
</script>

<main>
  <h1>todos</h1>
  <button onclick={undo}>Undo</button>
  <form onsubmit={addTodo}>
    <input name="todo" placeholder="What needs to be done?" />
  </form>
  <nav>
    <button onclick={() => filter = 'all'}>All</button>
    <button onclick={() => filter = 'active'}>Active</button>
    <button onclick={() => filter = 'completed'}>Completed</button>
  </nav>
  <ul>
    {#each todos.filter(t => filter === 'all' || (filter === 'active' ? !t.completed : t.completed)) as todo (todo.id)}
      <li>
        <input type="checkbox" checked={todo.completed} onchange={() => { saveState(); todo.completed = !todo.completed; }} />
        {todo.text}
      </li>
    {/each}
  </ul>
</main>