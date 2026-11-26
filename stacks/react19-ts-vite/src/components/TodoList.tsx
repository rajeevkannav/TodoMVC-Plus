import React from 'react';
import { Todo, FilterType } from '../types';
import { TodoItem } from './TodoItem';

interface TodoListProps {
  todos: Todo[];
  filter: FilterType;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
  onToggleAll: () => void;
}

export const TodoList: React.FC<TodoListProps> = ({
  todos,
  filter,
  onToggle,
  onDelete,
  onEdit,
  onToggleAll,
}) => {
  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const allCompleted = todos.length > 0 && todos.every((t) => t.completed);

  if (todos.length === 0) {
    return (
      <div className="p-8 text-center text-slate-600 dark:text-slate-400">
        No tasks yet. Add one above to get started!
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="flex items-center px-4 py-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={allCompleted}
            onChange={onToggleAll}
            aria-label="Mark all tasks as completed"
            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer min-w-[24px] min-h-[24px]"
          />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Mark all as completed
          </span>
        </div>
      </div>

      <ul role="list" className="divide-y divide-slate-100 dark:divide-slate-800">
        {filteredTodos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={onToggle}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ))}
      </ul>

      {filteredTodos.length === 0 && (
        <div className="p-6 text-center text-slate-600 dark:text-slate-400">
          No {filter} tasks found.
        </div>
      )}
    </div>
  );
};
