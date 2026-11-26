export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export type Filter = 'all' | 'active' | 'completed';

export interface AppState {
  todos: Todo[];
  filter: Filter;
}

export interface HistoryState {
  past: Todo[][];
  present: Todo[];
  future: Todo[][];
}