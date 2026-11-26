import { z } from 'zod';

export const TodoSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1),
  completed: z.boolean(),
  createdAt: z.number(),
});

export const TodoListSchema = z.array(TodoSchema);

export type Todo = z.infer<typeof TodoSchema>;

export type Filter = 'all' | 'active' | 'completed';