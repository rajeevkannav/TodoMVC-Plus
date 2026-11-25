export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string; // YYYY-MM-DD
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  subtasks: { id: string; text: string; completed: boolean }[];
  createdAt: number;
}

export type FilterType = 'all' | 'active' | 'completed';
export type SortType = 'created' | 'priority' | 'dueDate' | 'alphabetical';
export type ThemeMode = 'system' | 'light' | 'dark' | 'high-contrast';
