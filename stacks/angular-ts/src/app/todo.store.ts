export interface Todo { id: number; text: string; completed: boolean; }

export class TodoStore {
  private todos: Todo[] = JSON.parse(localStorage.getItem('todos') || '[]');
  private history: Todo[][] = [];

  getTodos() { return [...this.todos]; }
  add(text: string) {
    this.history.push([...this.todos]);
    this.todos.push({ id: Date.now(), text, completed: false });
    this.save();
  }
  undo() {
    if (this.history.length > 0) {
      this.todos = this.history.pop()!;
      this.save();
    }
  }
  private save() { localStorage.setItem('todos', JSON.stringify(this.todos)); }
}