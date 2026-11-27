<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface Todo { id: string; text: string; completed: boolean; }
const todos = ref<Todo[]>([]);
const history = ref<Todo[][]>([]);
const filter = ref<'all' | 'active' | 'completed'>('all');
const newTodo = ref('');

const save = () => localStorage.setItem('todos', JSON.stringify(todos.value));
const pushHistory = () => history.value.push(JSON.parse(JSON.stringify(todos.value)));

const addTodo = () => {
  if (!newTodo.value.trim()) return;
  pushHistory();
  todos.value.push({ id: crypto.randomUUID(), text: newTodo.value.trim(), completed: false });
  newTodo.value = '';
  save();
};

const undo = () => {
  if (history.value.length > 0) {
    todos.value = history.value.pop()!;
    save();
  }
};

const filteredTodos = computed(() => {
  if (filter.value === 'active') return todos.value.filter(t => !t.completed);
  if (filter.value === 'completed') return todos.value.filter(t => t.completed);
  return todos.value;
});

onMounted(() => {
  const saved = localStorage.getItem('todos');
  if (saved) todos.value = JSON.parse(saved);
});
</script>

<template>
  <main>
    <header><h1>TodoMVC+</h1></header>
    <form @submit.prevent="addTodo">
      <label for="new-todo" class="sr-only">New Todo</label>
      <input id="new-todo" v-model="newTodo" placeholder="What needs to be done?" />
      <button type="button" @click="undo">Undo</button>
    </form>
    <nav>
      <button @click="filter = 'all'">All</button>
      <button @click="filter = 'active'">Active</button>
      <button @click="filter = 'completed'">Completed</button>
    </nav>
    <ul>
      <li v-for="todo in filteredTodos" :key="todo.id">
        <label>
          <input type="checkbox" v-model="todo.completed" @change="save" />
          {{ todo.text }}
        </label>
      </li>
    </ul>
  </main>
</template>