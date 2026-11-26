import React from 'react';
import { Filter, cn } from '../lib/utils';

interface FooterProps {
  count: number;
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  onClearCompleted: () => void;
  hasCompleted: boolean;
}

export function Footer({ count, filter, onFilterChange, onClearCompleted, hasCompleted }: FooterProps) {
  const filters: Filter[] = ['all', 'active', 'completed'];

  return (
    <footer className="p-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
        <strong>{count}</strong> {count === 1 ? 'item' : 'items'} left
      </span>

      <nav className="flex items-center gap-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={cn(
              "px-3 py-1.5 text-sm font-semibold rounded-lg capitalize transition-all focus-ring",
              filter === f 
                ? "bg-brand-primary text-white shadow-md" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            )}
          >
            {f}
          </button>
        ))}
      </nav>

      <button
        onClick={onClearCompleted}
        className={cn(
          "text-sm font-semibold text-brand-accent hover:underline transition-opacity focus-ring",
          !hasCompleted && "opacity-0 pointer-events-none"
        )}
      >
        Clear completed
      </button>
    </footer>
  );
}