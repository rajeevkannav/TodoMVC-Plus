import { z } from 'zod';

export const TodoSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1).max(500),
  completed: z.boolean(),
  createdAt: z.number(),
});

export type Todo = z.infer<typeof TodoSchema>;

export type FilterType = 'all' | 'active' | 'completed';

export interface TodoState {
  todos: Todo[];
  filter: FilterType;
}

export type Action = 
  | { type: 'ADD_TODO'; text: string }
  | { type: 'TOGGLE_TODO'; id: string }
  | { type: 'DELETE_TODO'; id: string }
  | { type: 'EDIT_TODO'; id: string; text: string }
  | { type: 'TOGGLE_ALL'; completed: boolean }
  | { type: 'CLEAR_COMPLETED' }
  | { type: 'SET_FILTER'; filter: FilterType }
  | { type: 'SET_TODOS'; todos: Todo[] };