import { Component, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Todo { id: number; text: string; completed: boolean; }

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main>
      <h1>TodoMVC+</h1>
      <input [(ngModel)]="newTodo" (keyup.enter)="add()" placeholder="What needs to be done?">
      <ul>
        <li *ngFor="let t of filteredTodos()">
          <input type="checkbox" [checked]="t.completed" (change)="toggle(t.id)">
          {{t.text}}
        </li>
      </ul>
      <button (click)="filter.set('all')">All</button>
      <button (click)="filter.set('active')">Active</button>
      <button (click)="filter.set('completed')">Completed</button>
    </main>
  `
})
export class AppComponent {
  todos = signal<Todo[]>(JSON.parse(localStorage.getItem('todos') || '[]'));
  newTodo = '';
  filter = signal<'all' | 'active' | 'completed'>('all');

  constructor() {
    effect(() => localStorage.setItem('todos', JSON.stringify(this.todos())));
  }

  add() {
    if (!this.newTodo.trim()) return;
    this.todos.update(t => [...t, { id: Date.now(), text: this.newTodo, completed: false }]);
    this.newTodo = '';
  }

  toggle(id: number) {
    this.todos.update(t => t.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  }

  filteredTodos() {
    const f = this.filter();
    return this.todos().filter(t => f === 'all' ? true : f === 'active' ? !t.completed : t.completed);
  }
}