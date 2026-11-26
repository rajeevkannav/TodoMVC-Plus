import React from 'react';
import { Filter } from '../types';
import { clsx } from 'clsx';

interface Props {
  count: number;
  activeFilter: Filter;
  onFilterChange: (filter: Filter) => void;
  onClearCompleted: () => void;
  hasCompleted: boolean;
}

export function Footer({ count, activeFilter, onFilterChange, onClearCompleted, hasCompleted }: Props) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-4 p-4 text-sm border-t border-[var(--border)]">
      <span className="font-medium">{count} {count === 1 ? 'item' : 'items'} left</span>
      
      <nav className="flex gap-1" aria-label="Filter todos">
        {(['all', 'active', 'completed'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={clsx(
              "px-3 py-1 rounded-md capitalize transition-colors",
              activeFilter === f 
                ? "bg-[var(--primary)] text-white" 
                : "hover:bg-black/5 dark:hover:bg-white/5"
            )}
            aria-current={activeFilter === f ? 'page' : undefined}
          >
            {f}
          </button>
        ))}
      </nav>

      {hasCompleted && (
        <button
          onClick={onClearCompleted}
          className="text-red-500 hover:underline"
        >
          Clear completed
        </button>
      )}
    </footer>
  );
}