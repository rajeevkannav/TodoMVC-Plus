import React from 'react';
import { FilterType } from '../types';

interface TodoFooterProps {
  remainingCount: number;
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  onClearCompleted: () => void;
  hasCompleted: boolean;
}

export const TodoFooter: React.FC<TodoFooterProps> = ({
  remainingCount,
  filter,
  onFilterChange,
  onClearCompleted,
  hasCompleted,
}) => {
  return (
    <div className="todo-toolbar @container flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 text-sm">
      <span className="text-slate-600 dark:text-slate-300 font-medium">
        {remainingCount} {remainingCount === 1 ? 'item' : 'items'} left
      </span>

      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
        {(['all', 'active', 'completed'] as FilterType[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onFilterChange(f)}
            className={`px-3 py-1.5 rounded-md capitalize transition-colors min-h-[32px] focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              filter === f
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-medium'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {hasCompleted && (
        <button
          type="button"
          onClick={onClearCompleted}
          className="text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-colors font-medium min-h-[32px] px-2 py-1 rounded focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          Clear completed
        </button>
      )}
    </div>
  );
};
